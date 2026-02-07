// ==UserScript==
// @name         威软YouTube视频下载工具
// @namespace    https://github.com/weiruankeji2025/weiruan-youtube-Download
// @version      1.0.0
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
// @run-at       document-idle
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  /* ───────── Constants ───────── */
  const BRAND = '威软YouTube视频下载工具';
  const VERSION = '1.0.0';

  /* ───────── CSS Injection ───────── */
  GM_addStyle(`
    /* ── Panel Container ── */
    #wr-yt-panel {
      position: fixed;
      top: 80px;
      right: 20px;
      width: 380px;
      max-height: 80vh;
      background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0f0f23 100%);
      border: 1px solid rgba(99, 102, 241, .4);
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,.6), 0 0 60px rgba(99,102,241,.15);
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #e2e8f0;
      overflow: hidden;
      display: none;
      backdrop-filter: blur(20px);
      transition: opacity .25s, transform .25s;
    }
    #wr-yt-panel.wr-show {
      display: flex;
      flex-direction: column;
      animation: wr-slide-in .3s ease-out;
    }
    @keyframes wr-slide-in {
      from { opacity: 0; transform: translateY(-12px) scale(.96); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    /* ── Header ── */
    .wr-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      background: linear-gradient(90deg, rgba(99,102,241,.2), rgba(168,85,247,.2));
      border-bottom: 1px solid rgba(99,102,241,.3);
    }
    .wr-header .wr-logo {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .wr-header .wr-logo-icon {
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, #6366f1, #a855f7);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: 700;
      color: #fff;
      box-shadow: 0 2px 8px rgba(99,102,241,.4);
    }
    .wr-header .wr-brand {
      font-size: 15px;
      font-weight: 700;
      background: linear-gradient(90deg, #818cf8, #c084fc);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .wr-header .wr-close {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      background: rgba(255,255,255,.08);
      border-radius: 6px;
      color: #94a3b8;
      font-size: 18px;
      cursor: pointer;
      transition: all .2s;
    }
    .wr-header .wr-close:hover { background: rgba(239,68,68,.3); color: #fca5a5; }

    /* ── Video Info ── */
    .wr-video-info {
      padding: 16px 20px;
      border-bottom: 1px solid rgba(255,255,255,.06);
    }
    .wr-video-title {
      font-size: 13px;
      font-weight: 600;
      line-height: 1.5;
      color: #e2e8f0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .wr-video-meta {
      margin-top: 6px;
      font-size: 11px;
      color: #64748b;
    }

    /* ── Tabs ── */
    .wr-tabs {
      display: flex;
      padding: 0 20px;
      gap: 4px;
      border-bottom: 1px solid rgba(255,255,255,.06);
    }
    .wr-tab {
      flex: 1;
      padding: 10px 0;
      text-align: center;
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all .2s;
      background: none;
      border-top: none;
      border-left: none;
      border-right: none;
    }
    .wr-tab:hover { color: #a5b4fc; }
    .wr-tab.wr-active {
      color: #818cf8;
      border-bottom-color: #6366f1;
    }

    /* ── Content Area ── */
    .wr-content {
      flex: 1;
      overflow-y: auto;
      padding: 12px 20px 16px;
      scrollbar-width: thin;
      scrollbar-color: rgba(99,102,241,.3) transparent;
    }
    .wr-content::-webkit-scrollbar { width: 4px; }
    .wr-content::-webkit-scrollbar-thumb { background: rgba(99,102,241,.3); border-radius: 4px; }

    /* ── Format Items ── */
    .wr-format-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      margin-bottom: 6px;
      background: rgba(255,255,255,.03);
      border: 1px solid rgba(255,255,255,.06);
      border-radius: 10px;
      transition: all .2s;
    }
    .wr-format-item:hover {
      background: rgba(99,102,241,.08);
      border-color: rgba(99,102,241,.3);
    }
    .wr-format-info { flex: 1; }
    .wr-format-quality {
      font-size: 13px;
      font-weight: 600;
      color: #e2e8f0;
    }
    .wr-format-detail {
      font-size: 11px;
      color: #64748b;
      margin-top: 2px;
    }
    .wr-badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
      margin-left: 6px;
    }
    .wr-badge-hd { background: rgba(34,197,94,.15); color: #4ade80; }
    .wr-badge-4k { background: rgba(251,191,36,.15); color: #fbbf24; }
    .wr-badge-8k { background: rgba(239,68,68,.15); color: #f87171; }
    .wr-badge-audio { background: rgba(99,102,241,.15); color: #818cf8; }

    .wr-dl-btn {
      padding: 6px 14px;
      border: none;
      border-radius: 8px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: #fff;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all .2s;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(99,102,241,.3);
    }
    .wr-dl-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 16px rgba(99,102,241,.4);
    }

    /* ── Subtitle Items ── */
    .wr-sub-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      margin-bottom: 6px;
      background: rgba(255,255,255,.03);
      border: 1px solid rgba(255,255,255,.06);
      border-radius: 10px;
      transition: all .2s;
    }
    .wr-sub-item:hover {
      background: rgba(99,102,241,.08);
      border-color: rgba(99,102,241,.3);
    }
    .wr-sub-lang {
      font-size: 13px;
      font-weight: 600;
      color: #e2e8f0;
    }
    .wr-sub-type {
      font-size: 11px;
      color: #64748b;
      margin-top: 2px;
    }
    .wr-sub-actions { display: flex; gap: 6px; }
    .wr-sub-btn {
      padding: 5px 10px;
      border: 1px solid rgba(99,102,241,.3);
      border-radius: 6px;
      background: rgba(99,102,241,.1);
      color: #a5b4fc;
      font-size: 10px;
      font-weight: 600;
      cursor: pointer;
      transition: all .2s;
    }
    .wr-sub-btn:hover {
      background: rgba(99,102,241,.25);
      border-color: rgba(99,102,241,.5);
    }

    /* ── Loading / Empty ── */
    .wr-loading, .wr-empty {
      text-align: center;
      padding: 32px 0;
      color: #64748b;
      font-size: 13px;
    }
    .wr-spinner {
      width: 28px;
      height: 28px;
      border: 3px solid rgba(99,102,241,.2);
      border-top-color: #6366f1;
      border-radius: 50%;
      animation: wr-spin .8s linear infinite;
      margin: 0 auto 12px;
    }
    @keyframes wr-spin { to { transform: rotate(360deg); } }

    /* ── Footer ── */
    .wr-footer {
      padding: 10px 20px;
      text-align: center;
      font-size: 10px;
      color: #475569;
      border-top: 1px solid rgba(255,255,255,.06);
    }

    /* ── Trigger Button ── */
    #wr-yt-trigger {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 52px;
      height: 52px;
      border-radius: 14px;
      border: none;
      background: linear-gradient(135deg, #6366f1, #a855f7);
      color: #fff;
      font-size: 22px;
      cursor: pointer;
      z-index: 2147483646;
      box-shadow: 0 4px 20px rgba(99,102,241,.4), 0 0 40px rgba(99,102,241,.15);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all .3s;
    }
    #wr-yt-trigger:hover {
      transform: scale(1.08);
      box-shadow: 0 6px 28px rgba(99,102,241,.5), 0 0 60px rgba(99,102,241,.25);
    }
    #wr-yt-trigger .wr-pulse {
      position: absolute;
      inset: -4px;
      border-radius: 18px;
      border: 2px solid rgba(99,102,241,.4);
      animation: wr-pulse 2s ease-out infinite;
    }
    @keyframes wr-pulse {
      0%   { opacity: 1; transform: scale(1); }
      100% { opacity: 0; transform: scale(1.25); }
    }

    /* ── Toast Notification ── */
    .wr-toast {
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%) translateY(-100px);
      padding: 12px 24px;
      background: linear-gradient(135deg, #0f0f23, #1a1a3e);
      border: 1px solid rgba(99,102,241,.4);
      border-radius: 10px;
      color: #e2e8f0;
      font-size: 13px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      z-index: 2147483647;
      box-shadow: 0 8px 32px rgba(0,0,0,.5);
      transition: transform .4s cubic-bezier(.22,1,.36,1);
    }
    .wr-toast.wr-toast-show {
      transform: translateX(-50%) translateY(0);
    }
  `);

  /* ───────── Utility ───────── */
  function showToast(msg, duration = 3000) {
    let toast = document.querySelector('.wr-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'wr-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('wr-toast-show');
    setTimeout(() => toast.classList.remove('wr-toast-show'), duration);
  }

  function getVideoId() {
    const url = new URL(window.location.href);
    return url.searchParams.get('v');
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
    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
      const text = script.textContent;
      const match = text.match(/var ytInitialPlayerResponse\s*=\s*(\{.+?\});/s);
      if (match) {
        try { return JSON.parse(match[1]); } catch (e) { /* ignore */ }
      }
    }

    // Fallback: try ytplayer.config
    if (window.ytplayer && window.ytplayer.config) {
      try {
        const pr = JSON.parse(window.ytplayer.config.args.raw_player_response);
        return pr;
      } catch (e) { /* ignore */ }
    }

    return null;
  }

  async function fetchPlayerData(videoId) {
    // Try extracting from page first
    let playerResponse = getPlayerResponse();
    if (playerResponse && playerResponse.streamingData) {
      return playerResponse;
    }

    // Fallback: fetch via innertube API
    const apiUrl = 'https://www.youtube.com/youtubei/v1/player';
    const body = {
      videoId: videoId,
      context: {
        client: {
          clientName: 'WEB',
          clientVersion: '2.20240101.00.00',
          hl: 'zh-CN',
          gl: 'CN',
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
          try { resolve(JSON.parse(resp.responseText)); }
          catch (e) { reject(e); }
        },
        onerror: reject
      });
    });
  }

  function parseFormats(playerResponse) {
    const formats = [];
    const streamingData = playerResponse.streamingData;
    if (!streamingData) return formats;

    const allFormats = [
      ...(streamingData.formats || []),
      ...(streamingData.adaptiveFormats || [])
    ];

    for (const f of allFormats) {
      const mimeType = f.mimeType || '';
      const isVideo = mimeType.startsWith('video/');
      const isAudio = mimeType.startsWith('audio/');

      let quality = f.qualityLabel || f.quality || '';
      let codec = '';
      const codecMatch = mimeType.match(/codecs="([^"]+)"/);
      if (codecMatch) codec = codecMatch[1];

      const format = {
        itag: f.itag,
        url: f.url || null,
        signatureCipher: f.signatureCipher || f.cipher || null,
        mimeType: mimeType,
        type: isVideo ? 'video' : (isAudio ? 'audio' : 'other'),
        quality: quality,
        qualityNum: f.height || (isAudio ? 0 : 0),
        width: f.width || 0,
        height: f.height || 0,
        fps: f.fps || 0,
        bitrate: f.bitrate || 0,
        contentLength: f.contentLength ? parseInt(f.contentLength) : null,
        codec: codec,
        hasAudio: mimeType.startsWith('audio/') || (f.audioQuality != null && isVideo && (streamingData.formats || []).includes(f)),
        container: mimeType.includes('mp4') ? 'mp4' : mimeType.includes('webm') ? 'webm' : mimeType.includes('mp4a') ? 'm4a' : '3gp',
      };

      // Only include formats with accessible URLs
      if (format.url) {
        formats.push(format);
      }
    }

    // Sort: video by height desc, audio by bitrate desc
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
    // Parse XML-based srv3 format and convert to SRT
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
  function buildPanel() {
    // Trigger button
    const trigger = document.createElement('button');
    trigger.id = 'wr-yt-trigger';
    trigger.innerHTML = '<span class="wr-pulse"></span><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
    trigger.title = BRAND;
    document.body.appendChild(trigger);

    // Panel
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

    // Events
    trigger.addEventListener('click', () => togglePanel());
    panel.querySelector('.wr-close').addEventListener('click', () => togglePanel(false));
    panel.querySelectorAll('.wr-tab').forEach(tab => {
      tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    return { trigger, panel };
  }

  let panelVisible = false;
  function togglePanel(force) {
    const panel = document.getElementById('wr-yt-panel');
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
    document.querySelectorAll('.wr-tab').forEach(t => t.classList.remove('wr-active'));
    document.querySelector(`.wr-tab[data-tab="${tab}"]`).classList.add('wr-active');
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
              ${f.quality || f.height + 'p'}${getQualityBadge(f.height)}
            </div>
            <div class="wr-format-detail">
              ${f.container.toUpperCase()} · ${f.codec.split('.')[0]} · ${f.fps}fps · ${formatFileSize(f.contentLength)}
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
      btn.addEventListener('click', () => {
        const url = decodeURIComponent(btn.dataset.url);
        const quality = btn.dataset.quality;
        showToast('正在开始下载 ' + quality + ' ...');
        const a = document.createElement('a');
        a.href = url;
        a.download = sanitizeFilename(title) + '_' + quality + '.' + (btn.dataset.type === 'audio' ? 'm4a' : 'mp4');
        document.body.appendChild(a);
        a.click();
        a.remove();
      });
    });

    container.querySelectorAll('.wr-sub-btn').forEach(btn => {
      btn.addEventListener('click', () => {
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
      document.getElementById('wr-vid-title').textContent = '请打开一个YouTube视频页面';
      document.getElementById('wr-content').innerHTML = '<div class="wr-empty">当前页面不是视频页面</div>';
      return;
    }

    // Check cache
    if (cachedData && cachedData.videoId === videoId) {
      renderContent();
      return;
    }

    document.getElementById('wr-content').innerHTML = '<div class="wr-loading"><div class="wr-spinner"></div>正在解析视频信息...</div>';

    try {
      const playerResponse = await fetchPlayerData(videoId);
      const videoDetails = playerResponse.videoDetails || {};
      const title = videoDetails.title || '未知视频';
      const author = videoDetails.author || '未知作者';
      const lengthSeconds = parseInt(videoDetails.lengthSeconds || '0');
      const minutes = Math.floor(lengthSeconds / 60);
      const seconds = lengthSeconds % 60;

      document.getElementById('wr-vid-title').textContent = title;
      document.getElementById('wr-vid-meta').textContent = `${author} · ${minutes}:${String(seconds).padStart(2, '0')} · ${videoDetails.viewCount ? parseInt(videoDetails.viewCount).toLocaleString() + ' 次观看' : ''}`;

      const formats = parseFormats(playerResponse);
      const captions = parseCaptions(playerResponse);

      cachedData = { videoId, title, formats, captions };
      renderContent();
    } catch (err) {
      console.error('[威软下载工具]', err);
      document.getElementById('wr-content').innerHTML = '<div class="wr-empty">解析失败，请刷新页面后重试</div>';
    }
  }

  /* ───────── URL Change Detection ───────── */
  let lastUrl = location.href;
  function checkUrlChange() {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      cachedData = null;
      if (panelVisible) loadVideoData();
    }
  }

  /* ───────── Init ───────── */
  function init() {
    buildPanel();
    setInterval(checkUrlChange, 1000);
    showToast(BRAND + ' 已加载');
  }

  // Wait for page ready
  if (document.readyState === 'complete') {
    init();
  } else {
    window.addEventListener('load', init);
  }
})();
