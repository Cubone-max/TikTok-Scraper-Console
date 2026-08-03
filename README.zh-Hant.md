<div align="center">

# TikTok Scraper Console

### TikTok 帳號資料擷取與影片下載工具

![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-browser%20automation-2EAD33?logo=playwright&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue)

[English](README.md) | 繁體中文

</div>

---

## 🤝 贊助

<div align="center">
  <a href="https://www.ipcook.com/?ref=IKGXS6">
    <img src="docs/ipcook-sponsor-banner.png" alt="IPCook 贊助 banner" />
  </a>
</div>

使用 IPcook 的 55M+ 高品質住宅代理，讓你的 TikTok 資料擷取更容易擴展。IPcook 透過高品質代理與智慧自動輪換，協助降低請求限制與封鎖風險。

IPcook 價格從 $2 到 $3.2/G 起，提供具競爭力的代理方案，並提供 100 MB 免費試用。

## ✨ 這是什麼？

`TikTok Scraper Console` 是一個可在本機執行的 TikTok 公開資料擷取工具，使用 Playwright 無頭瀏覽器載入 TikTok 頁面，整理帳號資料、影片資料、互動數據，並可選擇下載影片與封面。

它提供一個簡潔的網頁控制台，適合非技術使用者操作；也保留 CLI 模式，方便自動化或批量任務使用。

> 本工具只適合擷取你擁有、已獲授權，或合法可使用的公開內容。請遵守 TikTok 服務條款與所在地法律。

## 📸 介面截圖

### 英文網頁控制台

![英文網頁控制台](docs/screenshots/english-ui.png)

### 繁體中文網頁控制台

![繁體中文網頁控制台](docs/screenshots/traditional-chinese-ui.png)

### 任務進度與控制

![任務進度與控制](docs/screenshots/task-progress-panel.png)

可在執行結果區查看每個擷取步驟、錯誤訊息、暫停與繼續任務，也可以要求任務在目前影片完成後結束。

### 擷取資料輸出

![擷取資料輸出範例](docs/screenshots/scraped-data-example.png)

### 下載媒體輸出

擷取完成後，勾選保存的影片與封面會輸出到本次任務資料夾。

![下載後的影片與封面檔案](docs/screenshots/download.png)

### IPCook 代理 API 連結頁

