import { requestUrl } from "obsidian";

// ---------- 类型 ----------
export interface LookiMoment {
  id: string;
  title?: string;
  start_time?: string;
  end_time?: string;
  location?: unknown;
  description?: string;
  media_types?: string[];
  [key: string]: unknown;
}

export interface LookiFileItem {
  id?: string;
  file?: { temporary_url?: string; media_type?: string; size?: number; duration_ms?: number };
  [key: string]: unknown;
}

export interface LookiForYouItem {
  id: string;
  type?: string;
  title?: string;
  description?: string;
  content?: string;
  cover?: { temporary_url?: string; media_type?: string };
  file?: { temporary_url?: string; media_type?: string };
  recorded_at?: string;
  created_at?: string;
  [key: string]: unknown;
}

export class LookiClient {
  constructor(private apiKey: string, private baseUrl: string) {}

  private async get(path: string, params?: Record<string, unknown>): Promise<unknown> {
    const url = new URL(this.baseUrl.replace(/\/$/, "") + path);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== null && v !== undefined) url.searchParams.set(k, String(v));
      }
    }
    const resp = await requestUrl({
      url: url.toString(),
      method: "GET",
      headers: { "x-api-key": this.apiKey },
    });
    if (resp.status >= 400) {
      throw new Error(`Looki API ${resp.status}: ${resp.text}`);
    }
    const text = resp.text || "";
    return text ? JSON.parse(text) : {};
  }

  async momentsOnDate(date: string): Promise<LookiMoment[]> {
    const data = (await this.get("/moments", { on_date: date })) as Record<string, unknown>;
    return extractList(data?.data ?? data, "moments") as LookiMoment[];
  }

  async momentFiles(id: string): Promise<LookiFileItem[]> {
    const data = (await this.get(`/moments/${id}/files`, { limit: 50 })) as Record<string, unknown>;
    const d = (data?.data ?? data) as unknown;
    if (Array.isArray(d)) return d as LookiFileItem[];
    const obj = d as Record<string, unknown>;
    return (obj?.items ?? obj?.files ?? []) as LookiFileItem[];
  }

  async forYou(
    recordedFrom?: string,
    limit = 50,
    cursorId?: string
  ): Promise<{ items: LookiForYouItem[]; cursorId?: string }> {
    const data = (await this.get("/for_you/items", {
      recorded_from: recordedFrom,
      limit,
      cursor_id: cursorId,
    })) as Record<string, unknown>;
    const d = (data?.data ?? data) as Record<string, unknown>;
    const items = extractList(d, "items") as LookiForYouItem[];
    const cursor = (d?.cursor_id as string) ?? (data?.cursor_id as string);
    return { items, cursorId: cursor };
  }
}

function extractList(data: unknown, key?: string): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (key && Array.isArray(obj[key])) return obj[key] as unknown[];
    for (const k of ["moments", "items", "for_you", "for_you_items", "data"]) {
      if (Array.isArray(obj[k])) return obj[k] as unknown[];
    }
  }
  return [];
}

// ---------- 工具 ----------
export function parseLocation(loc: unknown): string {
  if (!loc) return "";
  if (typeof loc === "object" && loc !== null) {
    const o = loc as Record<string, unknown>;
    const parts = [o.administrativeArea, o.subAdministrativeArea, o.locality, o.subLocality, o.street, o.name]
      .filter((p): p is string => typeof p === "string" && p.length > 0);
    return parts.join(" ");
  }
  if (typeof loc === "string") {
    const s = loc.trim();
    if (s.startsWith("{")) {
      try {
        return parseLocation(JSON.parse(s));
      } catch {
        /* ignore */
      }
    }
    return s;
  }
  return String(loc);
}

// Looki 的 content 内嵌视频抽帧图外链 (...mp4.001.jpg?x-looki-token=, 1 小时过期),
// 同步进 Obsidian 会变成失效图, 故剥离, 仅保留文字; 本地 ![[...]] 嵌入不受影响。
const MD_EXT_IMG = /!\[[^\]]*\]\(https?:\/\/[^)]+\)/g;
export function sanitizeContent(text?: string): string {
  if (!text) return "";
  return text.replace(MD_EXT_IMG, "").trim();
}

export function dateOf(iso?: string): string | null {
  if (!iso) return null;
  return iso.slice(0, 10);
}
