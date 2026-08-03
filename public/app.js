const i18n = {
  zh: {
    eyebrow: "TikTok Scraper",
    title: "TikTok 資料擷取與下載控制台",
    intro: "先設定連線方式，再選擇主頁擷取、單條影片下載或批量影片下載。下載選項會依照每個任務模組套用到該任務內的全部影片。",
    notice: "請只擷取你擁有或已取得授權的公開內容。影片來源連結會過期，建議直接下載到本地。",
    connectionTitle: "全域連線設定",
    connectionSub: "這裡的本地直連或 IPCook 代理會套用到下方所有任務。",
    checkIp: "檢測出口 IP",
    checkingIp: "正在檢測出口 IP...",
    ipIdle: "ip: 尚未檢測 --",
    ipError: "ip: 檢測失敗 --",
    profileTitle: "主頁資料擷取",
    profileSub: "適合批量取得帳號基本資料、影片數據、封面與影片檔案。",
    runScrape: "開始擷取",
    profileUrl: "TikTok 主頁連結",
    maxVideos: "最大影片數",
    networkMode: "連線方式",
    localMode: "本地直連下載",
    ipcookLink: "获取API link（免费试用）",
    ipcookApiMode: "使用 IPCook API（推薦）",
    ipcookProxyMode: "使用 IPCook 代理",
    ipcookPlaceholder: "https://www.ipcook.com/api/dynamic/genips?...",
    proxyListPlaceholder: "HOST:PORT:USER:PASS\nHOST:PORT@USER:PASS\nUSER:PASS:HOST:PORT\nUSER:PASS@HOST:PORT",
    ipcookUrl: "IPCook API 連結（僅 IPCook API 模式使用）",
    proxyList: "IPCook 代理列表（自動識別格式，打開失敗會自動切換）",
    metadataTrafficMode: "資料流量模式",
    stableMode: "穩定模式",
    dataSavingMode: "省流模式",
    dataSavingNote: "僅適用於不下載影片與封面的主頁元資料擷取；關閉媒體保存後可減少代理流量。",
    timeRange: "影片時間範圍",
    last7: "近 1 週",
    last30: "近 30 天",
    last60: "近 60 天",
    allTime: "全部時間",
    customDays: "自訂天數",
    downloadOptions: "本地保存檔案",
    fileTypes: "檔案類型",
    videoVersion: "影片版本",
    downloadVideos: "影片 MP4",
    downloadCovers: "封面 JPG/PNG",
    watermark: "帶水印",
    noWatermark: "優先無水印",
    fieldSelect: "自訂擷取內容",
    fieldAccount: "帳號資料",
    fieldVideoData: "影片資料",
    fieldTitle: "影片標題",
    fieldCreateTime: "發布時間",
    fieldPlay: "播放量",
    fieldLike: "點讚數",
    fieldComment: "評論數",
    fieldShare: "分享數",
    fieldCollect: "收藏數",
    fieldCover: "封面",
    fieldVideoUrl: "影片下載來源",
    singleTitle: "單條影片下載",
    singleSub: "貼上單條 TikTok 影片連結，可分別選擇保存影片資料、封面圖片與影片檔案。",
    downloadSingle: "下載單條影片",
    singleUrl: "單條影片連結",
    singleOptions: "單條影片選項",
    batchTitle: "批量影片下載",
    batchSub: "一次貼上多條 TikTok 影片連結，每行一條；下方選項會套用到全部影片。",
    downloadBatch: "批量下載影片",
    batchUrls: "批量影片連結",
    batchOptions: "批量下載選項",
    singleVideoData: "影片資料 JSON",
    singleDownloadVideo: "影片 MP4",
    singleDownloadCover: "封面 JPG/PNG",
    resultTitle: "執行結果",
    progressTitle: "任務進度",
    jsonTitle: "整理後結果",
    idle: "等待任務開始。",
    copy: "複製結果",
    pauseTask: "暫停",
    resumeTask: "繼續",
    queued: "任務已建立，等待開始。",
    running: "任務執行中，請稍候。",
    paused: "任務已暫停。",
    done: "任務完成。",
    failed: "任務失敗，請查看錯誤訊息。",
    copied: "結果已複製。",
    codes: {
      task_started: "任務已開始",
      task_pause_requested: "任務暫停中",
      task_resumed: "任務已繼續",
      proxy_start: "正在準備連線方式",
      proxy_ready: "連線方式已就緒",
      traffic_saving_enabled: "省流模式已啟用",
      proxy_using: "正在使用代理",
      proxy_switch: "頁面打開失敗，正在切換代理",
      launch_browser: "正在啟動瀏覽器",
      open_profile: "正在開啟 TikTok 主頁",
      open_video: "正在開啟 TikTok 影片",
      page_open_retry: "頁面無法開啟，等待後重試",
      page_open_failed: "頁面最終無法開啟",
      profile_loaded: "主頁已載入",
      scroll_profile: "影片載入進度",
      parse_profile: "正在解析帳號與影片資料",
      parse_video: "正在解析單條影片資料",
      batch_links_found: "已取得批量影片連結",
      batch_video_error: "單條影片處理失敗",
      batch_start: "正在處理任務批次",
      batch_retry: "任務批次失敗，正在重試",
      batch_skip: "任務批次仍失敗，已跳過",
      item_retry: "影片任務失敗，正在重試",
      item_skip: "影片任務仍失敗，已跳過",
      videos_found: "已取得影片列表",
      no_videos_found: "未取得任何影片",
      profile_empty: "未取得帳號或影片資料",
      verify_video_urls: "正在檢測影片下載來源",
      download_start: "開始下載已選擇的媒體",
      download_cover: "正在下載封面",
      download_video: "正在下載影片",
      download_error: "下載時發生錯誤",
      failed_videos_ready: "已整理失敗影片清單",
      save_result: "正在保存結果檔案",
      complete: "擷取流程完成",
      task_success: "任務完成",
      task_error: "任務失敗"
    },
    detailLabels: {
      url: "連結",
      count: "數量",
      current: "目前",
      total: "總數",
      id: "影片 ID",
      outputDir: "輸出資料夾",
      server: "代理",
      phase: "階段",
      attempt: "目前嘗試",
      attempts: "最多嘗試",
      error: "錯誤"
    }
  },
  en: {
    eyebrow: "TikTok Scraper",
    title: "TikTok Scraping and Download Console",
    intro: "Set the connection method first, then choose profile scrape, single video download, or batch video download. Each task module applies its selected download options to every video in that task.",
    notice: "Only scrape public content you own or are authorized to use. Video source URLs expire, so local download is recommended.",
    connectionTitle: "Global Connection",
    connectionSub: "Local direct mode or IPCook proxy mode applies to every task below.",
    checkIp: "Check IP",
    checkingIp: "Checking exit IP...",
    ipIdle: "ip: not checked --",
    ipError: "ip: check failed --",
    profileTitle: "Profile Scrape",
    profileSub: "Use this for account data, video metrics, covers, and video files.",
    runScrape: "Start Scrape",
    profileUrl: "TikTok profile URL",
    maxVideos: "Max videos",
    networkMode: "Network mode",
    localMode: "Local direct download",
    ipcookMode: "Use IPCook proxy",
    ipcookApiMode: "Use IPCook API (Recommended)",
    ipcookProxyMode: "Use IPCook proxy",
    ipcookUrl: "IPCook API link (Only used in IPCook API mode)",
    ipcookLink: "Get API link (Free Trial)",
    ipcookPlaceholder: "https://www.ipcook.com/api/dynamic/genips?...",
    proxyList: "IPCook proxy list (auto-detect format, switch on open failure)",
    proxyListPlaceholder: "HOST:PORT:USER:PASS\nHOST:PORT@USER:PASS\nUSER:PASS:HOST:PORT\nUSER:PASS@HOST:PORT",
    metadataTrafficMode: "Metadata traffic mode",
    stableMode: "Stable mode",
    dataSavingMode: "Data-saving mode",
    dataSavingNote: "Only available for metadata-only profile scraping. Turn off video and cover downloads to reduce proxy traffic.",
    timeRange: "Video time range",
    last7: "Last 7 days",
    last30: "Last 30 days",
    last60: "Last 60 days",
    allTime: "All time",
    customDays: "Custom days",
    downloadOptions: "Local files to save",
    fileTypes: "File types",
    videoVersion: "Video version",
    downloadVideos: "Video MP4",
    downloadCovers: "Cover JPG/PNG",
    watermark: "Watermarked",
    noWatermark: "Prefer no-watermark",
    fieldSelect: "Custom fields",
    fieldAccount: "Account data",
    fieldVideoData: "Video data",
    fieldTitle: "Video title",
    fieldCreateTime: "Publish time",
    fieldPlay: "Play count",
    fieldLike: "Like count",
    fieldComment: "Comment count",
    fieldShare: "Share count",
    fieldCollect: "Collect count",
    fieldCover: "Cover",
    fieldVideoUrl: "Video download source",
    singleTitle: "Single Video Download",
    singleSub: "Paste one TikTok video URL and choose whether to save cover, metadata, and video file.",
    downloadSingle: "Download Single Video",
    singleUrl: "Single video URL",
    singleOptions: "Single video options",
    batchTitle: "Batch Video Download",
    batchSub: "Paste multiple TikTok video URLs, one per line. The options below apply to every video.",
    downloadBatch: "Download Batch",
    batchUrls: "Batch video URLs",
    batchOptions: "Batch download options",
    singleVideoData: "Video data JSON",
    singleDownloadVideo: "Video MP4",
    singleDownloadCover: "Cover JPG/PNG",
    resultTitle: "Execution Result",
    progressTitle: "Task Progress",
    jsonTitle: "Clean Result",
    idle: "Waiting for a task.",
    copy: "Copy Result",
    pauseTask: "Pause",
    resumeTask: "Resume",
    queued: "Task created and waiting to start.",
    running: "Task running. Please wait.",
    paused: "Task paused.",
    done: "Task complete.",
    failed: "Task failed. Check the error message.",
    copied: "Result copied.",
    codes: {
      task_started: "Task started",
      task_pause_requested: "Task pause requested",
      task_resumed: "Task resumed",
      proxy_start: "Preparing connection",
      proxy_ready: "Connection ready",
      traffic_saving_enabled: "Data-saving mode enabled",
      proxy_using: "Using proxy",
      proxy_switch: "Page open failed, switching proxy",
      launch_browser: "Launching browser",
      open_profile: "Opening TikTok profile",
      open_video: "Opening TikTok video",
      page_open_retry: "Page failed to open, retrying",
      page_open_failed: "Page could not be opened",
      profile_loaded: "Profile loaded",
      scroll_profile: "Video loading progress",
      parse_profile: "Parsing account and video data",
      parse_video: "Parsing single video data",
      batch_links_found: "Batch video links received",
      batch_video_error: "Single video failed",
      batch_start: "Processing task batch",
      batch_retry: "Task batch failed, retrying",
      batch_skip: "Task batch still failed, skipped",
      item_retry: "Video task failed, retrying",
      item_skip: "Video task still failed, skipped",
      videos_found: "Video list received",
      no_videos_found: "No videos found",
      profile_empty: "No account or video data found",
      verify_video_urls: "Verifying video download sources",
      download_start: "Starting selected media downloads",
      download_cover: "Downloading cover",
      download_video: "Downloading video",
      download_error: "Download error",
      failed_videos_ready: "Failed video list ready",
      save_result: "Saving result files",
      complete: "Scrape flow complete",
      task_success: "Task complete",
      task_error: "Task failed"
    },
    detailLabels: {
      url: "URL",
      count: "Count",
      current: "Current",
      total: "Total",
      id: "Video ID",
      outputDir: "Output folder",
      server: "Proxy",
      phase: "Phase",
      attempt: "Attempt",
      attempts: "Max attempts",
      error: "Error"
    }
  }
};

