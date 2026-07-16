import { requestUrl } from "obsidian";

// ============================================================================
// 百度网盘客户端（纯 TS，不依赖 Python / Node 内置模块）
// 流程：precreate → 分片 upload（raw body）→ create
// 鉴权：OAuth2.0 授权码模式，redirect_uri=oob（命令行/插件友好）
// ============================================================================

const BAIDU_TOKEN_URL = "https://openapi.baidu.com/oauth/2.0/token";
const BAIDU_AUTH_URL = "https://openapi.baidu.com/oauth/2.0/authorize";
const BAIDU_PRECREATE = "https://pan.baidu.com/rest/2.0/xpan/file?method=precreate";
const BAIDU_CREATE = "https://pan.baidu.com/rest/2.0/xpan/file?method=create";
const BAIDU_UPLOAD = "https://d.pcs.baidu.com/rest/2.0/pcs/file?method=upload";
const SLICE = 4 * 1024 * 1024; // 4MB 分片（百度网盘标准分片大小）

const BAIDU_ERRORS: Record<number, string> = {
  31064: "应用未审核：去百度网盘开放平台把应用提交上线审核，拿到上传权限后重试。",
  31023: "参数错误：检查请求参数格式（block_list 需 JSON 序列化）。",
  31024: "分片上传错误：检查分片大小和顺序。",
  31500: "创建文件失败：uploadid 无效或上传未完成。",
  42000: "访问过于频繁，请稍后重试。",
};

export interface BaiduToken {
  access: string;
  refresh: string;
  expiresAt: number; // 毫秒时间戳
}

// ---------- 生成授权链接 ----------
export function buildBaiduAuthUrl(clientId: string, deviceId: string): string {
  const p = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: "oob",
    scope: "basic netdisk",
    device_id: deviceId,
    display: "popup",
  });
  return BAIDU_AUTH_URL + "?" + p.toString();
}

// ---------- 用 code 换 token ----------
export async function exchangeCodeForToken(
  code: string,
  clientId: string,
  clientSecret: string,
  deviceId: string
): Promise<BaiduToken> {
  const url = new URL(BAIDU_TOKEN_URL);
  url.searchParams.set("grant_type", "authorization_code");
  url.searchParams.set("code", code.trim());
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("client_secret", clientSecret);
  url.searchParams.set("redirect_uri", "oob");
  url.searchParams.set("device_id", deviceId);
  const resp = await requestUrl({ url: url.toString(), method: "GET" });
  if (resp.status >= 400) throw new Error("HTTP " + resp.status);
  const j = JSON.parse(resp.text);
  if (!j.access_token) throw new Error("换取 token 失败：" + JSON.stringify(j));
  const expiresIn = typeof j.expires_in === "number" ? j.expires_in : 2592000;
  return {
    access: j.access_token,
    refresh: j.refresh_token ?? "",
    expiresAt: Date.now() + expiresIn * 1000,
  };
}

// ---------- 刷新 token ----------
export async function refreshBaiduToken(
  tok: BaiduToken,
  clientId: string,
  clientSecret: string
): Promise<BaiduToken> {
  const url = new URL(BAIDU_TOKEN_URL);
  url.searchParams.set("grant_type", "refresh_token");
  url.searchParams.set("refresh_token", tok.refresh);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("client_secret", clientSecret);
  const resp = await requestUrl({ url: url.toString(), method: "GET" });
  const j = JSON.parse(resp.text);
  if (!j.access_token) throw new Error("刷新 token 失败：" + JSON.stringify(j));
  const expiresIn = typeof j.expires_in === "number" ? j.expires_in : 2592000;
  return {
    access: j.access_token,
    refresh: j.refresh_token ?? tok.refresh,
    expiresAt: Date.now() + expiresIn * 1000,
  };
}

// ---------- 百度网盘客户端 ----------
export class BaiduClient {
  token: BaiduToken;

