import { Plugin, Notice, requestUrl } from "obsidian";
import {
  LookiClient,
  parseLocation,
  sanitizeContent,
  dateOf,
  LookiMoment,
  LookiForYouItem,
} from "./looki";
import { LookiSettingTab } from "./settings";

const DEFAULT_BASE = "https://open.looki.tech/api/v1";
const DEFAULT_NOTES = "00_灵感库/平台导入/Looki/每日记忆";
const DEFAULT_MEDIA = "00_灵感库/平台导入/Looki/media";

export interface LookiSettings {
  apiKey: string;
  baseUrl: string;
  notesFolder: string;
  mediaFolder: string;
  syncImages: boolean;
  syncVideos: boolean;
  backfillDays: number;
  syncInterval: number; // 分钟, 0 = 关闭
  syncOnStartup: boolean;
}

const DEFAULT_SETTINGS: LookiSettings = {
  apiKey: "",
  baseUrl: DEFAULT_BASE,
  notesFolder: DEFAULT_NOTES,
  mediaFolder: DEFAULT_MEDIA,
  syncImages: true,
  syncVideos: false,
  backfillDays: 1,
  syncInterval: 30,
  syncOnStartup: false,
};

interface SyncState {
  syncedMoments: Record<string, string>;
  syncedForYou: Record<string, string>;
  lastRun: string | null;
}

interface PluginData {
  settings: LookiSettings;
  state: SyncState;
}

export default class LookiSyncPlugin extends Plugin {
  settings: LookiSettings;
  private state: SyncState;
  private autoTimer: number | null = null;
  private statusBar: HTMLElement | null = null;

  async onload(): Promise<void> {
    await this.loadDataAll();
    this.addSettingTab(new LookiSettingTab(this.app, this));
    this.addRibbonIcon("refresh-cw", "Looki Sync", () => this.syncNow());
    this.addCommand({ id: "looki-sync-now", name: "Sync now", callback: () => this.syncNow() });
    this.addCommand({
      id: "looki-full-resync",
      name: "Full resync (reset history)",
      callback: () => this.fullResync(),
    });
    this.statusBar = this.addStatusBarItem();
    this.updateStatusBar("就绪");
    if (this.settings.syncOnStartup) this.syncNow();
    this.restartAutoSync();
  }

  onunload(): void {
    this.stopAutoSync();
  }

