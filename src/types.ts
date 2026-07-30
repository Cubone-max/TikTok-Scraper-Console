export type ProxyConfig = {
  server: string;
  username?: string;
  password?: string;
};

export type AccountProfile = {
  id?: string;
  uniqueId?: string;
  nickname?: string;
  signature?: string;
  avatarUrl?: string;
  verified?: boolean;
  followingCount?: number;
  followerCount?: number;
  heartCount?: number;
  videoCount?: number;
  diggCount?: number;
};

export type VideoItem = {
  id?: string;
  url: string;
  title?: string;
  desc?: string;
  createTime?: string;
  createTimestamp?: number;
  playCount?: number;
  diggCount?: number;
  commentCount?: number;
  shareCount?: number;
  collectCount?: number;
  coverUrl?: string;
  videoUrl?: string;
  videoUrlSource?: "playAddr" | "downloadAddr" | "bitRate" | "mediaResponse";
  videoUrlCandidates?: VideoUrlCandidate[];
  videoUrlVerified?: boolean;
  videoUrlStatus?: number;
  videoUrlContentType?: string;
  downloadedVideoPath?: string;
  downloadedCoverPath?: string;
  downloadError?: string;
  taskSkipped?: boolean;
};

export type FailedVideo = {
  id?: string;
  url: string;
  title?: string;
  reason: string;
};

export type VideoUrlCandidate = {
  url: string;
  source: NonNullable<VideoItem["videoUrlSource"]>;
  noWatermarkLikely: boolean;
};

export type ScrapeResult = {
  scrapedAt: string;
  profileUrl: string;
  account: AccountProfile;
  videos: VideoItem[];
  failedVideos?: FailedVideo[];
  failedVideosFile?: string;
  failedVideosJsonFile?: string;
  outputDir?: string;
};

export type ProgressEvent = {
  code: string;
  message: string;
  detail?: Record<string, unknown>;
  level?: "info" | "success" | "warning" | "error";
  timestamp: string;
};

export type ScrapeOptions = {
  username?: string;
  url?: string;
  headless: boolean;
  maxVideos: number;
  scrollTimes: number;
  outputDir: string;
  downloadMedia: boolean;
  downloadVideos?: boolean;
  downloadCovers?: boolean;
  downloadConcurrency: number;
  taskBatchSize: number;
  taskRetries: number;
  mediaMode: "watermark" | "no-watermark";
  sinceDays?: number;
  proxy?: ProxyConfig;
  proxyPool?: ProxyConfig[];
  onProgress?: (event: ProgressEvent) => void;
  waitIfPaused?: () => Promise<void>;
  shouldStop?: () => boolean;
};