  constructor(
    token: BaiduToken,
    public clientId: string,
    public clientSecret: string,
    public remoteDir: string,
    public deviceId: string,
    public onTokenChange?: (t: BaiduToken) => void
  ) {
    this.token = token;
  }

  private async ensureValid(): Promise<void> {
    if (Date.now() < this.token.expiresAt - 60000) return;
    this.token = await refreshBaiduToken(this.token, this.clientId, this.clientSecret);
    this.onTokenChange?.(this.token);
  }

  /** 确保远程目录存在（百度不自动建多级目录） */
  async ensureRemoteDir(): Promise<void> {
    await this.ensureValid();
    const url = new URL(BAIDU_CREATE);
    url.searchParams.set("access_token", this.token.access);
    url.searchParams.set("path", this.remoteDir);
    url.searchParams.set("isdir", "1");
    url.searchParams.set("rtype", "1");
    url.searchParams.set("mode", "1");
    const resp = await requestUrl({ url: url.toString(), method: "POST" });
    const j = JSON.parse(resp.text);
    const errno = typeof j.errno === "number" ? j.errno : 0;
    if (errno !== 0 && errno !== -8) {
      console.warn("[baidu] 建目录返回（可忽略）", j);
    }
  }

  /** 把字节流上传到百度网盘，返回远程路径。 */
  async uploadBytes(remoteName: string, data: ArrayBuffer): Promise<string> {
    await this.ensureValid();
    const bytes = new Uint8Array(data);
    const remotePath = this.remoteDir.replace(/\/+$/, "") + "/" + remoteName;

    // 1) 分片并计算每片 md5
    const blockMd5: string[] = [];
    const slices: ArrayBuffer[] = [];
    for (let off = 0; off < bytes.length; off += SLICE) {
      const slice = bytes.subarray(off, Math.min(off + SLICE, bytes.length));
      slices.push(slice.slice().buffer as ArrayBuffer);
      blockMd5.push(md5hex(slice));
    }
    if (blockMd5.length === 0) throw new Error("空文件，跳过");

    // 2) precreate
    const pre = new URL(BAIDU_PRECREATE);
    pre.searchParams.set("access_token", this.token.access);
    pre.searchParams.set("path", remotePath);
    pre.searchParams.set("size", String(bytes.length));
    pre.searchParams.set("isdir", "0");
    pre.searchParams.set("autoinit", "1");
    pre.searchParams.set("block_list", JSON.stringify(blockMd5));
    pre.searchParams.set("rtype", "1");
    const preResp = await requestUrl({ url: pre.toString(), method: "POST" });
    const pj = JSON.parse(preResp.text);
    const preno = typeof pj.errno === "number" ? pj.errno : 0;
    if (preno !== 0) {
      throw new Error(`precreate 失败(${preno}) ${BAIDU_ERRORS[preno] ?? JSON.stringify(pj).slice(0, 200)}`);
    }
    const uploadid = pj.uploadid || (pj.data && pj.data.uploadid);
    if (!uploadid) {
      if (pj.return_type === 2) return remotePath; // 秒传命中（文件已存在）
      throw new Error("未返回 uploadid：" + JSON.stringify(pj).slice(0, 200));
    }

    // 3) 逐片上传（raw body 直接作为请求体）
    for (let seq = 0; seq < slices.length; seq++) {
      const up = new URL(BAIDU_UPLOAD);
      up.searchParams.set("access_token", this.token.access);
      up.searchParams.set("type", "tmpfile");
      up.searchParams.set("path", "/");
      up.searchParams.set("uploadid", uploadid);
      up.searchParams.set("partseq", String(seq));
      const upResp = await requestUrl({
        url: up.toString(),
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: slices[seq],
      });
      const uj = JSON.parse(upResp.text);
      const uerrno = typeof uj.errno === "number" ? uj.errno : 0;
      if (uerrno !== 0) {
        throw new Error(`分片 ${seq} 上传失败：${JSON.stringify(uj).slice(0, 200)}`);
      }
    }

    // 4) create：合并分片成文件
    const cr = new URL(BAIDU_CREATE);
    cr.searchParams.set("access_token", this.token.access);
    cr.searchParams.set("path", remotePath);
    cr.searchParams.set("size", String(bytes.length));
    cr.searchParams.set("isdir", "0");
    cr.searchParams.set("uploadid", uploadid);
    cr.searchParams.set("block_list", JSON.stringify(blockMd5));
    cr.searchParams.set("rtype", "1");
    const now = Math.floor(Date.now() / 1000);
    cr.searchParams.set("local_ctime", String(now));
    cr.searchParams.set("local_mtime", String(now));
    const crResp = await requestUrl({ url: cr.toString(), method: "POST" });
    const cj = JSON.parse(crResp.text);
    const cerrno = typeof cj.errno === "number" ? cj.errno : 0;
    if (cerrno !== 0) {
      throw new Error(`create 失败(${cerrno}) ${BAIDU_ERRORS[cerrno] ?? JSON.stringify(cj).slice(0, 200)}`);
    }
    return remotePath;
  }
}