  // ---------- 数据读写 ----------
  private async loadDataAll(): Promise<void> {
    const loaded = ((await this.loadData()) as PluginData) ?? ({} as PluginData);
    this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded.settings ?? {});
    this.state = Object.assign(
      { syncedMoments: {}, syncedForYou: {}, lastRun: null },
      loaded.state ?? {}
    );
  }

  async saveSettings(): Promise<void> {
    await this.saveData({ settings: this.settings, state: this.state });
  }

  private async saveDataAll(): Promise<void> {
    await this.saveData({ settings: this.settings, state: this.state });
  }

  notice(msg: string): void {
    new Notice(msg);
  }

  // ---------- 同步入口 ----------
  async syncNow(): Promise<void> {
    if (!this.settings.apiKey) {
      this.notice("请先在设置中填写 Looki API Key");
      return;
    }
    this.updateStatusBar("同步中…");
    try {
      const client = new LookiClient(this.settings.apiKey, this.settings.baseUrl);
      const dates = this.targetDates();
      const forYouByDate = await this.fetchForYouGrouped(client, dates[dates.length - 1]);
      let total = 0;
      for (const date of dates) {
        const fy = forYouByDate.get(date) ?? [];
        total += await this.syncDay(client, date, fy);
      }
      this.state.lastRun = new Date().toISOString();
      await this.saveDataAll();
      this.updateStatusBar(`已同步 ${total}`);
      this.notice(`Looki 同步完成：${total} 条`);
    } catch (e) {
      this.updateStatusBar("同步失败");
      this.notice("同步失败：" + e.message);
      console.error("Looki Sync error:", e);
    }
  }

  async fullResync(): Promise<void> {
    this.state = { syncedMoments: {}, syncedForYou: {}, lastRun: null };
    await this.saveDataAll();
    this.notice("已重置同步记录，开始全量重同步…");
    await this.syncNow();
  }

  async testConnection(): Promise<void> {
    if (!this.settings.apiKey) throw new Error("未填写 API Key");
    const client = new LookiClient(this.settings.apiKey, this.settings.baseUrl);
    await client.momentsOnDate(this.fmt(new Date()));
  }

  // ---------- 单日合并同步 ----------
  private async syncDay(
    client: LookiClient,
    date: string,
    foryouItems: LookiForYouItem[]
  ): Promise<number> {
    const moments = await client.momentsOnDate(date);
    const mBlocks: string[] = [];
    for (const m of moments) {
      const embeds = await this.downloadMedia(client, m.id, date);
      mBlocks.push(this.momentBlock(m, embeds));
    }
    const fBlocks: string[] = [];
    for (const it of foryouItems) {
      const embeds = await this.downloadForYouMedia(it, date);
      fBlocks.push(this.foryouBlock(it, embeds));
    }
    if (!mBlocks.length && !fBlocks.length) {
      console.log(`[looki] ${date} 无数据`);
      return 0;
    }
    const content = this.buildNote(date, mBlocks, fBlocks);
    const path = `${this.settings.notesFolder}/${date}.md`;
    await this.app.vault.adapter.write(path, content);
    for (const m of moments) if (m.id) this.state.syncedMoments[m.id] = date;
    for (const it of foryouItems) if (it.id) this.state.syncedForYou[it.id] = date;
    await this.saveDataAll();
    return mBlocks.length + fBlocks.length;
  }

  // ---------- 媒体下载 ----------
  private async downloadMedia(client: LookiClient, momentId: string, date: string): Promise<string[]> {
    if (!this.settings.syncImages && !this.settings.syncVideos) return [];
    const files = await client.momentFiles(momentId);
    const embeds: string[] = [];
    let i = 0;
    for (const f of files) {
      const file = f.file;
      if (!file?.temporary_url) continue;
      const mt = (file.media_type || "").toUpperCase();
      if (mt === "IMAGE" && !this.settings.syncImages) continue;
      if (mt === "VIDEO" && !this.settings.syncVideos) continue;
      if (mt !== "IMAGE" && mt !== "VIDEO") continue;
      i++;
      const ext = mt === "VIDEO" ? "mp4" : "jpg";
      const rel = `${this.settings.mediaFolder}/${date}/${momentId}_${i}.${ext}`;
      const emb = await this.downloadOne(file.temporary_url, rel);
      if (emb) embeds.push(emb);
    }
    return embeds;
  }

  private async downloadForYouMedia(it: LookiForYouItem, date: string): Promise<string[]> {
    if (!this.settings.syncImages) return [];
    const cover = it.cover;
    if (cover?.media_type === "IMAGE" && cover.temporary_url) {
      const rel = `${this.settings.mediaFolder}/${date}/${it.id}_cover.jpg`;
      const emb = await this.downloadOne(cover.temporary_url, rel);
      if (emb) return [emb];
    }
    return [];
  }

  private async downloadOne(url: string, relPath: string): Promise<string | null> {
    try {
      if (await this.app.vault.adapter.exists(relPath)) return `![[${relPath}]]`;
      const resp = await requestUrl({ url, method: "GET" });
      if (resp.status >= 400) throw new Error("HTTP " + resp.status);
      await this.app.vault.adapter.writeBinary(relPath, resp.arrayBuffer);
      return `![[${relPath}]]`;
    } catch (e) {
      console.warn("Looki 媒体下载失败", relPath, e);
      return null;
    }
  }

  // ---------- 数据获取辅助 ----------
  private targetDates(): string[] {
    const out: string[] = [];
    const today = new Date();
    for (let i = 0; i <= this.settings.backfillDays; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      out.push(this.fmt(d));
    }
    return out;
  }

  private async fetchForYouGrouped(
    client: LookiClient,
    sinceDate: string
  ): Promise<Map<string, LookiForYouItem[]>> {
    const map = new Map<string, LookiForYouItem[]>();
    const seen = new Set<string>();
    let cursor: string | undefined;
    do {
      const { items, cursorId } = await client.forYou(sinceDate, 50, cursor);
      for (const it of items) {
        if (!it.id || seen.has(it.id)) continue;
        seen.add(it.id);
        const d = dateOf(it.recorded_at || it.created_at) || this.fmt(new Date());
        if (!map.has(d)) map.set(d, []);
        map.get(d)!.push(it);
      }
      cursor = cursorId;
    } while (cursor);
    return map;
  }

  // ---------- 笔记渲染 ----------
  private momentBlock(m: LookiMoment, embeds: string[]): string {
    const id = m.id || "";
    const title = m.title || "(无标题)";
    const start = m.start_time || m.created_at || "";
    const end = m.end_time || "";
    const loc = parseLocation(m.location);
    const desc = m.description || "";
    const media = (m.media_types || []).join(", ") || "—";
    const lines = [`### ${title}  \`id:${id}\``];
    if (start) lines.push(`- 时间: ${start}` + (end ? ` → ${end}` : ""));
    if (loc) lines.push(`- 地点: ${loc}`);
    lines.push(`- 媒体: ${media}`);
    if (desc) lines.push(`- 描述: ${desc}`);
    for (const e of embeds) lines.push(e);
    lines.push("");
    return lines.join("\n");
  }

  private foryouBlock(it: LookiForYouItem, embeds: string[]): string {
    const id = it.id || "";
    const type = it.type || "FOR_YOU";
    const title = it.title || "(无标题)";
    const recorded = it.recorded_at || it.created_at || "";
    const desc = it.description || "";
    const content = sanitizeContent(it.content);
    const lines = [`### ${title}  \`[${type}]\`  \`id:${id}\``];
    if (recorded) lines.push(`- 记录于: ${recorded}`);
    if (desc) lines.push(`- 简介: ${desc}`);
    for (const e of embeds) lines.push(e);
    if (content) {
      lines.push("");
      lines.push(content);
    }
    lines.push("");
    return lines.join("\n");
  }

  private buildNote(date: string, mBlocks: string[], fBlocks: string[]): string {
    const title = `Looki 每日记忆 ${date}`;
    const header =
      `---\ntitle: "${title}"\n` +
      `created: ${date}\n` +
      `updated: ${new Date().toISOString().slice(0, 19)}\n` +
      `tags:\n  - looki\n  - looki/daily\n  - looki/foryou\n` +
      `source: looki\ndate: ${date}\n---\n\n` +
      `# Looki 每日记忆 · ${date}\n\n`;
    let body = "";
    if (mBlocks.length) body += "## 今日片段 (Moments)\n\n" + mBlocks.join("\n") + "\n\n";
    if (fBlocks.length) body += "## 即时提示 (For You)\n\n" + fBlocks.join("\n") + "\n";
    return header + body;
  }

  // ---------- 自动同步 ----------
  restartAutoSync(): void {
    this.stopAutoSync();
    if (this.settings.syncInterval > 0) {
      this.autoTimer = window.setInterval(
        () => this.syncNow(),
        this.settings.syncInterval * 60 * 1000
      );
    }
  }

  private stopAutoSync(): void {
    if (this.autoTimer !== null) {
      window.clearInterval(this.autoTimer);
      this.autoTimer = null;
    }
  }

  private updateStatusBar(text: string): void {
    if (this.statusBar) this.statusBar.setText("Looki: " + text);
  }

  private fmt(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
}
