// ==UserScript==
// @name         威软YouTube视频下载工具
// @namespace    https://github.com/weiruankeji2025/weiruan-youtube-Download
// @version      1.1.0
// @description  高清YouTube视频下载工具 - 支持自由选择分辨率和字幕下载
// @author       威软科技 (WeiRuan Tech)
// @match        *://www.youtube.com/*
// @match        *://youtube.com/*
// @match        *://m.youtube.com/*
// @icon         https://www.youtube.com/favicon.ico
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_download
// @grant        GM_notification
// @connect      *.youtube.com
// @connect      *.googlevideo.com
// @connect      *.ytimg.com
// @run-at       document-start
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  /* ───────── Constants ───────── */
  const BRAND = '威软YouTube视频下载工具';
  const VERSION = '1.1.0';
  const LOG_PREFIX = '[威软下载工具]';

  function log(...args) { console.log(LOG_PREFIX, ...args); }
  function logErr(...args) { console.error(LOG_PREFIX, ...args); }

  /* ───────── CSS Injection ───────── */
  GM_addStyle(`
    /* ── Trigger Button ── CRITICAL: all properties use !important to resist YouTube overrides */
    #wr-yt-trigger {
      position: fixed !important;
      bottom: 24px !important;
      right: 24px !important;
      width: 52px !important;
      height: 52px !important;
      min-width: 52px !important;
      min-height: 52px !important;
      border-radius: 14px !important;
      border: none !important;
      background: linear-gradient(135deg, #6366f1, #a855f7) !important;
      color: #fff !important;
      font-size: 22px !important;
      cursor: pointer !important;
      z-index: 2147483647 !important;
      box-shadow: 0 4px 20px rgba(99,102,241,.4), 0 0 40px rgba(99,102,241,.15) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      transition: all .3s !important;
      opacity: 1 !important;
      visibility: visible !important;
      pointer-events: auto !important;
      padding: 0 !important;
      margin: 0 !important;
      overflow: visible !important;
      transform: none !important;
      left: auto !important;
      top: auto !important;
      float: none !important;
      max-width: none !important;
      max-height: none !important;
    }
    #wr-yt-trigger:hover {
      transform: scale(1.08) !important;
      box-shadow: 0 6px 28px rgba(99,102,241,.5), 0 0 60px rgba(99,102,241,.25) !important;
    }
    #wr-yt-trigger .wr-pulse {
      position: absolute !important;
      inset: -4px !important;
      border-radius: 18px !important;
      border: 2px solid rgba(99,102,241,.4) !important;
      animation: wr-pulse 2s ease-out infinite !important;
      pointer-events: none !important;
      background: transparent !important;
    }
    #wr-yt-trigger svg {
      width: 24px !important;
      height: 24px !important;
      display: block !important;
      fill: none !important;
      stroke: currentColor !important;
    }
    @keyframes wr-pulse {
      0%   { opacity: 1; transform: scale(1); }
      100% { opacity: 0; transform: scale(1.25); }
    }

    /* ── Panel Container ── */
    #wr-yt-panel {
      position: fixed !important;
      top: 80px !important;
      right: 20px !important;
      width: 380px !important;
      max-height: 80vh !important;
      background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0f0f23 100%) !important;
      border: 1px solid rgba(99, 102, 241, .4) !important;
      border-radius: 16px !important;
      box-shadow: 0 8px 32px rgba(0,0,0,.6), 0 0 60px rgba(99,102,241,.15) !important;
      z-index: 2147483647 !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      color: #e2e8f0 !important;
      overflow: hidden !important;
      display: none !important;
      backdrop-filter: blur(20px) !important;
      transition: opacity .25s, transform .25s !important;
      opacity: 1 !important;
      visibility: visible !important;
      pointer-events: auto !important;
      padding: 0 !important;
      margin: 0 !important;
      left: auto !important;
      bottom: auto !important;
    }
    #wr-yt-panel.wr-show {
      display: flex !important;
      flex-direction: column !important;
      animation: wr-slide-in .3s ease-out !important;
    }
    @keyframes wr-slide-in {
      from { opacity: 0; transform: translateY(-12px) scale(.96); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    /* ── Header ── */
    #wr-yt-panel .wr-header {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      padding: 16px 20px !important;
      background: linear-gradient(90deg, rgba(99,102,241,.2), rgba(168,85,247,.2)) !important;
      border-bottom: 1px solid rgba(99,102,241,.3) !important;
    }
    #wr-yt-panel .wr-logo {
      display: flex !important;
      align-items: center !important;
      gap: 10px !important;
    }
    #wr-yt-panel .wr-logo-icon {
      width: 32px !important;
      height: 32px !important;
      background: linear-gradient(135deg, #6366f1, #a855f7) !important;
      border-radius: 8px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-size: 16px !important;
      font-weight: 700 !important;
      color: #fff !important;
      box-shadow: 0 2px 8px rgba(99,102,241,.4) !important;
    }
    #wr-yt-panel .wr-brand {
      font-size: 15px !important;
      font-weight: 700 !important;
      background: linear-gradient(90deg, #818cf8, #c084fc) !important;
      -webkit-background-clip: text !important;
      -webkit-text-fill-color: transparent !important;
    }
    #wr-yt-panel .wr-close {
      width: 28px !important;
      height: 28px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      border: none !important;
      background: rgba(255,255,255,.08) !important;
      border-radius: 6px !important;
      color: #94a3b8 !important;
      font-size: 18px !important;
      cursor: pointer !important;
      transition: all .2s !important;
      padding: 0 !important;
    }
    #wr-yt-panel .wr-close:hover { background: rgba(239,68,68,.3) !important; color: #fca5a5 !important; }

    /* ── Video Info ── */
    #wr-yt-panel .wr-video-info {
      padding: 16px 20px !important;
      border-bottom: 1px solid rgba(255,255,255,.06) !important;
    }
    #wr-yt-panel .wr-video-title {
      font-size: 13px !important;
      font-weight: 600 !important;
      line-height: 1.5 !important;
      color: #e2e8f0 !important;
      display: -webkit-box !important;
      -webkit-line-clamp: 2 !important;
      -webkit-box-orient: vertical !important;
      overflow: hidden !important;
    }
    #wr-yt-panel .wr-video-meta {
      margin-top: 6px !important;
      font-size: 11px !important;
      color: #64748b !important;
    }

    /* ── Tabs ── */
    #wr-yt-panel .wr-tabs {
      display: flex !important;
      padding: 0 20px !important;
      gap: 4px !important;
      border-bottom: 1px solid rgba(255,255,255,.06) !important;
    }
    #wr-yt-panel .wr-tab {
      flex: 1 !important;
      padding: 10px 0 !important;
      text-align: center !important;
      font-size: 12px !important;
      font-weight: 600 !important;
      color: #64748b !important;
      cursor: pointer !important;
      border-bottom: 2px solid transparent !important;
      border-top: none !important;
      border-left: none !important;
      border-right: none !important;
      transition: all .2s !important;
      background: none !important;
    }
    #wr-yt-panel .wr-tab:hover { color: #a5b4fc !important; }
    #wr-yt-panel .wr-tab.wr-active {
      color: #818cf8 !important;
      border-bottom-color: #6366f1 !important;
    }

    /* ── Content Area ── */
    #wr-yt-panel .wr-content {
      flex: 1 !important;
      overflow-y: auto !important;
      padding: 12px 20px 16px !important;
      scrollbar-width: thin;
      scrollbar-color: rgba(99,102,241,.3) transparent;
    }
    #wr-yt-panel .wr-content::-webkit-scrollbar { width: 4px; }
    #wr-yt-panel .wr-content::-webkit-scrollbar-thumb { background: rgba(99,102,241,.3); border-radius: 4px; }

    /* ── Format Items ── */
    #wr-yt-panel .wr-format-item {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      padding: 10px 14px !important;
      margin-bottom: 6px !important;
      background: rgba(255,255,255,.03) !important;
      border: 1px solid rgba(255,255,255,.06) !important;
      border-radius: 10px !important;
      transition: all .2s !important;
    }
    #wr-yt-panel .wr-format-item:hover {
      background: rgba(99,102,241,.08) !important;
      border-color: rgba(99,102,241,.3) !important;
    }
    #wr-yt-panel .wr-format-info { flex: 1 !important; }
    #wr-yt-panel .wr-format-quality {
      font-size: 13px !important;
      font-weight: 600 !important;
      color: #e2e8f0 !important;
    }
    #wr-yt-panel .wr-format-detail {
      font-size: 11px !important;
      color: #64748b !important;
      margin-top: 2px !important;
    }
    #wr-yt-panel .wr-badge {
      display: inline-block !important;
      padding: 2px 6px !important;
      border-radius: 4px !important;
      font-size: 10px !important;
      font-weight: 600 !important;
      margin-left: 6px !important;
    }
    #wr-yt-panel .wr-badge-hd { background: rgba(34,197,94,.15) !important; color: #4ade80 !important; }
    #wr-yt-panel .wr-badge-4k { background: rgba(251,191,36,.15) !important; color: #fbbf24 !important; }
    #wr-yt-panel .wr-badge-8k { background: rgba(239,68,68,.15) !important; color: #f87171 !important; }
    #wr-yt-panel .wr-badge-audio { background: rgba(99,102,241,.15) !important; color: #818cf8 !important; }

    #wr-yt-panel .wr-dl-btn {
      padding: 6px 14px !important;
      border: none !important;
      border-radius: 8px !important;
      background: linear-gradient(135deg, #6366f1, #8b5cf6) !important;
      color: #fff !important;
      font-size: 11px !important;
      font-weight: 600 !important;
      cursor: pointer !important;
      transition: all .2s !important;
      white-space: nowrap !important;
      box-shadow: 0 2px 8px rgba(99,102,241,.3) !important;
    }
    #wr-yt-panel .wr-dl-btn:hover {
      transform: translateY(-1px) !important;
      box-shadow: 0 4px 16px rgba(99,102,241,.4) !important;
    }

    /* ── Subtitle Items ── */
    #wr-yt-panel .wr-sub-item {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      padding: 10px 14px !important;
      margin-bottom: 6px !important;
      background: rgba(255,255,255,.03) !important;
      border: 1px solid rgba(255,255,255,.06) !important;
      border-radius: 10px !important;
      transition: all .2s !important;
    }
    #wr-yt-panel .wr-sub-item:hover {
      background: rgba(99,102,241,.08) !important;
      border-color: rgba(99,102,241,.3) !important;
    }
    #wr-yt-panel .wr-sub-lang {
      font-size: 13px !important;
      font-weight: 600 !important;
      color: #e2e8f0 !important;
    }
    #wr-yt-panel .wr-sub-type {
      font-size: 11px !important;
      color: #64748b !important;
      margin-top: 2px !important;
    }
    #wr-yt-panel .wr-sub-actions { display: flex !important; gap: 6px !important; }
    #wr-yt-panel .wr-sub-btn {
      padding: 5px 10px !important;
      border: 1px solid rgba(99,102,241,.3) !important;
      border-radius: 6px !important;
      background: rgba(99,102,241,.1) !important;
      color: #a5b4fc !important;
      font-size: 10px !important;
      font-weight: 600 !important;
      cursor: pointer !important;
      transition: all .2s !important;
    }
    #wr-yt-panel .wr-sub-btn:hover {
      background: rgba(99,102,241,.25) !important;
      border-color: rgba(99,102,241,.5) !important;
    }

    /* ── Loading / Empty ── */
    #wr-yt-panel .wr-loading, #wr-yt-panel .wr-empty {
      text-align: center !important;
      padding: 32px 0 !important;
      color: #64748b !important;
      font-size: 13px !important;
    }
    #wr-yt-panel .wr-spinner {
      width: 28px !important;
      height: 28px !important;
      border: 3px solid rgba(99,102,241,.2) !important;
      border-top-color: #6366f1 !important;
      border-radius: 50% !important;
      animation: wr-spin .8s linear infinite !important;
      margin: 0 auto 12px !important;
    }
    @keyframes wr-spin { to { transform: rotate(360deg); } }

    /* ── Footer ── */
    #wr-yt-panel .wr-footer {
      padding: 10px 20px !important;
      text-align: center !important;
      font-size: 10px !important;
      color: #475569 !important;
      border-top: 1px solid rgba(255,255,255,.06) !important;
    }

    /* ── Toast Notification ── */
    #wr-yt-toast {
      position: fixed !important;
      top: 20px !important;
      left: 50% !important;
      transform: translateX(-50%) translateY(-100px) !important;
      padding: 12px 24px !important;
      background: linear-gradient(135deg, #0f0f23, #1a1a3e) !important;
      border: 1px solid rgba(99,102,241,.4) !important;
      border-radius: 10px !important;
      color: #e2e8f0 !important;
      font-size: 13px !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
      z-index: 2147483647 !important;
      box-shadow: 0 8px 32px rgba(0,0,0,.5) !important;
      transition: transform .4s cubic-bezier(.22,1,.36,1) !important;
      pointer-events: none !important;
      visibility: visible !important;
      opacity: 1 !important;
    }
    #wr-yt-toast.wr-toast-show {
      transform: translateX(-50%) translateY(0) !important;
    }
  `);

  /* ───────── Utility ───────── */
  function showToast(msg, duration = 3000) {
    let toast = document.getElementById('wr-yt-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'wr-yt-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    // Force reflow then show
    toast.classList.remove('wr-toast-show');
    void toast.offsetHeight;
    toast.classList.add('wr-toast-show');
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => toast.classList.remove('wr-toast-show'), duration);
  }

  function getVideoId() {
    try {
      const url = new URL(window.location.href);
      return url.searchParams.get('v');
    } catch (e) {
      return null;
    }
  }

  function formatFileSize(bytes) {
    if (!bytes) return '未知大小';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let size = bytes;
    while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
    return size.toFixed(1) + ' ' + units[i];
  }

  function sanitizeFilename(name) {
    return name.replace(/[<>:"/\\|?*]/g, '_').substring(0, 200);
  }

  /* ───────── YouTube Data Extraction ───────── */
  function getPlayerResponse() {
    // Method 1: Try the global variable directly (most reliable)
    try {
      if (typeof ytInitialPlayerResponse !== 'undefined' && ytInitialPlayerResponse && ytInitialPlayerResponse.streamingData) {
        log('数据来源: ytInitialPlayerResponse 全局变量');
        return ytInitialPlayerResponse;
      }
    } catch (e) { /* ignore */ }

    // Method 2: Try ytplayer.config
    try {
      if (window.ytplayer && window.ytplayer.config && window.ytplayer.config.args) {
        const pr = JSON.parse(window.ytplayer.config.args.raw_player_response);
        if (pr && pr.streamingData) {
          log('数据来源: ytplayer.config');
          return pr;
        }
      }
    } catch (e) { /* ignore */ }

    // Method 3: Try movie_player element's internal data
    try {
      const player = document.getElementById('movie_player');
      if (player && typeof player.getPlayerResponse === 'function') {
        const pr = player.getPlayerResponse();
        if (pr && pr.streamingData) {
          log('数据来源: movie_player.getPlayerResponse()');
          return pr;
        }
      }
    } catch (e) { /* ignore */ }

    // Method 4: Parse from script tags with multiple patterns
    try {
      const scripts = document.querySelectorAll('script');
      const patterns = [
        /var\s+ytInitialPlayerResponse\s*=\s*(\{.*?\});\s*(?:var|<\/script)/s,
        /ytInitialPlayerResponse\s*=\s*(\{.*?\});\s*(?:var|const|let|<\/script)/s,
        /window\["ytInitialPlayerResponse"\]\s*=\s*(\{.*?\});/s,
      ];

      for (const script of scripts) {
        const text = script.textContent;
        if (!text || text.length < 100) continue;
        if (!text.includes('ytInitialPlayerResponse')) continue;

        for (const pattern of patterns) {
          const match = text.match(pattern);
          if (match) {
            try {
              const data = JSON.parse(match[1]);
              if (data && (data.streamingData || data.videoDetails)) {
                log('数据来源: script 标签解析');
                return data;
              }
            } catch (e) { /* try next pattern */ }
          }
        }

        // Fallback: brute-force find the JSON by locating the start
        const idx = text.indexOf('ytInitialPlayerResponse');
        if (idx !== -1) {
          const jsonStart = text.indexOf('{', idx);
          if (jsonStart !== -1) {
            let depth = 0;
            let jsonEnd = jsonStart;
            for (let i = jsonStart; i < text.length && i < jsonStart + 500000; i++) {
              if (text[i] === '{') depth++;
              else if (text[i] === '}') depth--;
              if (depth === 0) { jsonEnd = i + 1; break; }
            }
            try {
              const data = JSON.parse(text.substring(jsonStart, jsonEnd));
              if (data && (data.streamingData || data.videoDetails)) {
                log('数据来源: script 标签暴力解析');
                return data;
              }
            } catch (e) { /* ignore */ }
          }
        }
      }
    } catch (e) { /* ignore */ }

    return null;
  }

  async function fetchPlayerData(videoId) {
    // Try extracting from page first
    let playerResponse = getPlayerResponse();
    if (playerResponse && playerResponse.streamingData) {
      return playerResponse;
    }

    log('页面解析失败，使用 InnerTube API 获取数据...');

    // Fallback: fetch via innertube API
    const apiUrl = 'https://www.youtube.com/youtubei/v1/player';
    const body = {
      videoId: videoId,
      context: {
        client: {
          clientName: 'WEB',
          clientVersion: '2.20250101.00.00',
          hl: navigator.language || 'zh-CN',
        }
      }
    };

    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'POST',
        url: apiUrl,
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify(body),
        onload: (resp) => {
          try {
            const data = JSON.parse(resp.responseText);
            log('InnerTube API 返回成功');
            resolve(data);
          }
          catch (e) { reject(e); }
        },
        onerror: (err) => {
          logErr('InnerTube API 请求失败', err);
          reject(err);
        }
      });
    });
  }

  function parseFormats(playerResponse) {
    const formats = [];
    const streamingData = playerResponse.streamingData;
    if (!streamingData) return formats;

    const combinedFormats = streamingData.formats || [];
    const adaptiveFormats = streamingData.adaptiveFormats || [];
    const allFormats = [...combinedFormats, ...adaptiveFormats];

    for (const f of allFormats) {
      const mimeType = f.mimeType || '';
      const isVideo = mimeType.startsWith('video/');
      const isAudio = mimeType.startsWith('audio/');
      if (!isVideo && !isAudio) continue;

      let codec = '';
      const codecMatch = mimeType.match(/codecs="([^"]+)"/);
      if (codecMatch) codec = codecMatch[1];

      const format = {
        itag: f.itag,
        url: f.url || null,
        mimeType: mimeType,
        type: isVideo ? 'video' : 'audio',
        quality: f.qualityLabel || f.quality || '',
        height: f.height || 0,
        width: f.width || 0,
        fps: f.fps || 0,
        bitrate: f.bitrate || 0,
        contentLength: f.contentLength ? parseInt(f.contentLength) : null,
        codec: codec,
        combined: isVideo && combinedFormats.includes(f),
        container: mimeType.includes('mp4') ? 'mp4' : mimeType.includes('webm') ? 'webm' : 'other',
      };

      if (format.url) {
        formats.push(format);
      }
    }

    formats.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'video' ? -1 : 1;
      if (a.type === 'video') return (b.height - a.height) || (b.bitrate - a.bitrate);
      return b.bitrate - a.bitrate;
    });

    return formats;
  }

  function parseCaptions(playerResponse) {
    const captions = [];
    const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!captionTracks) return captions;

    for (const track of captionTracks) {
      captions.push({
        name: track.name?.simpleText || track.languageCode,
        lang: track.languageCode,
        baseUrl: track.baseUrl,
        isAuto: (track.kind === 'asr'),
      });
    }

    return captions;
  }

  /* ───────── Subtitle Download ───────── */
  function downloadSubtitle(caption, fmt, videoTitle) {
    const url = caption.baseUrl + (fmt === 'srt' ? '&fmt=srv3' : '&fmt=vtt');
    const filename = sanitizeFilename(videoTitle) + '.' + caption.lang + '.' + fmt;

    GM_xmlhttpRequest({
      method: 'GET',
      url: url,
      onload: (resp) => {
        let content = resp.responseText;
        if (fmt === 'srt') {
          content = convertToSrt(content);
        }
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(a.href);
        showToast('字幕下载完成: ' + caption.name);
      },
      onerror: () => showToast('字幕下载失败')
    });
  }

  function convertToSrt(srv3Content) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(srv3Content, 'text/xml');
    const texts = doc.querySelectorAll('text');
    let srt = '';
    let index = 1;

    texts.forEach((node) => {
      const start = parseFloat(node.getAttribute('start') || '0');
      const dur = parseFloat(node.getAttribute('dur') || '0');
      const end = start + dur;
      const text = node.textContent
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/<[^>]+>/g, '');

      srt += index + '\n';
      srt += formatSrtTime(start) + ' --> ' + formatSrtTime(end) + '\n';
      srt += text.trim() + '\n\n';
      index++;
    });

    return srt.trim();
  }

  function formatSrtTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.round((seconds % 1) * 1000);
    return [
      String(h).padStart(2, '0'),
      String(m).padStart(2, '0'),
      String(s).padStart(2, '0')
    ].join(':') + ',' + String(ms).padStart(3, '0');
  }

  /* ───────── UI Construction ───────── */
  let uiBuilt = false;

  function ensureTriggerButton() {
    // Self-healing: recreate button if it was removed by YouTube
    if (!document.getElementById('wr-yt-trigger')) {
      log('触发按钮不存在，正在创建...');
      const trigger = document.createElement('button');
      trigger.id = 'wr-yt-trigger';
      trigger.innerHTML = '<span class="wr-pulse"></span><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
      trigger.title = BRAND;
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        togglePanel();
      });
      document.body.appendChild(trigger);
      log('触发按钮已创建');
      return true;
    }
    return false;
  }

  function ensurePanel() {
    if (!document.getElementById('wr-yt-panel')) {
      log('面板不存在，正在创建...');
      const panel = document.createElement('div');
      panel.id = 'wr-yt-panel';
      panel.innerHTML = `
        <div class="wr-header">
          <div class="wr-logo">
            <div class="wr-logo-icon">W</div>
            <span class="wr-brand">${BRAND}</span>
          </div>
          <button class="wr-close" title="关闭">&times;</button>
        </div>
        <div class="wr-video-info">
          <div class="wr-video-title" id="wr-vid-title">正在获取视频信息...</div>
          <div class="wr-video-meta" id="wr-vid-meta"></div>
        </div>
        <div class="wr-tabs">
          <button class="wr-tab wr-active" data-tab="video">视频下载</button>
          <button class="wr-tab" data-tab="audio">音频下载</button>
          <button class="wr-tab" data-tab="subtitle">字幕下载</button>
        </div>
        <div class="wr-content" id="wr-content">
          <div class="wr-loading"><div class="wr-spinner"></div>正在解析视频信息...</div>
        </div>
        <div class="wr-footer">v${VERSION} · 威软科技出品 · 仅供学习研究</div>
      `;
      document.body.appendChild(panel);

      // Bind events
      panel.querySelector('.wr-close').addEventListener('click', (e) => {
        e.stopPropagation();
        togglePanel(false);
      });
      panel.querySelectorAll('.wr-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
          e.stopPropagation();
          switchTab(tab.dataset.tab);
        });
      });
      // Stop click propagation on panel to prevent YouTube from intercepting
      panel.addEventListener('click', (e) => e.stopPropagation());
      log('面板已创建');
      return true;
    }
    return false;
  }

  function buildUI() {
    if (!document.body) return false;
    ensureTriggerButton();
    ensurePanel();
    uiBuilt = true;
    log('UI 构建完成');
    return true;
  }

  /* ───────── Panel Toggle ───────── */
  let panelVisible = false;
  function togglePanel(force) {
    // Ensure UI elements exist
    ensureTriggerButton();
    ensurePanel();

    const panel = document.getElementById('wr-yt-panel');
    if (!panel) return;

    panelVisible = force !== undefined ? force : !panelVisible;
    if (panelVisible) {
      panel.classList.add('wr-show');
      loadVideoData();
    } else {
      panel.classList.remove('wr-show');
    }
  }

  let currentTab = 'video';
  let cachedData = null;

  function switchTab(tab) {
    currentTab = tab;
    const panel = document.getElementById('wr-yt-panel');
    if (!panel) return;
    panel.querySelectorAll('.wr-tab').forEach(t => t.classList.remove('wr-active'));
    const activeTab = panel.querySelector(`.wr-tab[data-tab="${tab}"]`);
    if (activeTab) activeTab.classList.add('wr-active');
    renderContent();
  }

  function getQualityBadge(height) {
    if (height >= 4320) return '<span class="wr-badge wr-badge-8k">8K</span>';
    if (height >= 2160) return '<span class="wr-badge wr-badge-4k">4K</span>';
    if (height >= 720) return '<span class="wr-badge wr-badge-hd">HD</span>';
    return '';
  }

  function renderContent() {
    const container = document.getElementById('wr-content');
    if (!container) return;

    if (!cachedData) {
      container.innerHTML = '<div class="wr-loading"><div class="wr-spinner"></div>正在解析视频信息...</div>';
      return;
    }

    const { formats, captions, title } = cachedData;

    if (currentTab === 'video') {
      const videoFormats = formats.filter(f => f.type === 'video');
      if (videoFormats.length === 0) {
        container.innerHTML = '<div class="wr-empty">未找到可用的视频格式</div>';
        return;
      }
      container.innerHTML = videoFormats.map(f => `
        <div class="wr-format-item">
          <div class="wr-format-info">
            <div class="wr-format-quality">
              ${f.quality || f.height + 'p'}${f.combined ? '<span class="wr-badge wr-badge-hd">A+V</span>' : ''}${getQualityBadge(f.height)}
            </div>
            <div class="wr-format-detail">
              ${f.container.toUpperCase()} · ${f.codec.split('.')[0]} · ${f.fps}fps · ${formatFileSize(f.contentLength)}${f.combined ? '' : ' · 仅视频'}
            </div>
          </div>
          <button class="wr-dl-btn" data-url="${encodeURIComponent(f.url)}" data-type="video" data-quality="${f.quality}">下载</button>
        </div>
      `).join('');
    } else if (currentTab === 'audio') {
      const audioFormats = formats.filter(f => f.type === 'audio');
      if (audioFormats.length === 0) {
        container.innerHTML = '<div class="wr-empty">未找到可用的音频格式</div>';
        return;
      }
      container.innerHTML = audioFormats.map(f => `
        <div class="wr-format-item">
          <div class="wr-format-info">
            <div class="wr-format-quality">
              ${Math.round(f.bitrate / 1000)}kbps<span class="wr-badge wr-badge-audio">Audio</span>
            </div>
            <div class="wr-format-detail">
              ${f.container.toUpperCase()} · ${f.codec.split('.')[0]} · ${formatFileSize(f.contentLength)}
            </div>
          </div>
          <button class="wr-dl-btn" data-url="${encodeURIComponent(f.url)}" data-type="audio" data-quality="${Math.round(f.bitrate / 1000)}kbps">下载</button>
        </div>
      `).join('');
    } else if (currentTab === 'subtitle') {
      if (captions.length === 0) {
        container.innerHTML = '<div class="wr-empty">该视频没有可用的字幕</div>';
        return;
      }
      container.innerHTML = captions.map((c, i) => `
        <div class="wr-sub-item">
          <div>
            <div class="wr-sub-lang">${c.name}</div>
            <div class="wr-sub-type">${c.isAuto ? '自动生成' : '人工字幕'} · ${c.lang}</div>
          </div>
          <div class="wr-sub-actions">
            <button class="wr-sub-btn" data-sub-idx="${i}" data-fmt="srt">SRT</button>
            <button class="wr-sub-btn" data-sub-idx="${i}" data-fmt="vtt">VTT</button>
          </div>
        </div>
      `).join('');
    }

    // Bind download events
    container.querySelectorAll('.wr-dl-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const url = decodeURIComponent(btn.dataset.url);
        const quality = btn.dataset.quality;
        showToast('正在开始下载 ' + quality + ' ...');
        const a = document.createElement('a');
        a.href = url;
        a.download = sanitizeFilename(title) + '_' + quality + '.' + (btn.dataset.type === 'audio' ? 'm4a' : 'mp4');
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => a.remove(), 100);
      });
    });

    container.querySelectorAll('.wr-sub-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const idx = parseInt(btn.dataset.subIdx);
        const fmt = btn.dataset.fmt;
        downloadSubtitle(captions[idx], fmt, title);
      });
    });
  }

  /* ───────── Load Video Data ───────── */
  async function loadVideoData() {
    const videoId = getVideoId();
    if (!videoId) {
      const titleEl = document.getElementById('wr-vid-title');
      const contentEl = document.getElementById('wr-content');
      if (titleEl) titleEl.textContent = '请打开一个YouTube视频页面';
      if (contentEl) contentEl.innerHTML = '<div class="wr-empty">当前页面不是视频页面</div>';
      return;
    }

    // Check cache
    if (cachedData && cachedData.videoId === videoId) {
      renderContent();
      return;
    }

    const contentEl = document.getElementById('wr-content');
    if (contentEl) contentEl.innerHTML = '<div class="wr-loading"><div class="wr-spinner"></div>正在解析视频信息...</div>';

    try {
      const playerResponse = await fetchPlayerData(videoId);
      const videoDetails = playerResponse.videoDetails || {};
      const title = videoDetails.title || '未知视频';
      const author = videoDetails.author || '未知作者';
      const lengthSeconds = parseInt(videoDetails.lengthSeconds || '0');
      const minutes = Math.floor(lengthSeconds / 60);
      const seconds = lengthSeconds % 60;

      const titleEl = document.getElementById('wr-vid-title');
      const metaEl = document.getElementById('wr-vid-meta');
      if (titleEl) titleEl.textContent = title;
      if (metaEl) metaEl.textContent = `${author} · ${minutes}:${String(seconds).padStart(2, '0')} · ${videoDetails.viewCount ? parseInt(videoDetails.viewCount).toLocaleString() + ' 次观看' : ''}`;

      const formats = parseFormats(playerResponse);
      const captions = parseCaptions(playerResponse);

      log(`解析完成: ${formats.length} 个格式, ${captions.length} 个字幕`);

      cachedData = { videoId, title, formats, captions };
      renderContent();
    } catch (err) {
      logErr('视频解析失败', err);
      const contentEl = document.getElementById('wr-content');
      if (contentEl) contentEl.innerHTML = '<div class="wr-empty">解析失败，请刷新页面后重试<br><small style="color:#475569;margin-top:8px;display:block;">' + (err.message || '') + '</small></div>';
    }
  }

  /* ───────── Navigation & Lifecycle ───────── */
  let lastUrl = '';

  function onNavigate() {
    const newUrl = location.href;
    if (newUrl === lastUrl) return;
    lastUrl = newUrl;
    log('页面导航:', newUrl);
    cachedData = null;
    if (panelVisible) loadVideoData();
    // Ensure button survives navigation
    ensureTriggerButton();
    ensurePanel();
  }

  /* ───────── Init ───────── */
  function init() {
    if (!document.body) {
      log('body 未就绪，等待中...');
      const bodyObserver = new MutationObserver(() => {
        if (document.body) {
          bodyObserver.disconnect();
          init();
        }
      });
      bodyObserver.observe(document.documentElement, { childList: true });
      return;
    }

    if (uiBuilt) return; // Prevent double init

    buildUI();
    lastUrl = location.href;

    // Listen for YouTube SPA navigation events
    window.addEventListener('yt-navigate-finish', onNavigate);
    window.addEventListener('yt-navigate-start', () => {
      cachedData = null;
    });
    document.addEventListener('yt-navigate-finish', onNavigate);

    // Fallback: also poll for URL changes (handles edge cases)
    setInterval(() => {
      onNavigate();
      // Self-healing: check button still exists every 3 seconds
      ensureTriggerButton();
    }, 3000);

    // Also handle popstate for browser back/forward
    window.addEventListener('popstate', () => setTimeout(onNavigate, 500));

    showToast(BRAND + ' v' + VERSION + ' 已加载');
    log('初始化完成 v' + VERSION);
  }

  /* ───────── Entry Point ───────── */
  // @run-at document-start: wait for body to exist, then init
  if (document.body) {
    init();
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // readyState is interactive or complete
    init();
  }

  // Extra safety net: if init hasn't run after 5s, force it
  setTimeout(() => {
    if (!uiBuilt && document.body) {
      log('安全网触发: 强制初始化');
      init();
    }
  }, 5000);

})();