[![IPCook API 連結頁](docs/screenshots/ipcook-api-page.png)](https://www.ipcook.com/?ref=IKGXS6)

## 🚀 主要功能

| 功能 | 說明 |
| --- | --- |
| 🖥️ 網頁控制台 | 本機啟動後打開 `http://localhost:6767` 操作 |
| 🌐 雙語介面 | 支援繁體中文與英文切換 |
| 🔌 全域連線設定 | 可選本地直連、IPCook API 連結，或 IPCook 代理列表 |
| 🧾 批量代理識別 | 可貼上常見代理格式，工具會自動轉換為可用配置 |
| 🧭 出口 IP 檢測 | 顯示目前出口 IP 與國家代碼，例如 `ip: 1.2.3.4 US` |
| 👤 主頁資料擷取 | 擷取帳號名稱、暱稱、粉絲數、簡介、影片列表等 |
| 🚦 主頁資料流量模式 | 穩定模式保留完整頁面載入；省流模式僅在不下載影片與封面時適用 |
| 🎬 影片資料擷取 | 擷取發布時間、播放量、點讚數、評論數、分享數、收藏數、標題等 |
| 🖼️ 封面下載 | 封面保存為 `jpg` 或 `png` 圖片格式 |
| 📥 影片下載 | 支援帶水印版本與優先無水印版本 |
| 🔗 單條影片下載 | 輸入單條影片連結，單獨下載影片、封面或資料 |
| 📚 批量影片下載 | 一次貼上多條影片連結，一行一條批量處理 |
| 🧩 自訂欄位 | 勾選需要的資料欄位，未勾選的不輸出 |
| 📅 時間篩選 | 支援近 1 週、近 30 天、近 60 天、自訂天數、全部時間 |
| 📊 任務進度 | 顯示正在載入、正在解析、正在下載、錯誤與完成狀態 |
| ⏸️ 暫停與繼續 | 可暫停執行中的任務，之後從下一個安全節點繼續 |
| 🛑 跑完目前影片後結束 | 可要求任務在目前影片處理完成後保存結果並結束 |
| ♻️ 失敗重試 | 大任務自動拆批，失敗後重試，仍失敗則跳過並繼續 |
| 📝 失敗清單 | 失敗影片會整理到 `failed-videos.txt`，方便再次批量下載 |

## 🆕 最近更新

- 已將 IPCook 贊助 banner 更新為最新 PNG 圖片。
- 新增下載媒體輸出截圖，方便確認成功擷取後本機保存的 MP4 影片與封面檔案。
- 新增僅適用於主頁元資料擷取的流量模式：
  - `穩定模式`：保留原本完整頁面載入方式，兼容性較高。
  - `省流模式`：只有在不下載影片與封面時可用；擷取元資料時會阻擋非必要的圖片、媒體與字型請求，以降低代理流量。
- 優化主頁滾動邏輯。當已取得使用者指定的影片數量時，不再固定跑滿所有滾動輪數；若帳號實際發布影片少於使用者設定數量，也會在沒有更多影片時提前停止。
- 只擷取元資料時不再驗證影片下載源，避免在不下載影片的情況下產生額外請求。
- 重新整理網頁介面的間距與對齊，包括主頁擷取控制、流量模式位置、輸入框文字位置，以及單條影片 URL 輸入框高度。

## 🖥️ 運行環境

請先確認你的電腦已具備以下環境：

| 環境 | 要求 |
| --- | --- |
| 作業系統 | Windows 10/11、macOS、Linux |
| Node.js | `20` 或更高版本 |
| npm | 隨 Node.js 安裝即可 |
| 無頭瀏覽器 | Playwright Chromium |
| 網路環境 | 可正常訪問 TikTok，或可使用代理 / IPCook |

### 必須安裝的瀏覽器

本工具不是直接使用你電腦上的 Chrome，而是使用 Playwright 管理的 Chromium 無頭瀏覽器。

首次安裝依賴後，請執行：

```bash
npx playwright install chromium
```

Linux 伺服器或 Docker 環境如果缺少瀏覽器系統依賴，請使用：

```bash
npx playwright install --with-deps chromium
```

### 可選環境

- Git：用於 clone 專案與版本管理
- 代理服務：用於 TikTok 地區限制或網路不穩定時切換出口 IP
- IPCook 代理連結：可在網頁端填入，但本專案不內建任何 IPCook 帳號或私密憑證

## 📦 安裝

### 1. 下載專案

```bash
git clone <your-repository-url>
cd tiktok-scraper-console
```

### 2. 安裝依賴

```bash
npm install
```

### 3. 安裝 Playwright Chromium

```bash
npx playwright install chromium
```

## ⚡ 快速啟動

### Windows 一鍵啟動

雙擊：

```text
start-web.bat
```

腳本會自動：

- 檢查 Node.js 與 npm
- 安裝依賴，若尚未安裝
- 建置 TypeScript
- 啟動本機網頁控制台
- 打開 `http://localhost:6767`

### 命令列啟動

```bash
npm run web
```

然後打開：

```text
http://localhost:6767
```

## 🧑‍💻 網頁端使用方式

### 1. 設定連線方式

最上方的「全域連線設定」會套用到所有任務：

- `本地直連下載`：使用目前電腦網路直接訪問 TikTok
- `使用 IPCook API（推薦）`：只能填入 IPCook API 連結，例如 `https://www.ipcook.com/api/dynamic/genips?...`
- `使用 IPCook 代理`：在代理列表貼上一條或多條代理，支援 `HOST:PORT:USER:PASS`、`HOST:PORT@USER:PASS`、`USER:PASS:HOST:PORT`、`USER:PASS@HOST:PORT`。

點擊「檢測出口 IP」可以確認目前任務會使用的出口網路。

當 TikTok 頁面多次重試後仍無法打開，且還有其他代理可用時，任務會自動切換到下一個代理，並從安全節點重新開始同一任務。

### 2. 主頁資料擷取

輸入 TikTok 主頁連結，格式如下：

```text
https://www.tiktok.com/@<username>
```

可選項目：

- 最大影片數
- 影片時間範圍
- 是否保存影片 MP4
- 是否保存封面 JPG/PNG
- 帶水印或優先無水印
- 需要輸出的資料欄位
- 資料流量模式：`穩定模式` 保留正常頁面載入；`省流模式` 僅用於主頁元資料擷取，會阻擋非必要資源以降低代理流量

任務執行時，執行結果區會顯示即時進度。`暫停` 會在下一個安全節點暫停，`繼續` 會恢復任務，`結束` 會在目前影片處理完成後保存目前結果並停止。

### 3. 單條影片下載

輸入單條 TikTok 影片連結，格式如下：

```text
https://www.tiktok.com/@<username>/video/<video_id>
```

可選擇只保存資料、只保存封面、只保存影片，或全部保存。

### 4. 批量影片下載

一次貼上多條影片連結，每行一條：

```text
https://www.tiktok.com/@<username>/video/<video_id>
https://www.tiktok.com/@<username>/video/<video_id>
https://www.tiktok.com/@<username>/video/<video_id>
```

批量任務會自動去重。單條失敗時會重試，仍失敗則跳過並繼續下一條。

## 🧰 CLI 使用

擷取主頁：

```bash
npm run scrape -- --url "<profile-url>" --max-videos 30
```

以較低代理流量擷取資料：

```bash
npm run scrape -- --url "<profile-url>" --max-videos 100 --data-saving
```

下載影片與封面：

```bash
npm run scrape -- --url "<profile-url>" --download --max-videos 10
```

優先嘗試無水印來源：

```bash
npm run scrape -- --url "<profile-url>" --download --no-watermark --max-videos 10
```

顯示瀏覽器，方便除錯：

```bash
npm run scrape -- --url "<profile-url>" --headful
```

大任務分批與重試：

```bash
npm run scrape -- --url "<profile-url>" --download --max-videos 100 --task-batch-size 20 --task-retries 2
```

常用參數：

| 參數 | 說明 |
| --- | --- |
| `--username <name>` | TikTok 使用者名稱，可不帶 `@` |
| `--url <url>` | TikTok 主頁連結 |
| `--max-videos <number>` | 最大影片數 |
| `--scroll-times <number>` | 主頁最大滾動輪數；取得足夠影片或沒有更多影片時會提前停止 |
| `--download` | 下載影片與封面 |
| `--no-watermark` | 優先使用疑似無水印影片來源 |
| `--data-saving` | 只抓資料時阻擋圖片、媒體與字型請求 |
| `--download-concurrency <num>` | 媒體下載並發數 |
| `--task-batch-size <num>` | 大任務分批大小，預設 `20` |
| `--task-retries <num>` | 批次或影片失敗後重試次數，預設 `2` |
| `--output <dir>` | 輸出資料夾 |
| `--proxy <proxyUrl>` | CLI 代理，例如 `http://user:pass@host:port` |
| `--headful` | 顯示瀏覽器視窗 |

## ⚙️ 環境變數

複製範例設定：

```bash
cp .env.example .env
```

可用設定：

```env
TIKTOK_DEFAULT_USERNAME=tiktok
HEADLESS=true
DEFAULT_OUTPUT_DIR=data
DEFAULT_MAX_VIDEOS=30
PROXY_URL=http://user:pass@host:port
```

說明：

- 網頁端只有在選擇代理模式時才會送出代理資訊
- 本地直連模式會忽略並清空代理輸入
- 不建議把私密代理連結提交到 GitHub

## 📁 輸出結構

每次任務會建立新的輸出資料夾，名稱由帳號或任務名稱加上執行時間組成：

```text
data/<account-or-task-name>-<timestamp>/
```

典型輸出：

```text
<run-folder>/
  <account>-<timestamp>.json
  <account>-latest.json
  failed-videos.txt
  failed-videos.json
  downloads/
    <video-id>-video.mp4
    <video-id>-cover.jpg
```

如果沒有失敗影片，則不會產生 `failed-videos.txt` 與 `failed-videos.json`。

## 🧾 結果範例

```json
{
  "scrapedAt": "2026-07-29T12:00:00.000Z",
  "profileUrl": "https://www.tiktok.com/...",
  "account": {
    "uniqueId": "example",
    "nickname": "Example",
    "signature": "Creator bio",
    "followerCount": 1000
  },
  "videos": [
    {
      "id": "1234567890",
      "url": "https://www.tiktok.com/...",
      "title": "Video caption",
      "createTime": "2026-07-29T12:00:00.000Z",
      "playCount": 100000,
      "diggCount": 10000,
      "commentCount": 100,
      "coverUrl": "https://...",
      "videoUrl": "https://...",
      "videoUrlVerified": true,
      "downloadedVideoPath": "data/example-2026-07-29T12-00-00-000Z/downloads/1234567890-video.mp4",
      "downloadedCoverPath": "data/example-2026-07-29T12-00-00-000Z/downloads/1234567890-cover.jpg"
    }
  ],
  "failedVideos": []
}
```

## 🧯 失敗處理

TikTok 可能因地區、網路、登入狀態、風控、簽名 URL 過期等原因導致任務失敗。工具會盡量自動處理：

- 主頁影片數較多時，自動拆成多個批次處理
- 批次失敗後會重試
- 重試仍失敗則跳過該批次，繼續下一批
- 批量影片下載中，單條失敗不會中斷整個任務
- 失敗影片會整理到 `failedVideos`
- 可直接複製 `failed-videos.txt` 內容，貼回批量影片下載再次嘗試

## 🧱 專案結構

```text
public/
  index.html       Web console layout
  styles.css       Web UI styles
  app.js           Web UI behavior
src/
  cli.ts           CLI entry
  server.ts        Local web server and API routes
  tiktok.ts        TikTok scraping and media capture logic
  downloader.ts    Streamed media downloader
  proxy.ts         Proxy helpers
  ipcheck.ts       Exit IP check
  env.ts           Environment helpers
  types.ts         Shared TypeScript types
  utils.ts         File and URL utilities
```

## ❓ 常見問題

### 可以下載無水印影片嗎？

可以選擇「優先無水印」。工具會優先嘗試 TikTok 暴露的可播放來源；如果沒有可用來源，會回退到其他可下載影片來源。無水印不是保證結果。

### 為什麼前端結果只顯示 `https://www.tiktok.com/...`？

為了提高可讀性，前端會遮罩遠端來源連結；本地輸出路徑、下載路徑、失敗清單路徑仍會完整顯示。實際 JSON 檔與 `failed-videos.txt` 會保存完整影片連結。

### 韓國、台灣、美國等不同地區連結可以使用嗎？

可以嘗試。TikTok 內容是否可讀取主要取決於出口 IP、地區限制、帳號可見性與 TikTok 風控。建議先使用「檢測出口 IP」確認代理是否生效。

### 最大影片數越大越好嗎？

不是。影片數越大，頁面載入、URL 校驗與下載時間都會增加，也更容易遇到風控或網路超時。工具已加入自動分批與重試，但仍建議分段執行大任務。

## ⚠️ 免責聲明

本專案僅供學習、研究與合法資料整理使用。使用者需要自行確認擷取與下載行為符合平台條款、內容授權與所在地法律。作者不對任何濫用、侵權、帳號風控、資料遺失或第三方服務限制負責。
