import "dotenv/config";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { checkPublicIp } from "./ipcheck.js";
import { resolveProxy, resolveProxyPool } from "./proxy.js";
import { downloadTikTokBatchVideos, downloadTikTokSingleVideo, scrapeTikTokProfile } from "./tiktok.js";
import type { ProgressEvent, ScrapeOptions, ScrapeResult, VideoItem } from "./types.js";

const rootDir = join(fileURLToPath(new URL("..", import.meta.url)));
const publicDir = join(rootDir, "public");
const port = Number(process.env.PORT || 6767);
const jobs = new Map<string, Job>();

type FieldKey =
  | "account"
  | "videoData"
  | "title"
  | "createTime"
  | "playCount"
  | "likeCount"
  | "commentCount"
  | "shareCount"
  | "collectCount"
  | "cover"
  | "videoUrl";

type WebRequest = {
  profileUrl?: string;
  videoUrl?: string;
  videoUrls?: string[];
  proxyMode?: "local" | "ipcookApi" | "ipcookProxy";
  ipcookProxyUrl?: string;
  proxyList?: string;
  directProxyUrl?: string;
  fields?: FieldKey[];
  timeRange?: "7" | "30" | "60" | "custom" | "all";
  customDays?: number;
  downloadMedia?: boolean;
  downloadVideos?: boolean;
  downloadCovers?: boolean;
  mediaMode?: "watermark" | "no-watermark";
  maxVideos?: number;
  scrollTimes?: number;
};

type Job = {
  id: string;
  status: "queued" | "running" | "paused" | "stopping" | "stopped" | "success" | "error";
  createdAt: string;
  updatedAt: string;
  progress: ProgressEvent[];
  pauseRequested?: boolean;
  stopRequested?: boolean;
  result?: ScrapeResult;
  error?: string;
};