Object.assign(i18n.zh, {
  stopTask: "結束",
  stoppingTask: "正在結束",
  stopping: "任務將在目前影片完成後結束。",
  stopped: "任務已結束，已保存目前結果。"
});
Object.assign(i18n.zh.codes, {
  task_stop_requested: "已請求結束，將在目前影片後停止",
  task_stopped: "任務已結束"
});
Object.assign(i18n.en, {
  stopTask: "End",
  stoppingTask: "Ending",
  stopping: "Task will end after the current video finishes.",
  stopped: "Task ended and saved the current result."
});
Object.assign(i18n.en.codes, {
  task_stop_requested: "End requested, stopping after current video",
  task_stopped: "Task ended"
});

const defaultFields = ["account", "videoData", "title", "createTime", "playCount", "likeCount", "commentCount", "shareCount", "collectCount", "cover", "videoUrl"];
let language = "en";
let pollTimer;

const connectionForm = document.querySelector("#connectionForm");
const profileForm = document.querySelector("#profileForm");
const singleForm = document.querySelector("#singleForm");
const batchForm = document.querySelector("#batchForm");
const resultBox = document.querySelector("#resultBox");
const statusText = document.querySelector("#statusText");
const progressList = document.querySelector("#progressList");
const ipcookInput = connectionForm.querySelector("input[name=ipcookProxyUrl]");
const proxyListInput = connectionForm.querySelector("textarea[name=proxyList]");
const ipStatus = document.querySelector("#ipStatus");
const checkIpButton = document.querySelector("#checkIp");
const pauseButton = document.querySelector("#pauseTask");
const stopButton = document.querySelector("#stopTask");
let currentJobId;
let currentJobStatus;

