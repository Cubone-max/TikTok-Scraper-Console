import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium, type APIRequestContext, type BrowserContext, type BrowserContextOptions, type Page } from "playwright";
import { downloadToFile } from "./downloader.js";
import type { AccountProfile, FailedVideo, ProgressEvent, ScrapeOptions, ScrapeResult, VideoItem, VideoUrlCandidate } from "./types.js";
import { mediaPath, normalizeTikTokProfileUrl, sanitizeFileName, toIsoTime } from "./utils.js";

const DEFAULT_TASK_BATCH_SIZE = 20;
const DEFAULT_TASK_RETRIES = 2;
const NAVIGATION_RETRY_DELAYS_MS = [6000, 10_000, 14_000];

type PageSnapshot = {
  title?: string;
  canonical?: string;
  description?: string;
  ogImage?: string;
  h1?: string;
  h2?: string;
  metas: Record<string, string>;
  jsonLd: string[];
  scripts: Array<{ id: string; type: string; text: string }>;
  videoLinks: string[];
};

type InterceptedData = {
  account: Partial<AccountProfile>;
  videos: VideoItem[];
};

class PageOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PageOpenError";
  }
}

async function runWithProxyRotation<TOptions extends ScrapeOptions, TResult>(
  options: TOptions,
  task: (options: TOptions) => Promise<TResult>
): Promise<TResult> {
  const proxies = proxyCandidates(options);
  let lastError: unknown;

  for (let index = 0; index < proxies.length; index += 1) {
    const proxy = proxies[index];
    const nextOptions = { ...options, proxy } as TOptions;
    if (proxies.length > 1) {
      emitProgress(
        nextOptions,
        "proxy_using",
        "Using proxy",
        proxy ? { current: index + 1, total: proxies.length, server: proxy.server } : { current: index + 1, total: proxies.length },
        "info"
      );
    }

    try {
      return await task(nextOptions);
    } catch (error) {
      lastError = error;
      if (!(error instanceof PageOpenError) || index >= proxies.length - 1) throw error;
      const nextProxy = proxies[index + 1];
      emitProgress(
        nextOptions,
        "proxy_switch",
        "Switching proxy after page open failure",
        nextProxy ? { current: index + 2, total: proxies.length, server: nextProxy.server, error: error.message } : { current: index + 2, total: proxies.length, error: error.message },
        "warning"
      );
      await sleep(2000);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function proxyCandidates(options: ScrapeOptions): Array<ScrapeOptions["proxy"]> {
  const proxies = options.proxyPool?.length ? [...options.proxyPool] : [];
  const currentProxy = options.proxy;
  if (currentProxy && !proxies.some((proxy) => sameProxy(proxy, currentProxy))) proxies.unshift(currentProxy);
  return proxies.length ? proxies : [undefined];
}

function sameProxy(a: NonNullable<ScrapeOptions["proxy"]>, b: NonNullable<ScrapeOptions["proxy"]>): boolean {
  return a.server === b.server && a.username === b.username && a.password === b.password;
}

function canRotateProxy(options: ScrapeOptions): boolean {
  const proxies = proxyCandidates(options);
  if (proxies.length <= 1 || !options.proxy) return false;
  const currentIndex = proxies.findIndex((proxy) => proxy && sameProxy(proxy, options.proxy!));
  return currentIndex >= 0 && currentIndex < proxies.length - 1;
}

export async function scrapeTikTokProfile(options: ScrapeOptions): Promise<ScrapeResult> {
  return runWithProxyRotation(options, scrapeTikTokProfileAttempt);
}

async function scrapeTikTokProfileAttempt(options: ScrapeOptions): Promise<ScrapeResult> {
  const profileUrl = normalizeTikTokProfileUrl(options);
  emitProgress(options, "launch_browser", "Launching browser");
  const browser = await chromium.launch({
    headless: options.headless,
    args: ["--disable-blink-features=AutomationControlled"]
  });

  const contextOptions: BrowserContextOptions = {
    viewport: { width: 1365, height: 900 },
    locale: "en-US",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
  };

  if (options.proxy) contextOptions.proxy = options.proxy;

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  const intercepted: InterceptedData = { account: {}, videos: [] };
  attachTikTokResponseCollector(page, intercepted, options.mediaMode);

  try {
    emitProgress(options, "open_profile", "Opening TikTok profile", { url: profileUrl });
    await gotoWithProxyRetry(page, profileUrl, options);
    emitProgress(options, "profile_loaded", "Profile page loaded");
    await page.waitForTimeout(4000);
    await taskCheckpoint(options);

    for (let i = 0; i < options.scrollTimes; i += 1) {
      await taskCheckpoint(options);
      if (taskShouldStop(options)) break;
      await page.mouse.wheel(0, 1500);
      await page.waitForTimeout(4000);
      emitProgress(options, "scroll_profile", "Loading more videos", {
        current: i + 1,
        total: options.scrollTimes,
        count: await countKnownVideos(page, intercepted)
      });
    }

    await taskCheckpoint(options);
    emitProgress(options, "parse_profile", "Parsing account and video data");
    const snapshot = await readPageSnapshot(page);

    const account = {
      ...extractAccount(snapshot.scripts, snapshot, profileUrl),
      ...intercepted.account
    };
    const videos = mergeVideos([
      ...intercepted.videos,
      ...extractVideos(snapshot.scripts, snapshot.videoLinks, options.maxVideos, options.mediaMode)
    ]);
    const filteredVideos = filterVideosByTime(videos, options.sinceDays).slice(0, options.maxVideos);
    const accountLoaded = hasAccountData(account);

    if (!accountLoaded && filteredVideos.length === 0) {
      emitProgress(options, "profile_empty", "No account or video data found", { count: 0 }, "error");
      throw new Error("No account or video data was found. The profile may be unavailable, private, region blocked, or blocked by TikTok.");
    }

    emitProgress(options, filteredVideos.length ? "videos_found" : "no_videos_found", filteredVideos.length ? "Videos found" : "No videos found", { count: filteredVideos.length }, filteredVideos.length ? "success" : "warning");
    if (filteredVideos.length > 0 && !taskShouldStop(options)) {
      await taskCheckpoint(options);
      emitProgress(options, "verify_video_urls", "Verifying video download sources", { count: filteredVideos.length });
      await runVideoBatches(options, filteredVideos, "verify", async (batch) => {
        await refreshVideoUrls(page, batch, options);
      });
    }

    const scrapedAt = new Date().toISOString();
    const outputDir = runOutputDir(options.outputDir, account.uniqueId || account.nickname || "unknown", scrapedAt);
    const result: ScrapeResult = {
      scrapedAt,
      profileUrl,
      account,
      videos: filteredVideos,
      outputDir
    };

    const downloadableMediaCount = countDownloadableMedia(result, options);
    if (options.downloadMedia && downloadableMediaCount > 0 && !taskShouldStop(options)) {
      await taskCheckpoint(options);
      emitProgress(options, "download_start", "Downloading selected media", { count: downloadableMediaCount });
      await downloadMedia(result, { ...options, outputDir }, await cookieHeaderForDownloads(context));
    }

    finalizeFailedVideos(result, options);
    if (result.failedVideos?.length) emitProgress(options, "failed_videos_ready", "Failed videos list ready", { count: result.failedVideos.length }, "warning");
    await taskCheckpoint(options);
    emitProgress(options, "save_result", "Saving result files", { outputDir });
    await saveResult(result, outputDir);
    emitProgress(options, "complete", "Task complete", { outputDir }, "success");
    return result;
  } finally {
    await context.close();
    await browser.close();
  }
}

export async function downloadTikTokSingleVideo(options: ScrapeOptions & { videoUrl: string }): Promise<ScrapeResult> {
  return runWithProxyRotation(options, downloadTikTokSingleVideoAttempt);
}

async function downloadTikTokSingleVideoAttempt(options: ScrapeOptions & { videoUrl: string }): Promise<ScrapeResult> {
  emitProgress(options, "launch_browser", "Launching browser");
  const browser = await chromium.launch({
    headless: options.headless,
    args: ["--disable-blink-features=AutomationControlled"]
  });

  const contextOptions: BrowserContextOptions = {
    viewport: { width: 1365, height: 900 },
    locale: "en-US",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
  };
  if (options.proxy) contextOptions.proxy = options.proxy;

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  const intercepted: InterceptedData = { account: {}, videos: [] };
  attachTikTokResponseCollector(page, intercepted, options.mediaMode);

  try {
    emitProgress(options, "open_video", "Opening TikTok video", { url: options.videoUrl });
    await taskCheckpoint(options);
    emitProgress(options, "parse_video", "Parsing video data");
    const { username, videos: finalVideos } = await collectSingleVideo(page, intercepted, options.videoUrl, options);
    emitProgress(options, "verify_video_urls", "Verifying video download sources");
    await refreshVideoUrls(page, finalVideos, options);

    const scrapedAt = new Date().toISOString();
    const outputName = username || finalVideos[0]?.id || "single-video";
    const outputDir = runOutputDir(options.outputDir, outputName, scrapedAt);
    const result: ScrapeResult = {
      scrapedAt,
      profileUrl: username ? `https://www.tiktok.com/@${username}` : options.videoUrl,
      account: {
        uniqueId: username,
        ...intercepted.account
      },
      videos: finalVideos,
      outputDir
    };

    const downloadableMediaCount = countDownloadableMedia(result, options);
    if (options.downloadMedia && downloadableMediaCount > 0 && !taskShouldStop(options)) {
      await taskCheckpoint(options);
      emitProgress(options, "download_start", "Downloading selected media", { count: downloadableMediaCount });
      await downloadMedia(result, { ...options, outputDir }, await cookieHeaderForDownloads(context));
    }

    finalizeFailedVideos(result, options);
    if (result.failedVideos?.length) emitProgress(options, "failed_videos_ready", "Failed videos list ready", { count: result.failedVideos.length }, "warning");
    await taskCheckpoint(options);
    emitProgress(options, "save_result", "Saving result files", { outputDir });
    await saveResult(result, outputDir);
    emitProgress(options, "complete", "Task complete", { outputDir }, "success");
    return result;
  } finally {
    await context.close();
    await browser.close();
  }
}

export async function downloadTikTokBatchVideos(options: ScrapeOptions & { videoUrls: string[] }): Promise<ScrapeResult> {
  return runWithProxyRotation(options, downloadTikTokBatchVideosAttempt);
}

async function downloadTikTokBatchVideosAttempt(options: ScrapeOptions & { videoUrls: string[] }): Promise<ScrapeResult> {
  emitProgress(options, "launch_browser", "Launching browser");
  const browser = await chromium.launch({
    headless: options.headless,
    args: ["--disable-blink-features=AutomationControlled"]
  });

  const contextOptions: BrowserContextOptions = {
    viewport: { width: 1365, height: 900 },
    locale: "en-US",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
  };
  if (options.proxy) contextOptions.proxy = options.proxy;

  const context = await browser.newContext(contextOptions);

  try {
    emitProgress(options, "batch_links_found", "Batch video links received", { count: options.videoUrls.length });
    const collectedVideos: VideoItem[] = [];

    for (let index = 0; index < options.videoUrls.length; index += 1) {
      await taskCheckpoint(options);
      if (taskShouldStop(options)) break;
      const videoUrl = options.videoUrls[index];
      const videos = await collectSingleVideoWithRetry(context, options, videoUrl, index + 1, options.videoUrls.length);
      collectedVideos.push(...videos);
      if (taskShouldStop(options)) break;
    }

    const scrapedAt = new Date().toISOString();
    const outputDir = runOutputDir(options.outputDir, "batch-videos", scrapedAt);
    const result: ScrapeResult = {
      scrapedAt,
      profileUrl: "https://www.tiktok.com/...",
      account: {
        uniqueId: "batch-videos",
        nickname: "Batch Videos",
        videoCount: collectedVideos.length
      },
      videos: mergeVideos(collectedVideos),
      outputDir
    };

    const downloadableMediaCount = countDownloadableMedia(result, options);
    if (options.downloadMedia && downloadableMediaCount > 0 && !taskShouldStop(options)) {
      await taskCheckpoint(options);
      emitProgress(options, "download_start", "Downloading selected media", { count: downloadableMediaCount });
      await downloadMedia(result, { ...options, outputDir }, await cookieHeaderForDownloads(context));
    }

    finalizeFailedVideos(result, options);
    if (result.failedVideos?.length) emitProgress(options, "failed_videos_ready", "Failed videos list ready", { count: result.failedVideos.length }, "warning");
    await taskCheckpoint(options);
    emitProgress(options, "save_result", "Saving result files", { outputDir });
    await saveResult(result, outputDir);
    emitProgress(options, "complete", "Task complete", { outputDir }, "success");
    return result;
  } finally {
    await context.close();
    await browser.close();
  }
}

async function collectSingleVideo(
  page: Page,
  intercepted: InterceptedData,
  videoUrl: string,
  options: ScrapeOptions
): Promise<{ username?: string; videos: VideoItem[] }> {
  await gotoWithProxyRetry(page, videoUrl, options);
  await page.waitForTimeout(7000);
  const snapshot = await readPageSnapshot(page);
  const videoId = videoUrl.match(/\/video\/(\d+)/)?.[1];
  const username = videoUrl.match(/@([^/?#]+)/)?.[1];
  const videos = mergeVideos([
    ...intercepted.videos,
    ...extractVideos(snapshot.scripts, [videoUrl], 1, options.mediaMode)
  ]).filter((video) => !videoId || video.id === videoId || video.url.includes(videoId));

  return {
    username,
    videos: videos.length ? videos.slice(0, 1) : [{ id: videoId, url: videoUrl } as VideoItem]
  };
}

async function collectSingleVideoWithRetry(
  context: BrowserContext,
  options: ScrapeOptions,
  videoUrl: string,
  current: number,
  total: number
): Promise<VideoItem[]> {
  const attempts = retryAttempts(options);
  let lastError = "";

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    await taskCheckpoint(options);
    if (taskShouldStop(options) && attempt > 1) break;
    const page = await context.newPage();
    const intercepted: InterceptedData = { account: {}, videos: [] };
    attachTikTokResponseCollector(page, intercepted, options.mediaMode);

    try {
      emitProgress(options, "open_video", "Opening TikTok video", { current, total, url: videoUrl, attempt, attempts });
      emitProgress(options, "parse_video", "Parsing video data", { current, total, attempt, attempts });
      const { videos } = await collectSingleVideo(page, intercepted, videoUrl, options);
      emitProgress(options, "verify_video_urls", "Verifying video download sources", { current, total, attempt, attempts });
      await refreshVideoUrls(page, videos, options);
      return videos;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (error instanceof PageOpenError && canRotateProxy(options)) throw error;
      if (attempt < attempts) {
        emitProgress(options, "item_retry", "Video task failed, retrying", { current, total, attempt, attempts, url: videoUrl, error: lastError }, "warning");
        await sleep(1000 * attempt);
      }
    } finally {
      await page.close();
    }
  }

  emitProgress(options, "item_skip", "Video task failed after retries, skipped", { current, total, url: videoUrl, error: lastError }, "error");
  return [{
    id: videoUrl.match(/\/video\/(\d+)/)?.[1],
    url: videoUrl,
    downloadError: lastError
  }];
}

function attachTikTokResponseCollector(page: Page, intercepted: InterceptedData, mediaMode: ScrapeOptions["mediaMode"]): void {
  page.on("response", async (response) => {
    if (response.status() !== 200) return;

    const url = response.url();
    try {
      if (url.includes("user/detail")) {
        const payload = await response.json();
        const userInfo = objectValue((payload as Record<string, unknown>).userInfo);
        const user = objectValue(userInfo.user);
        const stats = objectValue(userInfo.stats);
        Object.assign(intercepted.account, {
          id: asString(user.id),
          uniqueId: asString(user.uniqueId),
          nickname: asString(user.nickname),
          signature: asString(user.signature),
          avatarUrl: asString(user.avatarLarger) || asString(user.avatarMedium) || asString(user.avatarThumb),
          verified: asBool(user.verified),
          followingCount: asNumber(stats.followingCount),
          followerCount: asNumber(stats.followerCount),
          heartCount: asNumber(stats.heartCount),
          videoCount: asNumber(stats.videoCount),
          diggCount: asNumber(stats.diggCount)
        });
      }

      if (url.includes("item_list")) {
        const payload = await response.json();
        appendTikTokItems(intercepted, (payload as Record<string, unknown>).itemList, mediaMode);
      }

      if (url.includes("item/detail")) {
        const payload = await response.json();
        const itemInfo = objectValue((payload as Record<string, unknown>).itemInfo);
        appendTikTokItems(intercepted, [itemInfo.itemStruct], mediaMode);
      }
    } catch {
      // Some TikTok endpoints return compressed, empty, or non-JSON responses. Keep listening.
    }
  });
}

function appendTikTokItems(intercepted: InterceptedData, itemList: unknown, mediaMode: ScrapeOptions["mediaMode"]): void {
  if (!Array.isArray(itemList)) return;
  intercepted.videos.push(...itemList.map((item) => tiktokItemToVideo(item, mediaMode)).filter((item): item is VideoItem => Boolean(item)));
}

async function gotoWithProxyRetry(page: Page, url: string, options: ScrapeOptions): Promise<void> {
  const attempts = NAVIGATION_RETRY_DELAYS_MS.length + 1;
  let lastError = "";

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    await taskCheckpoint(options);
    try {
      const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
      const status = response?.status();
      if (status && status >= 400) {
        throw new Error(`Page returned HTTP ${status}${status === 404 ? " (not found)" : ""}`);
      }
      return;
    } catch (error) {
      lastError = normalizeNavigationError(error);
      const waitMs = NAVIGATION_RETRY_DELAYS_MS[attempt - 1];
      if (!waitMs) break;
      emitProgress(
        options,
        "page_open_retry",
        "Page failed to open, retrying",
        {
          url,
          attempt,
          attempts,
          waitSeconds: Math.round(waitMs / 1000),
          error: lastError
        },
        lastError.includes("404") ? "error" : "warning"
      );
      await page.waitForTimeout(waitMs);
    }
  }

  emitProgress(options, "page_open_failed", "Page could not be opened", { url, error: lastError }, "error");
  throw new PageOpenError(`TikTok page could not be opened after ${attempts} attempts: ${lastError}`);
}

function normalizeNavigationError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/HTTP 404|404/i.test(message)) return "HTTP 404: page not found or video/profile unavailable.";
  if (/HTTP 403|403/i.test(message)) return "HTTP 403: access denied, region blocked, or TikTok rejected the request.";
  if (/HTTP 429|429/i.test(message)) return "HTTP 429: too many requests, TikTok may be rate limiting this IP.";
  if (/Timeout/i.test(message)) return "Page load timeout.";
  if (/ERR_PROXY|proxy/i.test(message)) return "Proxy connection failed.";
  if (/ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|ERR_CONNECTION|ERR_TUNNEL|ERR_TIMED_OUT/i.test(message)) {
    return "Network connection failed.";
  }
  return message;
}

async function readPageSnapshot(page: Page): Promise<PageSnapshot> {
  return (await page.evaluate(`
    (() => {
      const text = (selector) => document.querySelector(selector)?.textContent?.trim();
      const attr = (selector, name) => document.querySelector(selector)?.getAttribute(name) || undefined;
      const metas = {};
      for (const meta of Array.from(document.querySelectorAll("meta"))) {
        const key = meta.getAttribute("property") || meta.getAttribute("name");
        const value = meta.getAttribute("content");
        if (key && value) metas[key] = value;
      }
      const allScripts = Array.from(document.querySelectorAll("script")).map((script) => ({
        id: script.id,
        type: script.type,
        text: script.textContent || ""
      }));
      const scripts = allScripts.filter((script) =>
        script.text.includes("SIGI_STATE") ||
        script.text.includes("__UNIVERSAL_DATA_FOR_REHYDRATION__") ||
        script.text.includes('"ItemModule"') ||
        script.text.includes('"itemStruct"')
      );
      const jsonLd = allScripts
        .filter((script) => script.type === "application/ld+json")
        .map((script) => script.text)
        .filter(Boolean);

      const videoLinks = Array.from(document.querySelectorAll('a[href*="/video/"]')).map((link) => link.href);

      return {
        title: document.title,
        canonical: attr('link[rel="canonical"]', "href"),
        description: attr('meta[name="description"]', "content"),
        ogImage: attr('meta[property="og:image"]', "content"),
        h1: text("h1"),
        h2: text("h2"),
        metas,
        jsonLd,
        scripts,
        videoLinks
      };
    })()
  `)) as PageSnapshot;
}

function extractAccount(
  scripts: Array<{ id: string; text: string }>,
  fallback: { title?: string; description?: string; ogImage?: string; h1?: string; h2?: string },
  profileUrl: string
): AccountProfile {
  const usernameFromUrl = profileUrl.match(/@([^/?#]+)/)?.[1];
  const stateObjects = parseStateObjects(scripts);
  const candidates = deepFindObjects(stateObjects, (value) => {
    const record = value as Record<string, unknown>;
    return (
      (typeof record.uniqueId === "string" || typeof record.nickname === "string") &&
      (typeof record.signature === "string" || typeof record.avatarLarger === "string" || typeof record.avatarMedium === "string")
    );
  });

  const user = candidates.find((item) => item.uniqueId === usernameFromUrl) || candidates[0] || {};
  const stats =
    deepFindObjects(stateObjects, (value) => {
      const record = value as Record<string, unknown>;
      return ["followerCount", "followingCount", "heartCount", "videoCount"].some((key) => typeof record[key] === "number");
    })[0] || {};

  return {
    id: asString(user.id),
    uniqueId: asString(user.uniqueId) || usernameFromUrl,
    nickname: asString(user.nickname) || fallback.h1,
    signature: asString(user.signature) || fallback.description,
    avatarUrl: asString(user.avatarLarger) || asString(user.avatarMedium) || asString(user.avatarThumb) || fallback.ogImage,
    verified: asBool(user.verified),
    followingCount: asNumber(stats.followingCount),
    followerCount: asNumber(stats.followerCount),
    heartCount: asNumber(stats.heartCount),
    videoCount: asNumber(stats.videoCount),
    diggCount: asNumber(stats.diggCount)
  };
}

function extractVideos(
  scripts: Array<{ id: string; text: string }>,
  videoLinks: string[],
  maxVideos: number,
  mediaMode: ScrapeOptions["mediaMode"]
): VideoItem[] {
  const stateObjects = parseStateObjects(scripts);
  const itemCandidates = deepFindObjects(stateObjects, (value) => {
    const record = value as Record<string, unknown>;
    return (
      (typeof record.id === "string" || typeof record.id === "number") &&
      (typeof record.desc === "string" || typeof record.createTime === "number" || typeof record.stats === "object") &&
      (typeof record.video === "object" || typeof record.author === "object")
    );
  });

  const videos = new Map<string, VideoItem>();
  for (const item of itemCandidates) {
    const id = asString(item.id);
    const stats = objectValue(item.stats);
    const video = objectValue(item.video);
    const author = objectValue(item.author);
    const authorUniqueId = asString(author.uniqueId);
    const url = id && authorUniqueId ? `https://www.tiktok.com/@${authorUniqueId}/video/${id}` : undefined;
    if (!id && !url) continue;

    videos.set(id || url || crypto.randomUUID(), {
      id,
      url: url || "",
      title: asString(item.desc),
      desc: asString(item.desc),
      createTimestamp: asNumber(item.createTime),
      createTime: toIsoTime(asNumber(item.createTime)),
      playCount: asNumber(stats.playCount),
      diggCount: asNumber(stats.diggCount),
      commentCount: asNumber(stats.commentCount),
      shareCount: asNumber(stats.shareCount),
      collectCount: asNumber(stats.collectCount),
      coverUrl:
        asString(video.cover) ||
        asString(video.originCover) ||
        asString(video.dynamicCover) ||
        firstStringArrayValue(video.coverUrlList),
      ...pickBestVideoUrl(video, mediaMode)
    });
  }

  for (const href of videoLinks) {
    const id = href.match(/\/video\/(\d+)/)?.[1];
    if (!id || videos.has(id)) continue;
    videos.set(id, { id, url: href });
  }

  return Array.from(videos.values())
    .filter((video) => video.url)
    .slice(0, maxVideos);
}

function tiktokItemToVideo(item: unknown, mediaMode: ScrapeOptions["mediaMode"]): VideoItem | undefined {
  const record = objectValue(item);
  const id = asString(record.id);
  const author = objectValue(record.author);
  const stats = objectValue(record.stats);
  const video = objectValue(record.video);
  const authorUniqueId = asString(author.uniqueId);
  const url = id && authorUniqueId ? `https://www.tiktok.com/@${authorUniqueId}/video/${id}` : undefined;
  if (!id || !url) return undefined;

  return {
    id,
    url,
    title: asString(record.desc),
    desc: asString(record.desc),
    createTimestamp: asNumber(record.createTime),
    createTime: toIsoTime(asNumber(record.createTime)),
    playCount: asNumber(stats.playCount),
    diggCount: asNumber(stats.diggCount),
    commentCount: asNumber(stats.commentCount),
    shareCount: asNumber(stats.shareCount),
    collectCount: asNumber(stats.collectCount),
    coverUrl:
      asString(video.cover) ||
      asString(video.originCover) ||
      asString(video.dynamicCover) ||
      firstStringArrayValue(video.coverUrlList),
    ...pickBestVideoUrl(video, mediaMode)
  };
}

function pickBestVideoUrl(
  video: Record<string, unknown>,
  mediaMode: ScrapeOptions["mediaMode"]
): Pick<VideoItem, "videoUrl" | "videoUrlSource" | "videoUrlCandidates"> {
  const candidates = collectVideoUrlCandidates(video, mediaMode);
  const candidate = candidates[0];
  return candidate
    ? { videoUrl: candidate.url, videoUrlSource: candidate.source, videoUrlCandidates: candidates }
    : { videoUrlCandidates: candidates };
}

function collectVideoUrlCandidates(video: Record<string, unknown>, mediaMode: ScrapeOptions["mediaMode"]): VideoUrlCandidate[] {
  const noWatermarkCandidates: VideoUrlCandidate[] = [];
  const watermarkCandidates: VideoUrlCandidate[] = [];

  const bitRate = video.bitRate;
  if (Array.isArray(bitRate)) {
    for (const item of bitRate) {
      const playAddr = objectValue(objectValue(item).playAddr);
      for (const url of collectUrlStrings(playAddr.urlList)) {
        noWatermarkCandidates.push({ url, source: "bitRate", noWatermarkLikely: true });
      }
      for (const url of collectUrlStrings(playAddr.urlKey)) {
        noWatermarkCandidates.push({ url, source: "bitRate", noWatermarkLikely: true });
      }
    }
  }

  for (const url of collectUrlStrings(video.playAddrUrlList)) {
    noWatermarkCandidates.push({ url, source: "playAddr", noWatermarkLikely: true });
  }
  for (const url of collectUrlStrings(video.playAddr)) {
    noWatermarkCandidates.push({ url, source: "playAddr", noWatermarkLikely: true });
  }
  for (const url of collectUrlStrings(video.downloadAddrUrlList)) {
    watermarkCandidates.push({ url, source: "downloadAddr", noWatermarkLikely: false });
  }
  for (const url of collectUrlStrings(video.downloadAddr)) {
    watermarkCandidates.push({ url, source: "downloadAddr", noWatermarkLikely: false });
  }

  const ordered = mediaMode === "no-watermark" ? [...noWatermarkCandidates, ...watermarkCandidates] : [...watermarkCandidates, ...noWatermarkCandidates];
  const seen = new Set<string>();
  return ordered.filter((candidate) => {
    if (!candidate.url.startsWith("http") || seen.has(candidate.url)) return false;
    seen.add(candidate.url);
    return true;
  });
}

async function refreshVideoUrls(page: Page, videos: VideoItem[], options: ScrapeOptions): Promise<void> {
  for (const video of videos) {
    await taskCheckpoint(options);
    if (taskShouldStop(options)) break;
    for (const candidate of orderedCandidatesForVideo(video, options.mediaMode)) {
      const validation = await validateVideoUrl(page.request, candidate.url);
      if (!validation.videoUrlVerified) continue;
      Object.assign(video, {
        videoUrl: candidate.url,
        videoUrlSource: candidate.source,
        ...validation
      });
      break;
    }

    if (video.videoUrlVerified) continue;

    if (video.videoUrl) {
      const validation = await validateVideoUrl(page.request, video.videoUrl);
      Object.assign(video, validation);
      if (validation.videoUrlVerified) continue;
    }

    const capturedUrls = await captureMediaUrlsFromVideoPage(page, video.url, options);
    for (const capturedUrl of capturedUrls) {
      const validation = await validateVideoUrl(page.request, capturedUrl);
      if (!validation.videoUrlVerified) continue;
      Object.assign(video, {
        videoUrl: capturedUrl,
        videoUrlSource: "mediaResponse" as const,
        ...validation
      });
      break;
    }
  }
}

function orderedCandidatesForVideo(video: VideoItem, mediaMode: ScrapeOptions["mediaMode"]): VideoUrlCandidate[] {
  const candidates = video.videoUrlCandidates || [];
  const current = video.videoUrl && video.videoUrlSource
    ? [{ url: video.videoUrl, source: video.videoUrlSource, noWatermarkLikely: video.videoUrlSource !== "downloadAddr" }]
    : [];
  const ordered = mediaMode === "no-watermark"
    ? [...candidates.filter((candidate) => candidate.noWatermarkLikely), ...current, ...candidates.filter((candidate) => !candidate.noWatermarkLikely)]
    : [...current, ...candidates];
  const seen = new Set<string>();
  return ordered.filter((candidate) => {
    if (seen.has(candidate.url)) return false;
    seen.add(candidate.url);
    return true;
  });
}

async function validateVideoUrl(request: APIRequestContext, url: string): Promise<Pick<VideoItem, "videoUrlVerified" | "videoUrlStatus" | "videoUrlContentType">> {
  try {
    const response = await request.get(url, {
      timeout: 20_000,
      headers: {
        range: "bytes=0-1023",
        referer: "https://www.tiktok.com/",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
      }
    });
    const contentType = response.headers()["content-type"];
    const status = response.status();
    return {
      videoUrlVerified: (status === 200 || status === 206) && Boolean(contentType?.includes("video")),
      videoUrlStatus: status,
      videoUrlContentType: contentType
    };
  } catch {
    return { videoUrlVerified: false };
  }
}

async function captureMediaUrlsFromVideoPage(page: Page, videoPageUrl: string, options: ScrapeOptions): Promise<string[]> {
  const mediaUrls = new Set<string>();
  const handler = async (response: Awaited<ReturnType<Page["waitForResponse"]>>): Promise<void> => {
    try {
      const url = response.url();
      if (url.includes("/video/tos/") || url.includes("mime_type=video_mp4")) {
        mediaUrls.add(url);
        return;
      }
      const contentType = await response.headerValue("content-type");
      if (contentType?.includes("video")) mediaUrls.add(url);
    } catch {
      // Ignore responses that Playwright can no longer inspect.
    }
  };

  page.on("response", handler);
  try {
    await gotoWithProxyRetry(page, videoPageUrl, options);
    await page.waitForTimeout(2500);
    await page.mouse.click(640, 360).catch(() => undefined);
    await page.waitForTimeout(4500);
    for (const url of await readVideoElementUrls(page)) {
      mediaUrls.add(url);
    }
  } catch {
    // Keep any media URL captured before navigation failed.
  } finally {
    page.off("response", handler);
  }

  return Array.from(mediaUrls).sort((a, b) => Number(b.includes("mime_type=video_mp4")) - Number(a.includes("mime_type=video_mp4")));
}

async function readVideoElementUrls(page: Page): Promise<string[]> {
  try {
    return (await page.evaluate(`
      (() => {
        const urls = [];
        for (const video of Array.from(document.querySelectorAll("video"))) {
          if (video.src) urls.push(video.src);
          if (video.currentSrc) urls.push(video.currentSrc);
          for (const source of Array.from(video.querySelectorAll("source"))) {
            if (source.src) urls.push(source.src);
          }
        }
        return Array.from(new Set(urls)).filter(Boolean);
      })()
    `)) as string[];
  } catch {
    return [];
  }
}

async function countKnownVideos(page: Page, intercepted: InterceptedData): Promise<number> {
  const ids = new Set<string>();
  for (const video of intercepted.videos) {
    const key = video.id || video.url;
    if (key) ids.add(key);
  }

  try {
    const links = (await page.evaluate(`Array.from(document.querySelectorAll('a[href*="/video/"]')).map((link) => link.href)`)) as string[];
    for (const href of links) {
      const id = href.match(/\/video\/(\d+)/)?.[1];
      ids.add(id || href);
    }
  } catch {
    // Keep the intercepted API count when DOM link inspection is unavailable.
  }

  return ids.size;
}

function mergeVideos(videos: VideoItem[]): VideoItem[] {
  const merged = new Map<string, VideoItem>();
  for (const video of videos) {
    const key = video.id || video.url;
    if (!key) continue;
    const existing = merged.get(key);
    merged.set(key, existing ? mergeDefinedVideo(existing, video) : video);
  }
  return Array.from(merged.values());
}

function mergeDefinedVideo(existing: VideoItem, next: VideoItem): VideoItem {
  const output: VideoItem = { ...existing };
  for (const [key, value] of Object.entries(next) as Array<[keyof VideoItem, VideoItem[keyof VideoItem]]>) {
    if (value !== undefined) {
      (output as Record<keyof VideoItem, VideoItem[keyof VideoItem]>)[key] = value;
    }
  }
  return output;
}

async function downloadMedia(result: ScrapeResult, options: ScrapeOptions, cookieHeader?: string): Promise<void> {
  const batches = chunkArray(result.videos, taskBatchSize(options));
  const state = {
    currentMedia: 0,
    totalMedia: countDownloadableMedia(result, options)
  };

  for (let index = 0; index < batches.length; index += 1) {
    await taskCheckpoint(options);
    if (taskShouldStop(options)) break;
    const batch = batches[index];
    const ok = await runVideoBatchTask(options, batch, "download", index + 1, batches.length, async () => {
      await downloadMediaBatch({ ...result, videos: batch }, options, state, cookieHeader);
    });

    if (!ok) {
      for (const video of batch) {
        video.taskSkipped = true;
        video.downloadError ||= "Skipped after repeated batch failures.";
      }
    }
  }
}

async function downloadMediaBatch(
  result: ScrapeResult,
  options: ScrapeOptions,
  state: { currentMedia: number; totalMedia: number },
  cookieHeader?: string
): Promise<void> {
  const account = result.account.uniqueId || result.account.nickname || "unknown";
  const headers = cookieHeader ? { cookie: cookieHeader } : undefined;

  await runPool(result.videos, options.downloadConcurrency, async (video) => {
    await taskCheckpoint(options);
    if (taskShouldStop(options)) return;
    if (video.taskSkipped) return;
    const id = video.id || sanitizeFileName(video.url.split("/").pop() || crypto.randomUUID());
    try {
      if (options.downloadCovers !== false && !video.coverUrl) {
        appendDownloadError(video, "Cover URL unavailable.");
      }
      if (video.coverUrl && options.downloadCovers !== false) {
        await taskCheckpoint(options);
        state.currentMedia += 1;
        emitProgress(options, "download_cover", "Downloading cover", { id, current: state.currentMedia, total: state.totalMedia });
        video.downloadedCoverPath = await downloadToFile(video.coverUrl, mediaPath(options.outputDir, account, `${id}-cover`, video.coverUrl, "jpg"), {
          proxy: options.proxy,
          headers
        });
      }
      if (options.downloadVideos !== false && !video.videoUrl) {
        appendDownloadError(video, "Video download URL unavailable.");
      }
      if (video.videoUrl && options.downloadVideos !== false) {
        await taskCheckpoint(options);
        state.currentMedia += 1;
        emitProgress(options, "download_video", "Downloading video", { id, current: state.currentMedia, total: state.totalMedia });
        video.downloadedVideoPath = await downloadToFile(video.videoUrl, mediaPath(options.outputDir, account, `${id}-video`, video.videoUrl, "mp4"), {
          proxy: options.proxy,
          headers
        });
      }
    } catch (error) {
      appendDownloadError(video, error instanceof Error ? error.message : String(error));
      emitProgress(options, "download_error", "Media download failed", { id, error: video.downloadError }, "error");
    }
  });
}

function appendDownloadError(video: VideoItem, reason: string): void {
  if (!video.downloadError) {
    video.downloadError = reason;
    return;
  }
  if (!video.downloadError.includes(reason)) video.downloadError = `${video.downloadError}; ${reason}`;
}

async function runVideoBatches(
  options: ScrapeOptions,
  videos: VideoItem[],
  phase: "verify" | "download",
  task: (batch: VideoItem[]) => Promise<void>
): Promise<void> {
  const batches = chunkArray(videos, taskBatchSize(options));
  for (let index = 0; index < batches.length; index += 1) {
    await taskCheckpoint(options);
    if (taskShouldStop(options)) break;
    const ok = await runVideoBatchTask(options, batches[index], phase, index + 1, batches.length, async () => {
      await task(batches[index]);
    });
    if (!ok) {
      for (const video of batches[index]) {
        video.taskSkipped = true;
        video.downloadError ||= `Skipped after repeated ${phase} batch failures.`;
      }
    }
  }
}

async function runVideoBatchTask(
  options: ScrapeOptions,
  batch: VideoItem[],
  phase: "verify" | "download",
  current: number,
  total: number,
  task: () => Promise<void>
): Promise<boolean> {
  const attempts = retryAttempts(options);
  let lastError = "";

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    await taskCheckpoint(options);
    if (taskShouldStop(options) && attempt > 1) break;
    emitProgress(options, "batch_start", "Processing video batch", { phase, current, total, count: batch.length, attempt, attempts });
    try {
      await task();
      return true;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (attempt < attempts) {
        emitProgress(options, "batch_retry", "Video batch failed, retrying", { phase, current, total, count: batch.length, attempt, attempts, error: lastError }, "warning");
        await sleep(1000 * attempt);
      }
    }
  }

  emitProgress(options, "batch_skip", "Video batch failed after retries, skipped", { phase, current, total, count: batch.length, error: lastError }, "error");
  return false;
}

function countDownloadableMedia(result: ScrapeResult, options: Pick<ScrapeOptions, "downloadVideos" | "downloadCovers">): number {
  return result.videos.reduce((total, video) => {
    if (video.taskSkipped) return total;
    const coverCount = video.coverUrl && options.downloadCovers !== false ? 1 : 0;
    const videoCount = video.videoUrl && options.downloadVideos !== false ? 1 : 0;
    return total + coverCount + videoCount;
  }, 0);
}

function hasAccountData(account: AccountProfile): boolean {
  return Boolean(
    account.id ||
      account.nickname ||
      account.signature ||
      account.avatarUrl ||
      account.verified !== undefined ||
      account.followerCount !== undefined ||
      account.followingCount !== undefined ||
      account.heartCount !== undefined ||
      account.videoCount !== undefined ||
      account.diggCount !== undefined
  );
}

function filterVideosByTime(videos: VideoItem[], sinceDays?: number): VideoItem[] {
  if (!sinceDays) return videos;
  const minTimestamp = Math.floor(Date.now() / 1000) - sinceDays * 24 * 60 * 60;
  return videos.filter((video) => !video.createTimestamp || video.createTimestamp >= minTimestamp);
}

async function cookieHeaderForDownloads(context: BrowserContext): Promise<string | undefined> {
  const cookies = await context.cookies();
  if (!cookies.length) return undefined;
  return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
}

async function saveResult(result: ScrapeResult, outputDir: string): Promise<void> {
  await mkdir(outputDir, { recursive: true });
  result.failedVideos = collectFailedVideos(result);
  const account = sanitizeFileName(result.account.uniqueId || result.account.nickname || "unknown");
  const timestamp = result.scrapedAt.replace(/[:.]/g, "-");
  await writeFile(join(outputDir, `${account}-${timestamp}.json`), JSON.stringify(result, null, 2), "utf8");
  await writeFile(join(outputDir, `${account}-latest.json`), JSON.stringify(result, null, 2), "utf8");
  if (result.failedVideos.length > 0) {
    result.failedVideosJsonFile = join(outputDir, "failed-videos.json");
    result.failedVideosFile = join(outputDir, "failed-videos.txt");
    await writeFile(result.failedVideosJsonFile, JSON.stringify(result.failedVideos, null, 2), "utf8");
    await writeFile(result.failedVideosFile, result.failedVideos.map((video) => video.url).join("\n"), "utf8");
    await writeFile(join(outputDir, `${account}-${timestamp}.json`), JSON.stringify(result, null, 2), "utf8");
    await writeFile(join(outputDir, `${account}-latest.json`), JSON.stringify(result, null, 2), "utf8");
  }
}

function finalizeFailedVideos(result: ScrapeResult, options: ScrapeOptions): void {
  if (!options.downloadMedia) {
    result.failedVideos = collectFailedVideos(result);
    return;
  }

  for (const video of result.videos) {
    if (video.taskSkipped) continue;
    if (options.downloadCovers !== false && video.coverUrl && !video.downloadedCoverPath) {
      appendDownloadError(video, "Cover was not downloaded.");
    }
    if (options.downloadVideos !== false && video.videoUrl && !video.downloadedVideoPath) {
      appendDownloadError(video, "Video was not downloaded.");
    }
  }
  result.failedVideos = collectFailedVideos(result);
}

function collectFailedVideos(result: ScrapeResult): FailedVideo[] {
  return result.videos
    .filter((video) => Boolean(video.downloadError || video.taskSkipped))
    .map((video) => ({
      id: video.id,
      url: video.url,
      title: video.title || video.desc,
      reason: video.downloadError || "Skipped after repeated task failures."
    }));
}

function runOutputDir(baseDir: string, account: string, scrapedAt: string): string {
  const timestamp = scrapedAt.replace(/[:.]/g, "-");
  return join(baseDir, `${sanitizeFileName(account)}-${timestamp}`);
}

function emitProgress(
  options: ScrapeOptions,
  code: string,
  message: string,
  detail?: Record<string, unknown>,
  level: ProgressEvent["level"] = "info"
): void {
  options.onProgress?.({
    code,
    message,
    detail,
    level,
    timestamp: new Date().toISOString()
  });
}

function parseStateObjects(scripts: Array<{ id: string; text: string }>): unknown[] {
  const parsed: unknown[] = [];

  for (const script of scripts) {
    const text = script.text.trim();
    if (!text) continue;

    if (script.id === "SIGI_STATE" || script.id === "__UNIVERSAL_DATA_FOR_REHYDRATION__") {
      try {
        parsed.push(JSON.parse(text));
        continue;
      } catch {
        // Fall through to regex extraction below.
      }
    }

    for (const pattern of [/SIGI_STATE\s*=\s*(\{.*?\});/s, /__UNIVERSAL_DATA_FOR_REHYDRATION__\s*=\s*(\{.*?\});/s]) {
      const match = text.match(pattern);
      if (!match) continue;
      try {
        parsed.push(JSON.parse(match[1]));
      } catch {
        // Ignore malformed embedded state and continue with DOM-derived fallback data.
      }
    }
  }

  return parsed;
}

function deepFindObjects(values: unknown[], predicate: (value: unknown) => boolean, limit = 400): Array<Record<string, unknown>> {
  const output: Array<Record<string, unknown>> = [];
  const seen = new Set<unknown>();

  const visit = (value: unknown): void => {
    if (output.length >= limit || !value || typeof value !== "object" || seen.has(value)) return;
    seen.add(value);

    if (!Array.isArray(value) && predicate(value)) output.push(value as Record<string, unknown>);

    for (const child of Object.values(value as Record<string, unknown>)) {
      if (child && typeof child === "object") visit(child);
    }
  };

  values.forEach(visit);
  return output;
}

async function runPool<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>): Promise<void> {
  const queue = [...items];
  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      if (!item) return;
      await worker(item);
    }
  });
  await Promise.all(workers);
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asBool(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function firstStringArrayValue(value: unknown): string | undefined {
  return Array.isArray(value) ? value.find((item) => typeof item === "string" && item.trim()) : undefined;
}

function collectUrlStrings(value: unknown): string[] {
  if (typeof value === "string" && value.trim()) return [value.trim()];
  if (Array.isArray(value)) return value.flatMap(collectUrlStrings);
  if (value && typeof value === "object") return Object.values(value).flatMap(collectUrlStrings);
  return [];
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function taskBatchSize(options: ScrapeOptions): number {
  return Math.max(1, options.taskBatchSize || DEFAULT_TASK_BATCH_SIZE);
}

function retryAttempts(options: ScrapeOptions): number {
  return Math.max(1, (options.taskRetries ?? DEFAULT_TASK_RETRIES) + 1);
}

async function taskCheckpoint(options: ScrapeOptions): Promise<void> {
  await options.waitIfPaused?.();
}

function taskShouldStop(options: ScrapeOptions): boolean {
  return Boolean(options.shouldStop?.());
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
