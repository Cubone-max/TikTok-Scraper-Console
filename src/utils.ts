import { basename, join } from "node:path";

export function sanitizeFileName(input: string): string {
  return input
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

export function normalizeTikTokProfileUrl(input: { username?: string; url?: string }): string {
  if (input.url) {
    const url = new URL(input.url);
    return `${url.origin}${url.pathname.replace(/\/$/, "")}`;
  }

  const username = input.username?.trim().replace(/^@/, "");
  if (!username) {
    throw new Error("Please provide a TikTok username or profile URL.");
  }

  return `https://www.tiktok.com/@${encodeURIComponent(username)}`;
}

export function toIsoTime(timestamp?: number | string): string | undefined {
  if (timestamp === undefined || timestamp === null || timestamp === "") return undefined;
  const seconds = typeof timestamp === "string" ? Number.parseInt(timestamp, 10) : timestamp;
  if (!Number.isFinite(seconds)) return undefined;
  return new Date(seconds * 1000).toISOString();
}

export function mediaPath(outputDir: string, account: string, id: string, url: string, fallbackExt: string): string {
  const parsed = new URL(url);
  const nameExt = basename(parsed.pathname).split(".").pop()?.toLowerCase();
  const ext = isKnownMediaExt(nameExt) ? nameExt : fallbackExt.replace(/^\./, "").toLowerCase();
  return join(outputDir, "downloads", `${sanitizeFileName(id)}.${ext}`);
}

function isKnownMediaExt(ext?: string): ext is string {
  return Boolean(ext && ["jpg", "jpeg", "png", "webp", "gif", "mp4", "mov", "webm", "m4v"].includes(ext));
}