document.querySelectorAll("[data-lang]").forEach((button) => {
  button.addEventListener("click", () => {
    language = button.dataset.lang;
    document.querySelectorAll("[data-lang]").forEach((item) => item.classList.toggle("active", item === button));
    document.documentElement.lang = language === "zh" ? "zh-Hant" : "en";
    applyLanguage();
  });
});

connectionForm.querySelectorAll("input[name=proxyMode]").forEach((input) => {
  input.addEventListener("change", updateConnectionFields);
});

profileForm.querySelectorAll("input[name=downloadVideos], input[name=downloadCovers]").forEach((input) => {
  input.addEventListener("change", syncProfileTrafficMode);
});

document.querySelector("#copyResult").addEventListener("click", async () => {
  await navigator.clipboard.writeText(resultBox.textContent || "{}");
  statusText.textContent = i18n[language].copied;
});

checkIpButton.addEventListener("click", checkCurrentIp);
pauseButton.addEventListener("click", togglePause);
stopButton.addEventListener("click", requestStop);

profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await startTask("/api/scrape", payloadFromProfileForm());
});

singleForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await startTask("/api/download-video", payloadFromSingleForm());
});

batchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await startTask("/api/download-videos", payloadFromBatchForm());
});

function applyLanguage() {
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.dataset.i18n;
    if (i18n[language][key]) node.textContent = i18n[language][key];
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    const key = node.dataset.i18nPlaceholder;
    if (i18n[language][key]) node.placeholder = i18n[language][key];
  });
  updatePauseButton();
}