// ============================================================================
// 纯 TS 的 MD5 实现（百度分片上传要求每片 md5）
// 不依赖 Node require，跨平台（含移动端）可用。
// ============================================================================
function md5hex(input: Uint8Array): string {
  function add32(a: number, b: number): number {
    return (a + b) & 0xffffffff;
  }
  function rol(num: number, cnt: number): number {
    return (num << cnt) | (num >>> (32 - cnt));
  }
  function cmn(q: number, a: number, b: number, x: number, s: number, t: number): number {
    a = add32(add32(a, q), add32(x, t));
    return add32(rol(a, s), b);
  }
  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & c) | (~b & d), a, b, x, s, t);
  }
  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & d) | (c & ~d), a, b, x, s, t);
  }
  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(b ^ c ^ d, a, b, x, s, t);
  }
  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(c ^ (b | ~d), a, b, x, s, t);
  }

  const state = [1732584193, -271733879, -1732584194, 271733878];
  const msgLen = input.length;
  const totalLen = (((msgLen + 8) >> 6) + 1) * 64;
  const padded = new Uint8Array(totalLen);
  padded.set(input);
  padded[msgLen] = 0x80;
  const view = new DataView(padded.buffer);
  const lenBits = msgLen * 8;
  view.setUint32(totalLen - 8, lenBits >>> 0, true);
  view.setUint32(totalLen - 4, Math.floor(lenBits / 4294967296), true);

  const x = new Int32Array(16);
  for (let i = 0; i < totalLen; i += 64) {
    for (let j = 0; j < 16; j++) x[j] = view.getInt32(i + j * 4, true);
    let a = state[0],
      b = state[1],
      c = state[2],
      d = state[3];

    a = ff(a, b, c, d, x[0], 7, -680876936);
    d = ff(d, a, b, c, x[1], 12, -389564586);
    c = ff(c, d, a, b, x[2], 17, 606105819);
    b = ff(b, c, d, a, x[3], 22, -1044525330);
    a = ff(a, b, c, d, x[4], 7, -176418897);
    d = ff(d, a, b, c, x[5], 12, 1200080426);
    c = ff(c, d, a, b, x[6], 17, -1473231341);
    b = ff(b, c, d, a, x[7], 22, -45705983);
    a = ff(a, b, c, d, x[8], 7, 1770035416);
    d = ff(d, a, b, c, x[9], 12, -1958414417);
    c = ff(c, d, a, b, x[10], 17, -42063);
    b = ff(b, c, d, a, x[11], 22, -1990404162);
    a = ff(a, b, c, d, x[12], 7, 1804603682);
    d = ff(d, a, b, c, x[13], 12, -40341101);
    c = ff(c, d, a, b, x[14], 17, -1502002290);
    b = ff(b, c, d, a, x[15], 22, 1236535329);

    a = gg(a, b, c, d, x[1], 5, -165796510);
    d = gg(d, a, b, c, x[6], 9, -1069501632);
    c = gg(c, d, a, b, x[11], 14, 643717713);
    b = gg(b, c, d, a, x[0], 20, -373897302);
    a = gg(a, b, c, d, x[5], 5, -701558691);
    d = gg(d, a, b, c, x[10], 9, 38016083);
    c = gg(c, d, a, b, x[15], 14, -660478335);
    b = gg(b, c, d, a, x[4], 20, -405537848);
    a = gg(a, b, c, d, x[9], 5, 568446438);
    d = gg(d, a, b, c, x[14], 9, -1019803690);
    c = gg(c, d, a, b, x[3], 14, -187363961);
    b = gg(b, c, d, a, x[8], 20, 1163531501);
    a = gg(a, b, c, d, x[13], 5, -1444681467);
    d = gg(d, a, b, c, x[2], 9, -51403784);
    c = gg(c, d, a, b, x[7], 14, 1735328473);
    b = gg(b, c, d, a, x[12], 20, -1926607734);

    a = hh(a, b, c, d, x[5], 4, -378558);
    d = hh(d, a, b, c, x[8], 11, -2022574463);
    c = hh(c, d, a, b, x[11], 16, 1839030562);
    b = hh(b, c, d, a, x[14], 23, -35309556);
    a = hh(a, b, c, d, x[1], 4, -1530992060);
    d = hh(d, a, b, c, x[4], 11, 1272893353);
    c = hh(c, d, a, b, x[7], 16, -155497632);
    b = hh(b, c, d, a, x[10], 23, -1094730640);
    a = hh(a, b, c, d, x[13], 4, 681279174);
    d = hh(d, a, b, c, x[0], 11, -358537222);
    c = hh(c, d, a, b, x[3], 16, -722521979);
    b = hh(b, c, d, a, x[6], 23, 76029189);
    a = hh(a, b, c, d, x[9], 4, -640364487);
    d = hh(d, a, b, c, x[12], 11, -421815835);
    c = hh(c, d, a, b, x[15], 16, 530742520);
    b = hh(b, c, d, a, x[2], 23, -995338651);

    a = ii(a, b, c, d, x[0], 6, -198630844);
    d = ii(d, a, b, c, x[7], 10, 1126891415);
    c = ii(c, d, a, b, x[14], 15, -1416354905);
    b = ii(b, c, d, a, x[5], 21, -57434055);
    a = ii(a, b, c, d, x[12], 6, 1700485571);
    d = ii(d, a, b, c, x[3], 10, -1894986606);
    c = ii(c, d, a, b, x[10], 15, -1051523);
    b = ii(b, c, d, a, x[1], 21, -2054922799);
    a = ii(a, b, c, d, x[8], 6, 1873313359);
    d = ii(d, a, b, c, x[15], 10, -30611744);
    c = ii(c, d, a, b, x[6], 15, -1560198380);
    b = ii(b, c, d, a, x[13], 21, 1309151649);
    a = ii(a, b, c, d, x[4], 6, -145523070);
    d = ii(d, a, b, c, x[11], 10, -1120210379);
    c = ii(c, d, a, b, x[2], 15, 718787259);
    b = ii(b, c, d, a, x[9], 21, -343485551);

    state[0] = add32(state[0], a);
    state[1] = add32(state[1], b);
    state[2] = add32(state[2], c);
    state[3] = add32(state[3], d);
  }

  function toHex(n: number): string {
    let s = "";
    for (let i = 0; i < 4; i++) {
      const v = (n >>> (i * 8)) & 0xff;
      s += v.toString(16).padStart(2, "0");
    }
    return s;
  }
  return toHex(state[0]) + toHex(state[1]) + toHex(state[2]) + toHex(state[3]);
}
