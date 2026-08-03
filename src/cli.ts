#!/usr/bin/env node
import { envBool, envInt, envString } from "./env.js";
import { parseProxyString } from "./proxy.js";
import { scrapeTikTokProfile } from "./tiktok.js";
import type { ScrapeOptions } from "./types.js";

type CliArgs = Record<string, string | boolean>;

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) {
    printHelp();
    return;
  }

  const directProxy = typeof args.proxy === "string" ? parseProxyString(args.proxy) : undefined;

  const options: ScrapeOptions = {
    username: stringArg(args.username) || envString("TIKTOK_DEFAULT_USERNAME"),
    url: stringArg(args.url),
    headless: args.headful === true ? false : envBool("HEADLESS", true),
    maxVideos: intArg(args["max-videos"], envInt("DEFAULT_MAX_VIDEOS", 30)),
    scrollTimes: intArg(args["scroll-times"], 8),
    outputDir: stringArg(args.output) || envString("DEFAULT_OUTPUT_DIR", "data"),
    downloadMedia: args.download === true,
    downloadConcurrency: intArg(args["download-concurrency"], 2),
    taskBatchSize: intArg(args["task-batch-size"], 20),
    taskRetries: intArg(args["task-retries"], 2),
    mediaMode: args["no-watermark"] === true ? "no-watermark" : "watermark",
    trafficMode: args["data-saving"] === true ? "data-saving" : "stable",
    proxy: directProxy
  };

  const result = await scrapeTikTokProfile(options);
  console.log(JSON.stringify(result, null, 2));
}

function parseArgs(argv: string[]): CliArgs {
  const output: CliArgs = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;

    const [rawKey, inlineValue] = token.slice(2).split("=", 2);
    const next = argv[i + 1];
    if (inlineValue !== undefined) {
      output[rawKey] = inlineValue;
    } else if (next && !next.startsWith("--")) {
      output[rawKey] = next;
      i += 1;
    } else {
      output[rawKey] = true;
    }
  }
  return output;
}

function stringArg(value: string | boolean | undefined): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function intArg(value: string | boolean | undefined, fallback: number): number {
  if (typeof value !== "string") return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function printHelp(): void {
  console.log(`TikTok Scraper

Usage:
  npm run scrape -- --username <username> --max-videos 30
  npm run scrape -- --url <profile-url> --download

Options:
  --username <name>              TikTok username, with or without @
  --url <url>                    TikTok profile URL
  --max-videos <number>          Max video records to keep
  --scroll-times <number>        Profile scroll count before extraction
  --download                     Download video files and covers when URLs are available
  --no-watermark                 Prefer likely no-watermark play sources when downloading
  --data-saving                  Block non-essential image/media/font requests when metadata-only
  --download-concurrency <num>   Parallel media downloads, default 2
  --task-batch-size <num>        Split large video work into batches, default 20
  --task-retries <num>           Retry failed batches/videos, default 2
  --output <dir>                 Output directory, default data
  --proxy <proxyUrl>             Override proxy, e.g. http://user:pass@host:port
  --headful                      Show browser window
  --help                         Show this help
`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