async function checkCurrentIp() {
  checkIpButton.disabled = true;
  ipStatus.className = "ip-status loading";
  ipStatus.textContent = i18n[language].checkingIp;

  try {
    const response = await fetch("/api/connection-ip", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(connectionPayload())
    });
    const body = await response.json();
    if (!response.ok || !body.ok) throw new Error(body.error || response.statusText);
    ipStatus.className = "ip-status success";
    ipStatus.textContent = `ip: ${body.ip} ${body.countryCode}`;
  } catch (error) {
    ipStatus.className = "ip-status error";
    ipStatus.textContent = `${i18n[language].ipError} ${error.message || String(error)}`;
  } finally {
    checkIpButton.disabled = false;
  }
}

function payloadFromProfileForm() {
  const data = new FormData(profileForm);
  const downloadVideos = data.get("downloadVideos") === "on";
  const downloadCovers = data.get("downloadCovers") === "on";
  const selectedTrafficMode = data.get("trafficMode");
  const isMetadataOnly = !downloadVideos && !downloadCovers;
  return {
    ...connectionPayload(),
    profileUrl: data.get("profileUrl"),
    timeRange: data.get("timeRange"),
    customDays: Number(data.get("customDays")),
    maxVideos: Number(data.get("maxVideos")),
    downloadMedia: downloadVideos || downloadCovers,
    downloadVideos,
    downloadCovers,
    mediaMode: data.get("mediaMode"),
    trafficMode: isMetadataOnly && selectedTrafficMode === "data-saving" ? "data-saving" : "stable",
    fields: data.getAll("fields")
  };
}

