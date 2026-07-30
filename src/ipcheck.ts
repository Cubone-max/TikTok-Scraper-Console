import http from "node:http";
import https from "node:https";
import tls from "node:tls";
import type { IncomingMessage, RequestOptions } from "node:http";
import type { ProxyConfig } from "./types.js";

type IpApiResponse = {
  success?: boolean;
  ip?: string;
  country_code?: string;
  countryCode?: string;
};

export type IpCheckResult = {
  ip: string;
  countryCode: string;
};

const ipLookupUrls = ["https://ipwho.is/", "https://ipapi.co/json/"];

export async function checkPublicIp(proxy?: ProxyConfig): Promise<IpCheckResult> {
  let lastError: unknown;

  for (const url of ipLookupUrls) {
    try {
      const payload = (await requestJson(url, proxy)) as IpApiResponse;
      const ip = payload.ip;
      const countryCode = payload.country_code || payload.countryCode;
      if (ip && countryCode) return { ip, countryCode };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Unable to detect public IP.");
}

function requestJson(url: string, proxy?: ProxyConfig): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const headers = {
      accept: "application/json",
      "user-agent": "tiktok-scraper-console/0.1"
    };

    const finish = (response: IncomingMessage): void => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      response.on("end", () => {
        if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`IP check failed ${response.statusCode}: ${target.hostname}`));
          return;
        }

        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
        } catch (error) {
          reject(error);
        }
      });
      response.on("error", reject);
    };

    if (proxy && target.protocol === "https:" && proxy.server.startsWith("http://")) {
      requestHttpsViaHttpProxy(target, headers, proxy).then(finish, reject);
      return;
    }

    if (proxy) {
      reject(new Error(`IP check only supports HTTP proxy for HTTPS lookup: ${proxy.server}`));
      return;
    }

    const request = https.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port,
        path: `${target.pathname}${target.search}`,
        method: "GET",
        headers,
        timeout: 20_000
      },
      finish
    );
    request.on("timeout", () => request.destroy(new Error(`IP check timeout: ${target.hostname}`)));
    request.on("error", reject);
    request.end();
  });
}

function requestHttpsViaHttpProxy(target: URL, headers: Record<string, string>, proxy: ProxyConfig): Promise<IncomingMessage> {
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
      timeout: 20_000
    });

    connectRequest.on("connect", (connectResponse, socket, head) => {
      if (connectResponse.statusCode !== 200) {
        socket.destroy();
        reject(new Error(`Proxy CONNECT failed ${connectResponse.statusCode}: ${proxy.server}`));
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
          timeout: 20_000
        };

        const request = https.request(requestOptions, resolve);
        request.on("timeout", () => request.destroy(new Error(`IP check timeout: ${target.hostname}`)));
        request.on("error", reject);
        request.end();
      });

      secureSocket.on("error", reject);
    });

    connectRequest.on("timeout", () => connectRequest.destroy(new Error(`Proxy connection timeout: ${proxy.server}`)));
    connectRequest.on("error", reject);
    connectRequest.end();
  });
}
