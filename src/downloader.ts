import { createWriteStream } from "node:fs";
import { mkdir, rename, rm, stat } from "node:fs/promises";
import http from "node:http";
import https from "node:https";
import { dirname } from "node:path";
import tls from "node:tls";
import type { IncomingHttpHeaders, IncomingMessage, RequestOptions } from "node:http";
import type { ProxyConfig } from "./types.js";

export type DownloadOptions = {
  proxy?: ProxyConfig;
  headers?: Record<string, string>;
  retries?: number;
  timeoutMs?: number;
};

type StreamResponse = {
  statusCode: number;
  headers: IncomingHttpHeaders;
  stream: IncomingMessage;
};

export async function downloadToFile(url: string, targetPath: string, options: DownloadOptions = {}): Promise<string> {
  await mkdir(dirname(targetPath), { recursive: true });
  if ((await fileSize(targetPath)) > 0) return targetPath;

  const partPath = `${targetPath}.part`;
  const retries = options.retries ?? 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await downloadOnce(url, targetPath, partPath, options);
      return targetPath;
    } catch (error) {
      lastError = error;
      if (attempt < retries) await sleep(1000 * attempt);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function downloadOnce(url: string, targetPath: string, partPath: string, options: DownloadOptions): Promise<void> {
  const existingSize = await fileSize(partPath);
  const headers: Record<string, string> = {
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    referer: "https://www.tiktok.com/",
    ...options.headers
  };

  if (existingSize > 0) headers.range = `bytes=${existingSize}-`;

  const response = await requestStream(url, headers, options);
  if (![200, 206].includes(response.statusCode)) {
    response.stream.resume();
    throw new Error(`下载失败 ${response.statusCode}: ${url}`);
  }

  const append = existingSize > 0 && response.statusCode === 206;
  if (existingSize > 0 && response.statusCode === 200) {
    await rm(partPath, { force: true });
  }

  await pipeToFile(response.stream, partPath, append);
  await assertComplete(partPath, response.headers, append ? existingSize : 0);
  await rename(partPath, targetPath);
}

function requestStream(url: string, headers: Record<string, string>, options: DownloadOptions, redirects = 0): Promise<StreamResponse> {
  if (redirects > 5) throw new Error(`重定向次数过多: ${url}`);

  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const timeoutMs = options.timeoutMs ?? 90_000;
    const finish = (response: IncomingMessage): void => {
      const location = response.headers.location;
      if (location && [301, 302, 303, 307, 308].includes(response.statusCode || 0)) {
        response.resume();
        const nextUrl = new URL(location, target).toString();
        requestStream(nextUrl, headers, options, redirects + 1).then(resolve, reject);
        return;
      }

      resolve({ statusCode: response.statusCode || 0, headers: response.headers, stream: response });
    };

    if (options.proxy && target.protocol === "https:" && options.proxy.server.startsWith("http://")) {
      requestHttpsViaHttpProxy(target, headers, options.proxy, timeoutMs).then(finish, reject);
      return;
    }

    const client = target.protocol === "https:" ? https : http;
    const request = client.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port,
        path: `${target.pathname}${target.search}`,
        method: "GET",
        headers,
        timeout: timeoutMs
      },
      finish
    );

    request.on("timeout", () => request.destroy(new Error(`下载超时: ${url}`)));
    request.on("error", reject);
    request.end();
  });
}

function requestHttpsViaHttpProxy(
  target: URL,
  headers: Record<string, string>,
  proxy: ProxyConfig,
  timeoutMs: number
): Promise<IncomingMessage> {
  return new Promise((resolve, reject) => {
    const proxyUrl = new URL(proxy.server);
    const proxyHeaders: Record<string, string> = {};
    const username = proxy.username || proxyUrl.username;
    const password = proxy.password || proxyUrl.password;
    if (username || password) {
      proxyHeaders["proxy-authorization"] = `Basic ${Buffer.from(`${decodeURIComponent(username)}:${decodeURIComponent(password)}`).toString("base64")}`;
    }

    const connectRequest = http.request({
      host: proxyUrl.hostname,
      port: Number(proxyUrl.port || 80),
      method: "CONNECT",
      path: `${target.hostname}:${target.port || 443}`,
      headers: proxyHeaders,
      timeout: timeoutMs
    });

    connectRequest.on("connect", (connectResponse, socket, head) => {
      if (connectResponse.statusCode !== 200) {
        socket.destroy();
        reject(new Error(`代理 CONNECT 失败 ${connectResponse.statusCode}: ${proxy.server}`));
        return;
      }
      if (head.length > 0) socket.unshift(head);

      const secureSocket = tls.connect({
        socket,
        servername: target.hostname
      });

      secureSocket.on("secureConnect", () => {
        const requestOptions: RequestOptions = {
          host: target.hostname,
          path: `${target.pathname}${target.search}`,
          method: "GET",
          headers,
          createConnection: () => secureSocket,
          timeout: timeoutMs
        };

        const request = https.request(requestOptions, resolve);
        request.on("timeout", () => request.destroy(new Error(`下载超时: ${target.toString()}`)));
        request.on("error", reject);
        request.end();
      });

      secureSocket.on("error", reject);
    });

    connectRequest.on("timeout", () => connectRequest.destroy(new Error(`代理连接超时: ${proxy.server}`)));
    connectRequest.on("error", reject);
    connectRequest.end();
  });
}

function pipeToFile(stream: IncomingMessage, targetPath: string, append: boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(targetPath, { flags: append ? "a" : "w" });
    stream.pipe(file);
    stream.on("error", reject);
    file.on("finish", resolve);
    file.on("error", reject);
  });
}

async function assertComplete(partPath: string, headers: IncomingHttpHeaders, offset: number): Promise<void> {
  const expectedSize = getExpectedSize(headers, offset);
  if (!expectedSize) return;

  const actualSize = await fileSize(partPath);
  if (actualSize !== expectedSize) {
    throw new Error(`文件不完整: expected=${expectedSize}, actual=${actualSize}`);
  }
}

function getExpectedSize(headers: IncomingHttpHeaders, offset: number): number | undefined {
  const contentRange = Array.isArray(headers["content-range"]) ? headers["content-range"][0] : headers["content-range"];
  const rangeMatch = contentRange?.match(/\/(\d+)$/);
  if (rangeMatch) return Number.parseInt(rangeMatch[1], 10);

  const contentLength = Array.isArray(headers["content-length"]) ? headers["content-length"][0] : headers["content-length"];
  const length = contentLength ? Number.parseInt(contentLength, 10) : undefined;
  return Number.isFinite(length) && length !== undefined ? offset + length : undefined;
}

async function fileSize(path: string): Promise<number> {
  try {
    return (await stat(path)).size;
  } catch {
    return 0;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