function payloadFromSingleForm() {
  const single = new FormData(singleForm);
  const downloadVideos = single.get("singleDownloadVideo") === "on";
  const downloadCovers = single.get("singleDownloadCover") === "on";
  const includeData = single.get("singleVideoData") === "on";
  return {
    ...connectionPayload(),
    videoUrl: single.get("videoUrl"),
    downloadMedia: downloadVideos || downloadCovers,
    downloadVideos,
    downloadCovers,
    mediaMode: single.get("singleMediaMode"),
    fields: includeData ? defaultFields : ["videoData", "cover", "videoUrl"],
    maxVideos: 1,
    timeRange: "all"
  };
}

function payloadFromBatchForm() {
  const batch = new FormData(batchForm);
  const downloadVideos = batch.get("batchDownloadVideo") === "on";
  const downloadCovers = batch.get("batchDownloadCover") === "on";
  const includeData = batch.get("batchVideoData") === "on";
  const videoUrls = parseVideoUrls(String(batch.get("videoUrls") || ""));
  return {
    ...connectionPayload(),
    videoUrls,
    downloadMedia: downloadVideos || downloadCovers,
    downloadVideos,
    downloadCovers,
    mediaMode: batch.get("batchMediaMode"),
    fields: includeData ? defaultFields : ["videoData", "cover", "videoUrl"],
    maxVideos: videoUrls.length,
    timeRange: "all"
  };
}

function connectionPayload() {
  const connection = new FormData(connectionForm);
  const selectedMode = connection.get("proxyMode");
  const proxyMode = ["ipcookApi", "ipcookProxy"].includes(selectedMode) ? selectedMode : "local";
  const payload = { proxyMode };
  const ipcookProxyUrl = String(connection.get("ipcookProxyUrl") || "").trim();
  const proxyList = String(connection.get("proxyList") || "").trim();
  if (proxyMode === "ipcookApi" && ipcookProxyUrl) payload.ipcookProxyUrl = ipcookProxyUrl;
  if (proxyMode === "ipcookProxy" && proxyList) payload.proxyList = proxyList;
  return payload;
}

function updateConnectionFields() {
  const mode = new FormData(connectionForm).get("proxyMode");
  const isIpcookApi = mode === "ipcookApi";
  const isIpcookProxy = mode === "ipcookProxy";
  ipcookInput.disabled = !isIpcookApi;
  proxyListInput.disabled = !isIpcookProxy;
  if (!isIpcookApi) {
    ipcookInput.value = "";
  }
  if (!isIpcookProxy) {
    proxyListInput.value = "";
  }
  ipStatus.className = "ip-status";
  ipStatus.textContent = i18n[language].ipIdle;
}

function syncProfileTrafficMode() {
  const downloadVideos = profileForm.querySelector("input[name=downloadVideos]").checked;
  const downloadCovers = profileForm.querySelector("input[name=downloadCovers]").checked;
  const dataSaving = profileForm.querySelector("input[name=trafficMode][value='data-saving']");
  const stable = profileForm.querySelector("input[name=trafficMode][value='stable']");
  const canSaveTraffic = !downloadVideos && !downloadCovers;
  dataSaving.disabled = !canSaveTraffic;
  if (!canSaveTraffic) stable.checked = true;
}

function parseVideoUrls(text) {
  const seen = new Set();
  return text
    .split(/[\s,，]+/)
    .map((item) => item.trim())
    .filter((item) => /^https?:\/\/.*tiktok\.com/i.test(item))
    .filter((item) => {
      if (seen.has(item)) return false;
      seen.add(item);
      return true;
    });
}

async function startTask(endpoint, payload) {
  clearInterval(pollTimer);
  currentJobId = undefined;
  currentJobStatus = undefined;
  updatePauseButton();
  setBusy(true);
  renderProgress([]);
  statusText.textContent = i18n[language].queued;
  resultBox.textContent = JSON.stringify(maskLinks(payload), null, 2);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const body = await response.json();
    if (!response.ok || !body.ok) throw new Error(body.error || response.statusText);
    currentJobId = body.jobId;
    currentJobStatus = "running";
    updatePauseButton();
    pollJob(body.jobId);
  } catch (error) {
    setBusy(false);
    currentJobId = undefined;
    currentJobStatus = undefined;
    updatePauseButton();
    statusText.textContent = i18n[language].failed;
    renderError(error);
  }
}

