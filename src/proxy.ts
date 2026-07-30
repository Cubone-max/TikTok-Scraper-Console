import type { ProxyConfig } from "./types.js";

export async function resolveProxy(input: {
  mode?: "local" | "ipcookApi" | "ipcookProxy";
  directProxyUrl?: string;
  ipcookProxyUrl?: string;
  proxyList?: string;
}): Promise<ProxyConfig | undefined> {
  if (input.mode === "local") return undefined;
  const pool = await resolveProxyPool(input);
  return pool[0];
}

export async function resolveProxyPool(input: {
  mode?: "local" | "ipcookApi" | "ipcookProxy";
  directProxyUrl?: string;
  ipcookProxyUrl?: string;
  proxyList?: string;
}): Promise<ProxyConfig[]> {
  if (input.mode === "local") return [];
  const pool: ProxyConfig[] = [];
  if (input.proxyList) pool.push(...parseProxyList(input.proxyList));
  if (input.ipcookProxyUrl) {
    if (looksLikeProviderUrl(input.ipcookProxyUrl)) {
      pool.push(...await fetchProxyPoolFromProviderUrl(normalizeProxyProviderUrl(input.ipcookProxyUrl)));
    } else {
      pool.push(...parseProxyList(input.ipcookProxyUrl));
    }
  }
  if (input.directProxyUrl) pool.push(...parseProxyList(input.directProxyUrl));
  const proxies = dedupeProxies(pool);
  if (input.mode && !proxies.length) {
    throw new Error("No valid proxy was found. Check the IPCook API response or proxy list format.");
  }
  return proxies;
}

export async function fetchProxyFromProviderUrl(url: string): Promise<ProxyConfig> {
  const pool = await fetchProxyPoolFromProviderUrl(url);
  if (!pool.length) throw new Error("IPCook proxy response returned no recognizable proxy.");
  return pool[0];
}

export async function fetchProxyPoolFromProviderUrl(url: string): Promise<ProxyConfig[]> {
  const response = await fetch(url, {
    headers: {
      accept: "application/json,text/plain,*/*",
      "user-agent": "tiktok-scraper-console/0.1"
    }
  });

  if (!response.ok) {
    throw new Error(`IPCook proxy request failed: ${response.status} ${response.statusText}`);
  }

  const bodyText = await response.text();
  const proxyTexts = pickProxyTexts(bodyText);
  if (!proxyTexts.length) {
    throw new Error(`IPCook proxy response returned no recognizable proxy: ${bodyText.slice(0, 300)}`);
  }

  const protocol = new URL(url).searchParams.get("protocol") || "http";
  return dedupeProxies(proxyTexts.map((proxyText) => parseFlexibleProxyString(proxyText, protocol)).filter((proxy): proxy is ProxyConfig => Boolean(proxy)));
}

export function normalizeProxyProviderUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  if (!url.searchParams.get("g") || url.searchParams.get("g") === "undefined") {
    url.searchParams.set("g", process.env.IPCOOK_COUNTRY || "US");
  }
  return url.toString();
}

function pickProxyTexts(bodyText: string): string[] {
  const trimmed = bodyText.trim();
  if (!trimmed) return [];

  try {
    const payload = JSON.parse(trimmed) as unknown;
    const data = getRecordValue(payload, "data") ?? payload;
    const candidates = collectStrings(data);
    return candidates.filter((item) => item.includes(":"));
  } catch {
    return splitProxyLines(trimmed).filter((item) => item.includes(":"));
  }
}

function parseIpcookProxy(raw: string, sourceUrl: string): ProxyConfig {
  const protocol = new URL(sourceUrl).searchParams.get("protocol") || "http";
  const proxy = parseFlexibleProxyString(raw, protocol);
  if (!proxy) throw new Error(`Unable to parse IPCook proxy format: ${raw}`);
  return proxy;
}

function parseFlexibleProxyString(raw: string, protocol = "http"): ProxyConfig | undefined {
  const input = raw.trim();
  if (!input) return undefined;

  if (/^[a-z]+:\/\//i.test(input)) return parseUrlProxy(input);

  const atParts = input.split("@");
  if (atParts.length === 2) {
    const left = atParts[0].split(":");
    const right = atParts[1].split(":");
    if (left.length >= 2 && right.length >= 2) {
      if (isPort(left[1])) {
        if (!isUsableHost(left[0])) return undefined;
        return { server: `${protocol}://${left[0]}:${left[1]}`, username: right[0], password: right.slice(1).join(":") };
      }
      if (isPort(right[1])) {
        if (!isUsableHost(right[0])) return undefined;
        return { server: `${protocol}://${right[0]}:${right[1]}`, username: left[0], password: left.slice(1).join(":") };
      }
    }
  }

  const parts = input.replace(/^https?:\/\//, "").replace(/^socks5:\/\//, "").split(":");

  if (parts.length >= 4) {
    if (isPort(parts[1])) {
      const [host, port, username] = parts;
      if (!isUsableHost(host)) return undefined;
      return { server: `${protocol}://${host}:${port}`, username, password: parts.slice(3).join(":") };
    }
    if (isPort(parts[3])) {
      const [username, password, host, port] = parts;
      if (!isUsableHost(host)) return undefined;
      return { server: `${protocol}://${host}:${port}`, username, password };
    }
  }

  if (parts.length >= 2) {
    const [host, port] = parts;
    if (!isUsableHost(host) || !isPort(port)) return undefined;
    return { server: `${protocol}://${host}:${port}` };
  }

  return undefined;
}

function collectStrings(value: unknown): string[] {
  if (typeof value === "string") return value.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean);
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (value && typeof value === "object") return Object.values(value).flatMap(collectStrings);
  return [];
}

function getRecordValue(value: unknown, key: string): unknown {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>)[key] : undefined;
}

export function parseProxyString(raw: string): ProxyConfig | undefined {
  return parseFlexibleProxyString(raw);
}

export function parseProxyList(raw: string): ProxyConfig[] {
  return dedupeProxies(splitProxyLines(raw).map((line) => parseFlexibleProxyString(line)).filter((proxy): proxy is ProxyConfig => Boolean(proxy)));
}

function parseUrlProxy(input: string): ProxyConfig | undefined {
  try {
    const withProtocol = /^[a-z]+:\/\//i.test(input) ? input : `http://${input}`;
    const url = new URL(withProtocol);
    if (!isUsableHost(url.hostname) || !isPort(url.port)) return undefined;
    return {
      server: `${url.protocol}//${url.hostname}:${url.port}`,
      username: url.username ? decodeURIComponent(url.username) : undefined,
      password: url.password ? decodeURIComponent(url.password) : undefined
    };
  } catch {
    return undefined;
  }
}

function splitProxyLines(raw: string): string[] {
  return raw
    .split(/\r?\n|,|，|\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function dedupeProxies(proxies: ProxyConfig[]): ProxyConfig[] {
  const seen = new Set<string>();
  return proxies.filter((proxy) => {
    const key = `${proxy.server}|${proxy.username || ""}|${proxy.password || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function looksLikeProviderUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim()) && value.includes("?");
}

function isPort(value: string): boolean {
  const port = Number.parseInt(value, 10);
  return Number.isInteger(port) && port > 0 && port <= 65535;
}

function isUsableHost(value: string): boolean {
  const host = value.trim().toLowerCase();
  return Boolean(host) && host !== "undefined" && host !== "null";
}