const server = createServer(async (request, response) => {
  try {
    if (request.method === "POST" && request.url === "/api/scrape") {
      await enqueueScrape(request, response);
      return;
    }
    if (request.method === "POST" && request.url === "/api/download-video") {
      await enqueueSingleVideo(request, response);
      return;
    }
    if (request.method === "POST" && request.url === "/api/download-videos") {
      await enqueueBatchVideos(request, response);
      return;
    }
    if (request.method === "POST" && request.url === "/api/connection-ip") {
      await handleConnectionIp(request, response);
      return;
    }
    if (request.method === "POST" && request.url?.startsWith("/api/jobs/")) {
      handleJobControl(request, response);
      return;
    }
    if (request.method === "GET" && request.url?.startsWith("/api/jobs/")) {
      handleJobStatus(request, response);
      return;
    }
    await serveStatic(request, response);
  } catch (error) {
    sendJson(response, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

server.listen(port, () => {
  console.log(`TikTok scraper web UI: http://localhost:${port}`);
});

async function enqueueScrape(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const body = await readJsonBody<WebRequest>(request);
  if (!body.profileUrl) throw new Error("profileUrl is required");

  const job = createJob();
  runJob(job, async (push, waitIfPaused, shouldStop) => {
    const options = await buildScrapeOptions(body, "data", push, waitIfPaused, shouldStop);
    const result = await scrapeTikTokProfile({
      ...options,
      url: body.profileUrl
    });
    return filterResult(result, body.fields || defaultFields());
  });

  sendJson(response, 202, { ok: true, jobId: job.id });
}

async function enqueueSingleVideo(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const body = await readJsonBody<WebRequest>(request);
  if (!body.videoUrl) throw new Error("videoUrl is required");
  const videoUrl = body.videoUrl;

  const job = createJob();
  runJob(job, async (push, waitIfPaused, shouldStop) => {
    const options = await buildScrapeOptions(body, "data", push, waitIfPaused, shouldStop);
    const result = await downloadTikTokSingleVideo({
      ...options,
      videoUrl,
      downloadMedia: Boolean(body.downloadMedia),
      downloadVideos: body.downloadVideos !== false,
      downloadCovers: body.downloadCovers !== false
    });
    return filterResult(result, body.fields || defaultFields());
  });

  sendJson(response, 202, { ok: true, jobId: job.id });
}

async function enqueueBatchVideos(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const body = await readJsonBody<WebRequest>(request);
  const videoUrls = normalizeVideoUrls(body.videoUrls || []);
  if (!videoUrls.length) throw new Error("videoUrls is required");

  const job = createJob();
  runJob(job, async (push, waitIfPaused, shouldStop) => {
    const options = await buildScrapeOptions({ ...body, maxVideos: videoUrls.length }, "data", push, waitIfPaused, shouldStop);
    const result = await downloadTikTokBatchVideos({
      ...options,
      videoUrls,
      downloadMedia: Boolean(body.downloadMedia),
      downloadVideos: body.downloadVideos !== false,
      downloadCovers: body.downloadCovers !== false
    });
    return filterResult(result, body.fields || defaultFields());
  });

  sendJson(response, 202, { ok: true, jobId: job.id });
}

async function handleConnectionIp(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const body = await readJsonBody<WebRequest>(request);
  const proxyMode = normalizeProxyMode(body.proxyMode);
  assertProxyInput(proxyMode, body);
  const proxy = await resolveProxy({
    mode: proxyMode,
    ipcookProxyUrl: proxyMode === "ipcookApi" ? body.ipcookProxyUrl : undefined,
    proxyList: proxyMode === "ipcookProxy" ? body.proxyList : undefined,
    directProxyUrl: proxyMode === "ipcookProxy" ? body.directProxyUrl : undefined
  });
  const result = await checkPublicIp(proxy);
  sendJson(response, 200, {
    ok: true,
    ...result,
    proxyMode,
    display: `ip: ${result.ip} ${result.countryCode}`
  });
}

function handleJobStatus(request: IncomingMessage, response: ServerResponse): void {
  const id = request.url?.split("/").pop() || "";
  const job = jobs.get(id);
  if (!job) {
    sendJson(response, 404, { ok: false, error: "Job not found" });
    return;
  }
  sendJson(response, 200, { ok: true, job });
}

function handleJobControl(request: IncomingMessage, response: ServerResponse): void {
  const parts = (request.url || "").split("/");
  const id = parts[3] || "";
  const action = parts[4] || "";
  const job = jobs.get(id);
  if (!job) {
    sendJson(response, 404, { ok: false, error: "Job not found" });
    return;
  }

  if (!["running", "paused", "queued", "stopping"].includes(job.status)) {
    sendJson(response, 409, { ok: false, error: `Job is already ${job.status}` });
    return;
  }

  if (action === "pause") {
    if (job.stopRequested) {
      sendJson(response, 409, { ok: false, error: "Job is already stopping" });
      return;
    }
    job.pauseRequested = true;
    if (job.status === "running") job.status = "paused";
    pushToJob(job, "task_pause_requested", "Pause requested", undefined, "warning");
    sendJson(response, 200, { ok: true, job });
    return;
  }

  if (action === "resume") {
    if (job.stopRequested) {
      sendJson(response, 409, { ok: false, error: "Job is already stopping" });
      return;
    }
    job.pauseRequested = false;
    if (job.status === "paused") job.status = "running";
    pushToJob(job, "task_resumed", "Task resumed", undefined, "success");
    sendJson(response, 200, { ok: true, job });
    return;
  }

  if (action === "stop") {
    job.stopRequested = true;
    job.pauseRequested = false;
    if (["running", "paused", "queued"].includes(job.status)) job.status = "stopping";
    pushToJob(job, "task_stop_requested", "Stop requested", undefined, "warning");
    sendJson(response, 200, { ok: true, job });
    return;
  }

  sendJson(response, 404, { ok: false, error: "Unknown job control action" });
}

function createJob(): Job {
  const now = new Date().toISOString();
  const job: Job = {
    id: randomUUID(),
    status: "queued",
    createdAt: now,
    updatedAt: now,
    progress: []
  };
  jobs.set(job.id, job);
  return job;
}

function runJob(job: Job, task: (push: PushProgress, waitIfPaused: () => Promise<void>, shouldStop: () => boolean) => Promise<ScrapeResult>): void {
  const push: PushProgress = (code, message, detail, level = "info") => {
    pushToJob(job, code, message, detail, level);
  };
  const waitIfPaused = async (): Promise<void> => {
    while (job.pauseRequested && !job.stopRequested && !["success", "stopped", "error"].includes(job.status)) {
      await sleep(500);
    }
  };
  const shouldStop = (): boolean => Boolean(job.stopRequested);

  void (async () => {
    job.status = "running";
    push("task_started", "Task started");
    try {
      job.result = maskLinks(await task(push, waitIfPaused, shouldStop));
      if (job.stopRequested) {
        job.status = "stopped";
        push("task_stopped", "Task ended by request", { outputDir: job.result.outputDir }, "warning");
      } else {
        job.status = "success";
        push("task_success", "Task finished", { outputDir: job.result.outputDir }, "success");
      }
    } catch (error) {
      job.status = "error";
      job.error = error instanceof Error ? error.message : String(error);
      push("task_error", "Task failed", { error: job.error }, "error");
    } finally {
      job.updatedAt = new Date().toISOString();
    }
  })();
}

function pushToJob(job: Job, code: string, message: string, detail?: Record<string, unknown>, level: ProgressEvent["level"] = "info"): void {
  job.progress.push({
    code,
    message,
    detail,
    level,
    timestamp: new Date().toISOString()
  });
  job.updatedAt = new Date().toISOString();
}

type PushProgress = (
  code: string,
  message: string,
  detail?: Record<string, unknown>,
  level?: ProgressEvent["level"]
) => void;

async function buildScrapeOptions(body: WebRequest, outputDir: string, push: PushProgress, waitIfPaused: () => Promise<void>, shouldStop: () => boolean): Promise<ScrapeOptions> {
  const proxyMode = normalizeProxyMode(body.proxyMode);
  assertProxyInput(proxyMode, body);
  push("proxy_start", proxyMode === "local" ? "Using local connection" : proxyMode === "ipcookApi" ? "Configuring IPCook API" : "Configuring IPCook proxy");
  const proxyPool = await resolveProxyPool({
    mode: proxyMode,
    ipcookProxyUrl: proxyMode === "ipcookApi" ? body.ipcookProxyUrl : undefined,
    proxyList: proxyMode === "ipcookProxy" ? body.proxyList : undefined,
    directProxyUrl: proxyMode === "ipcookProxy" ? body.directProxyUrl : undefined
  });
  const proxy = proxyPool[0];
  push(
    "proxy_ready",
    proxy ? "Proxy ready" : "Local connection ready",
    proxy ? { server: proxy.server, count: proxyPool.length || 1 } : undefined,
    "success"
  );

  return {
    headless: true,
    maxVideos: clampNumber(body.maxVideos, 1, 200, 30),
    scrollTimes: clampNumber(body.scrollTimes, 1, 30, 6),
    outputDir,
    downloadMedia: Boolean(body.downloadMedia),
    downloadVideos: body.downloadVideos !== false,
    downloadCovers: body.downloadCovers !== false,
    downloadConcurrency: 1,
    taskBatchSize: 20,
    taskRetries: 2,
    mediaMode: body.mediaMode || "watermark",
    sinceDays: parseSinceDays(body),
    proxy,
    proxyPool,
    waitIfPaused,
    shouldStop,
    onProgress: (event) => {
      joblessPush(push, event);
    }
  };
}

function joblessPush(push: PushProgress, event: ProgressEvent): void {
  push(event.code, event.message, event.detail, event.level);
}

function parseSinceDays(body: WebRequest): number | undefined {
  if (!body.timeRange || body.timeRange === "all") return undefined;
  if (body.timeRange === "custom") return clampNumber(body.customDays, 1, 3650, 30);
  return Number(body.timeRange);
}

function filterResult(result: ScrapeResult, fields: FieldKey[]): ScrapeResult {
  const selected = new Set(fields);
  return {
    scrapedAt: result.scrapedAt,
    profileUrl: result.profileUrl,
    outputDir: result.outputDir,
    failedVideos: result.failedVideos,
    failedVideosFile: result.failedVideosFile,
    failedVideosJsonFile: result.failedVideosJsonFile,
    account: selected.has("account") ? result.account : {},
    videos: selected.has("videoData")
      ? result.videos.map((video) => filterVideo(video, selected))
      : []
  };
}

function filterVideo(video: VideoItem, selected: Set<FieldKey>): VideoItem {
  const output: VideoItem = { url: video.url };
  if (video.id) output.id = video.id;
  if (selected.has("title")) output.title = video.title;
  if (selected.has("title")) output.desc = video.desc;
  if (selected.has("createTime")) output.createTime = video.createTime;
  if (selected.has("createTime")) output.createTimestamp = video.createTimestamp;
  if (selected.has("playCount")) output.playCount = video.playCount;
  if (selected.has("likeCount")) output.diggCount = video.diggCount;
  if (selected.has("commentCount")) output.commentCount = video.commentCount;
  if (selected.has("shareCount")) output.shareCount = video.shareCount;
  if (selected.has("collectCount")) output.collectCount = video.collectCount;
  if (selected.has("cover")) output.coverUrl = video.coverUrl;
  if (selected.has("cover")) output.downloadedCoverPath = video.downloadedCoverPath;
  if (selected.has("videoUrl")) output.videoUrl = video.videoUrl;
  if (selected.has("videoUrl")) output.videoUrlSource = video.videoUrlSource;
  if (selected.has("videoUrl")) output.videoUrlVerified = video.videoUrlVerified;
  output.downloadedVideoPath = video.downloadedVideoPath;
  output.downloadError = video.downloadError;
  output.taskSkipped = video.taskSkipped;
  return output;
}

function defaultFields(): FieldKey[] {
  return ["account", "videoData", "title", "createTime", "playCount", "likeCount", "commentCount", "shareCount", "collectCount", "cover", "videoUrl"];
}

function normalizeProxyMode(mode: WebRequest["proxyMode"]): NonNullable<WebRequest["proxyMode"]> {
  if (mode === "ipcookApi" || mode === "ipcookProxy") return mode;
  return "local";
}

function assertProxyInput(proxyMode: NonNullable<WebRequest["proxyMode"]>, body: WebRequest): void {
  if (proxyMode === "ipcookApi" && !body.ipcookProxyUrl) {
    throw new Error("IPCook API link is required when IPCook API mode is selected.");
  }
  if (proxyMode === "ipcookProxy" && !body.proxyList && !body.directProxyUrl) {
    throw new Error("IPCook proxy list is required when IPCook proxy mode is selected.");
  }
}

function normalizeVideoUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  return urls
    .map((url) => url.trim())
    .filter((url) => /^https?:\/\/.*tiktok\.com/i.test(url))
    .filter((url) => {
      if (seen.has(url)) return false;
      seen.add(url);
      return true;
    })
    .slice(0, 200);
}

function maskLinks<T>(value: T): T {
  if (typeof value === "string") {
    if (/^https?:\/\//i.test(value)) return displayUrl(value) as T;
    return value;
  }
  if (Array.isArray(value)) return value.map(maskLinks) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, key.toLowerCase().includes("url") ? maskLinks(entry) : maskLinks(entry)])) as T;
  }
  return value;
}

function displayUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("tiktok.com")) return "https://www.tiktok.com/...";
    return `${parsed.protocol}//${parsed.hostname}/...`;
  } catch {
    return url;
  }
}

async function serveStatic(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const requestedUrl = new URL(request.url || "/", `http://localhost:${port}`);
  const cleanPath = requestedUrl.pathname === "/" ? "/index.html" : requestedUrl.pathname;
  const filePath = normalize(join(publicDir, cleanPath));

  if (!filePath.startsWith(publicDir)) {
    sendText(response, 403, "Forbidden");
    return;
  }

  try {
    const content = await readFile(filePath);
    response.writeHead(200, { "content-type": contentType(filePath) });
    response.end(content);
  } catch {
    sendText(response, 404, "Not found");
  }
}

async function readJsonBody<T>(request: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as T;
}

function sendJson(response: ServerResponse, status: number, payload: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload, null, 2));
}

function sendText(response: ServerResponse, status: number, text: string): void {
  response.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
  response.end(text);
}

function contentType(path: string): string {
  const ext = extname(path);
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".js") return "application/javascript; charset=utf-8";
  return "application/octet-stream";
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