function pollJob(jobId) {
  pollTimer = setInterval(async () => {
    try {
      const response = await fetch(`/api/jobs/${jobId}`);
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error || response.statusText);
      renderJob(body.job);
      if (["success", "stopped", "error"].includes(body.job.status)) {
        clearInterval(pollTimer);
        setBusy(false);
        currentJobId = undefined;
        currentJobStatus = body.job.status;
        updatePauseButton();
      }
    } catch (error) {
      clearInterval(pollTimer);
      setBusy(false);
      currentJobId = undefined;
      currentJobStatus = undefined;
      updatePauseButton();
      statusText.textContent = i18n[language].failed;
      renderError(error);
    }
  }, 900);
}

function renderJob(job) {
  currentJobStatus = job.status;
  updatePauseButton();
  statusText.textContent = job.status === "success"
    ? i18n[language].done
    : job.status === "stopped"
      ? i18n[language].stopped
      : job.status === "error"
        ? i18n[language].failed
        : job.status === "paused"
          ? i18n[language].paused
          : job.status === "stopping"
            ? i18n[language].stopping
            : i18n[language].running;
  renderProgress(job.progress || []);
  if (job.error) {
    resultBox.textContent = JSON.stringify({ error: job.error }, null, 2);
  } else if (job.result) {
    resultBox.textContent = JSON.stringify(maskLinks(job.result), null, 2);
  }
}

async function togglePause() {
  if (!currentJobId || !["running", "paused", "queued"].includes(currentJobStatus)) return;
  const action = currentJobStatus === "paused" ? "resume" : "pause";
  pauseButton.disabled = true;
  try {
    const response = await fetch(`/api/jobs/${currentJobId}/${action}`, { method: "POST" });
    const body = await response.json();
    if (!response.ok || !body.ok) throw new Error(body.error || response.statusText);
    renderJob(body.job);
  } catch (error) {
    renderError(error);
  } finally {
    updatePauseButton();
  }
}

async function requestStop() {
  if (!currentJobId || !["running", "paused", "queued"].includes(currentJobStatus)) return;
  stopButton.disabled = true;
  try {
    const response = await fetch(`/api/jobs/${currentJobId}/stop`, { method: "POST" });
    const body = await response.json();
    if (!response.ok || !body.ok) throw new Error(body.error || response.statusText);
    renderJob(body.job);
  } catch (error) {
    renderError(error);
  } finally {
    updatePauseButton();
  }
}

function updatePauseButton() {
  if (!pauseButton || !stopButton) return;
  const canPause = currentJobId && ["running", "paused", "queued"].includes(currentJobStatus);
  const canStop = currentJobId && ["running", "paused", "queued"].includes(currentJobStatus);
  pauseButton.disabled = !canPause;
  pauseButton.textContent = currentJobStatus === "paused" ? i18n[language].resumeTask : i18n[language].pauseTask;
  stopButton.disabled = !canStop;
  stopButton.textContent = currentJobStatus === "stopping" ? i18n[language].stoppingTask : i18n[language].stopTask;
}

function renderProgress(items) {
  progressList.innerHTML = "";
  if (!items.length) {
    const li = document.createElement("li");
    li.className = "muted";
    li.innerHTML = `<span>${i18n[language].idle}</span>`;
    progressList.appendChild(li);
    return;
  }

  for (const item of items) {
    const li = document.createElement("li");
    li.className = item.level || "info";
    const label = i18n[language].codes[item.code] || item.message;
    const detail = formatDetail(item.code, item.detail);
    li.innerHTML = `<span>${escapeHtml(label)}</span>${detail ? `<small>${escapeHtml(detail)}</small>` : ""}`;
    progressList.appendChild(li);
  }
}

function renderError(error) {
  resultBox.textContent = JSON.stringify({ error: error.message || String(error) }, null, 2);
}

function formatDetail(code, detail) {
  if (!detail) return "";
  const clean = maskLinks(detail);
  if (code === "scroll_profile" && "current" in clean && "total" in clean && "count" in clean) {
    return language === "zh"
      ? `第 ${clean.current}/${clean.total} 次載入影片，已取得 ${clean.count} 條影片`
      : `Load ${clean.current}/${clean.total}, found ${clean.count} videos`;
  }
  if (["batch_start", "batch_retry", "batch_skip"].includes(code) && "current" in clean && "total" in clean && "count" in clean) {
    const retryText = "attempt" in clean && "attempts" in clean ? (language === "zh" ? `，嘗試 ${clean.attempt}/${clean.attempts}` : `, attempt ${clean.attempt}/${clean.attempts}`) : "";
    const errorText = clean.error ? (language === "zh" ? `，錯誤: ${clean.error}` : `, error: ${clean.error}`) : "";
    return language === "zh"
      ? `${phaseLabel(clean.phase)}第 ${clean.current}/${clean.total} 批，處理 ${clean.count} 條影片${retryText}${errorText}`
      : `${phaseLabel(clean.phase)}batch ${clean.current}/${clean.total}, ${clean.count} videos${retryText}${errorText}`;
  }
  if (["item_retry", "item_skip"].includes(code) && "current" in clean && "total" in clean) {
    const retryText = "attempt" in clean && "attempts" in clean ? (language === "zh" ? `，嘗試 ${clean.attempt}/${clean.attempts}` : `, attempt ${clean.attempt}/${clean.attempts}`) : "";
    const errorText = clean.error ? (language === "zh" ? `，錯誤: ${clean.error}` : `, error: ${clean.error}`) : "";
    return language === "zh"
      ? `第 ${clean.current}/${clean.total} 條影片${retryText}${errorText}`
      : `video ${clean.current}/${clean.total}${retryText}${errorText}`;
  }
  if (code === "page_open_retry" && "attempt" in clean && "attempts" in clean && "waitSeconds" in clean) {
    const errorText = clean.error ? (language === "zh" ? `，原因: ${clean.error}` : `, reason: ${clean.error}`) : "";
    return language === "zh"
      ? `第 ${clean.attempt}/${clean.attempts} 次開啟失敗，等待 ${clean.waitSeconds} 秒後重試${errorText}`
      : `attempt ${clean.attempt}/${clean.attempts} failed, retrying in ${clean.waitSeconds}s${errorText}`;
  }
  if (code === "page_open_failed" && clean.error) {
    return language === "zh" ? `原因: ${clean.error}` : `reason: ${clean.error}`;
  }
  if (["proxy_using", "proxy_switch"].includes(code) && "current" in clean && "total" in clean) {
    const serverText = clean.server ? (language === "zh" ? `，代理: ${clean.server}` : `, proxy: ${clean.server}`) : "";
    const errorText = clean.error ? (language === "zh" ? `，原因: ${clean.error}` : `, reason: ${clean.error}`) : "";
    return language === "zh"
      ? `第 ${clean.current}/${clean.total} 個代理${serverText}${errorText}`
      : `proxy ${clean.current}/${clean.total}${serverText}${errorText}`;
  }
  const labels = i18n[language].detailLabels;
  return Object.entries(clean)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${labels[key] || key}: ${value}`)
    .join(" | ");
}

function phaseLabel(phase) {
  if (phase === "verify") return language === "zh" ? "檢測來源：" : "Verify: ";
  if (phase === "download") return language === "zh" ? "下載媒體：" : "Download: ";
  return "";
}

function maskLinks(value) {
  if (typeof value === "string") {
    if (/^https?:\/\/.*tiktok\.com/i.test(value)) return "https://www.tiktok.com/...";
    if (/^https?:\/\//i.test(value)) {
      try {
        const url = new URL(value);
        return `${url.protocol}//${url.hostname}/...`;
      } catch {
        return value;
      }
    }
    return value;
  }
  if (Array.isArray(value)) return value.map(maskLinks);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, maskLinks(entry)]));
  }
  return value;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function setBusy(isBusy) {
  document.querySelectorAll("button").forEach((button) => {
    if (!button.dataset.lang && button.id !== "pauseTask" && button.id !== "stopTask") button.disabled = isBusy;
  });
  updatePauseButton();
}

applyLanguage();
updateConnectionFields();
syncProfileTrafficMode();
renderProgress([]);
