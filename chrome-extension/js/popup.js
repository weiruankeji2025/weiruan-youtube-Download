/**
 * 威软YouTube视频下载工具 - Popup Script v1.1.0
 * 主界面逻辑：解析视频、展示格式、处理下载
 *
 * 数据获取策略（3级回退）：
 *   1. chrome.scripting.executeScript 注入页面提取数据（最可靠）
 *   2. chrome.tabs.sendMessage 请求 content script
 *   3. background service worker 调用 InnerTube API
 */

(function () {
  'use strict';

  const LOG = '[威软下载工具/popup]';

  /* ───────── State ───────── */
  let currentTab = 'video';
  let videoData = null;
  let activeTabId = null;

  /* ───────── DOM ───────── */
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const mainContent = $('#mainContent');
  const videoTitle = $('#videoTitle');
  const videoMeta = $('#videoMeta');
  const videoThumb = $('#videoThumb');
  const thumbPlaceholder = $('#thumbPlaceholder');

  /* ═══════════════════════════════════════
     Init
     ═══════════════════════════════════════ */
  async function init() {
    console.log(LOG, '初始化开始');
    bindTabs();
    try {
      await loadVideoData();
    } catch (err) {
      console.error(LOG, '初始化异常:', err);
      showError('初始化失败: ' + (err.message || '未知错误'));
    }
  }

  function bindTabs() {
    $$('.wr-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        currentTab = tab.dataset.tab;
        $$('.wr-tab').forEach(t => t.classList.remove('wr-active'));
        tab.classList.add('wr-active');
        renderContent();
      });
    });
  }

  /* ═══════════════════════════════════════
     Load Video Data — 3-tier fallback
     ═══════════════════════════════════════ */
  async function loadVideoData() {
    showLoading('正在解析视频信息...');

    // Step 1: Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) {
      showMessage('无法获取当前标签页信息');
      return;
    }

    console.log(LOG, '当前标签页:', tab.url);

    if (!tab.url.includes('youtube.com/watch')) {
      showMessage('请在YouTube视频页面使用此工具');
      return;
    }

    const url = new URL(tab.url);
    const videoId = url.searchParams.get('v');
    if (!videoId) {
      showMessage('未检测到视频ID');
      return;
    }

    activeTabId = tab.id;
    console.log(LOG, 'videoId:', videoId, 'tabId:', tab.id);

    let playerResponse = null;

    // Tier 1: chrome.scripting.executeScript — inject directly into page
    try {
      console.log(LOG, '尝试方式1: scripting.executeScript');
      playerResponse = await extractViaScripting(tab.id);
      if (playerResponse && playerResponse.streamingData) {
        console.log(LOG, '方式1成功: scripting.executeScript');
      } else {
        playerResponse = null;
      }
    } catch (e) {
      console.warn(LOG, '方式1失败:', e.message);
      playerResponse = null;
    }

    // Tier 2: Content script message
    if (!playerResponse) {
      try {
        console.log(LOG, '尝试方式2: content script message');
        const pageData = await chrome.tabs.sendMessage(tab.id, { action: 'getPageData' });
        if (pageData && pageData.playerResponse && pageData.playerResponse.streamingData) {
          playerResponse = pageData.playerResponse;
          console.log(LOG, '方式2成功: content script');
        }
      } catch (e) {
        console.warn(LOG, '方式2失败:', e.message);
      }
    }

    // Tier 3: Background service worker InnerTube API
    if (!playerResponse) {
      try {
        console.log(LOG, '尝试方式3: InnerTube API via background');
        const resp = await chrome.runtime.sendMessage({
          action: 'fetchPlayerData',
          videoId: videoId
        });
        if (resp && resp.success && resp.data && resp.data.streamingData) {
          playerResponse = resp.data;
          console.log(LOG, '方式3成功: InnerTube API');
        } else {
          const errMsg = resp ? (resp.error || '返回数据无 streamingData') : '无响应';
          console.warn(LOG, '方式3失败:', errMsg);
        }
      } catch (e) {
        console.warn(LOG, '方式3异常:', e.message);
      }
    }

    // All tiers failed
    if (!playerResponse || !playerResponse.streamingData) {
      showError('无法解析视频数据，请刷新YouTube页面后重试');
      return;
    }

    // Parse and display
    const details = playerResponse.videoDetails || {};
    const title = details.title || '未知视频';
    const author = details.author || '未知';
    const lengthSeconds = parseInt(details.lengthSeconds || '0');
    const minutes = Math.floor(lengthSeconds / 60);
    const seconds = lengthSeconds % 60;
    const views = details.viewCount ? parseInt(details.viewCount).toLocaleString() : '';

    videoTitle.textContent = title;
    videoMeta.textContent = [
      author,
      `${minutes}:${String(seconds).padStart(2, '0')}`,
      views ? views + ' 次观看' : ''
    ].filter(Boolean).join(' · ');

    // Thumbnail
    const thumbUrl = details.thumbnail?.thumbnails?.slice(-1)[0]?.url;
    if (thumbUrl) {
      videoThumb.src = thumbUrl;
      videoThumb.style.display = 'block';
      thumbPlaceholder.style.display = 'none';
    }

    const formats = parseFormats(playerResponse);
    const captions = parseCaptions(playerResponse);

    console.log(LOG, `解析完成: ${formats.length} 格式, ${captions.length} 字幕`);

    videoData = { videoId, title, author, formats, captions };
    renderContent();
  }

  /* ═══════════════════════════════════════
     Tier 1: Extract via chrome.scripting
     ═══════════════════════════════════════ */
  async function extractViaScripting(tabId) {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: extractPlayerDataFromPage,
      world: 'MAIN'  // Execute in page's main world to access YouTube's JS variables
    });

    if (results && results[0] && results[0].result) {
      return results[0].result;
    }
    return null;
  }

  /**
   * This function runs inside the YouTube page context (MAIN world).
   * It can access all of YouTube's global JS variables directly.
   */
  function extractPlayerDataFromPage() {
    // Method 1: Global variable
    try {
      if (typeof ytInitialPlayerResponse !== 'undefined' && ytInitialPlayerResponse && ytInitialPlayerResponse.streamingData) {
        return ytInitialPlayerResponse;
      }
    } catch (e) { /* ignore */ }

    // Method 2: movie_player API
    try {
      var player = document.getElementById('movie_player');
      if (player && typeof player.getPlayerResponse === 'function') {
        var pr = player.getPlayerResponse();
        if (pr && pr.streamingData) return pr;
      }
    } catch (e) { /* ignore */ }

    // Method 3: ytplayer.config
    try {
      if (window.ytplayer && window.ytplayer.config && window.ytplayer.config.args) {
        var pr2 = JSON.parse(window.ytplayer.config.args.raw_player_response);
        if (pr2 && pr2.streamingData) return pr2;
      }
    } catch (e) { /* ignore */ }

    // Method 4: Brute-force parse script tags
    try {
      var scripts = document.querySelectorAll('script');
      for (var i = 0; i < scripts.length; i++) {
        var text = scripts[i].textContent;
        if (!text || text.length < 200 || text.indexOf('ytInitialPlayerResponse') === -1) continue;

        var idx = text.indexOf('ytInitialPlayerResponse');
        var jsonStart = text.indexOf('{', idx);
        if (jsonStart === -1) continue;

        var depth = 0;
        var jsonEnd = jsonStart;
        for (var j = jsonStart; j < text.length && j < jsonStart + 500000; j++) {
          if (text[j] === '{') depth++;
          else if (text[j] === '}') depth--;
          if (depth === 0) { jsonEnd = j + 1; break; }
        }
        try {
          var data = JSON.parse(text.substring(jsonStart, jsonEnd));
          if (data && (data.streamingData || data.videoDetails)) return data;
        } catch (e2) { /* try next */ }
      }
    } catch (e) { /* ignore */ }

    return null;
  }

  /* ═══════════════════════════════════════
     Parse Formats
     ═══════════════════════════════════════ */
  function parseFormats(playerResponse) {
    const formats = [];
    const sd = playerResponse.streamingData;
    if (!sd) return formats;

    const combinedFormats = sd.formats || [];
    const adaptiveFormats = sd.adaptiveFormats || [];
    const all = [...combinedFormats, ...adaptiveFormats];

    for (const f of all) {
      const mime = f.mimeType || '';
      const isVideo = mime.startsWith('video/');
      const isAudio = mime.startsWith('audio/');
      if (!isVideo && !isAudio) continue;

      let codec = '';
      const cm = mime.match(/codecs="([^"]+)"/);
      if (cm) codec = cm[1];

      const format = {
        itag: f.itag,
        url: f.url || null,
        type: isVideo ? 'video' : 'audio',
        quality: f.qualityLabel || f.quality || '',
        height: f.height || 0,
        width: f.width || 0,
        fps: f.fps || 0,
        bitrate: f.bitrate || 0,
        contentLength: f.contentLength ? parseInt(f.contentLength) : null,
        codec: codec,
        container: mime.includes('mp4') ? 'mp4' : mime.includes('webm') ? 'webm' : 'other',
        combined: isVideo && combinedFormats.includes(f),
      };

      if (format.url) formats.push(format);
    }

    formats.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'video' ? -1 : 1;
      if (a.type === 'video') return (b.height - a.height) || (b.bitrate - a.bitrate);
      return b.bitrate - a.bitrate;
    });

    return formats;
  }

  function parseCaptions(playerResponse) {
    const tracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!tracks) return [];
    return tracks.map(t => ({
      name: t.name?.simpleText || t.languageCode,
      lang: t.languageCode,
      baseUrl: t.baseUrl,
      isAuto: t.kind === 'asr',
    }));
  }

  /* ═══════════════════════════════════════
     Render
     ═══════════════════════════════════════ */
  function renderContent() {
    if (!videoData) return;
    const { formats, captions, title } = videoData;

    if (currentTab === 'video') renderVideoFormats(formats, title);
    else if (currentTab === 'audio') renderAudioFormats(formats, title);
    else if (currentTab === 'subtitle') renderSubtitles(captions, title);
  }

  function renderVideoFormats(formats, title) {
    const videos = formats.filter(f => f.type === 'video');
    if (videos.length === 0) {
      mainContent.innerHTML = '<div class="wr-state-msg"><p>未找到可用的视频格式</p></div>';
      return;
    }

    const combined = videos.filter(f => f.combined);
    const videoOnly = videos.filter(f => !f.combined);
    let html = '';

    if (combined.length > 0) {
      html += '<div class="wr-section-header">视频+音频 (可直接播放)</div>';
      html += combined.map(f => formatItemHtml(f, 'video')).join('');
    }
    if (videoOnly.length > 0) {
      html += '<div class="wr-section-header">仅视频 (无音轨)</div>';
      html += videoOnly.map(f => formatItemHtml(f, 'video')).join('');
    }

    mainContent.innerHTML = html;
    bindDownloadBtns(title);
  }

  function renderAudioFormats(formats, title) {
    const audios = formats.filter(f => f.type === 'audio');
    if (audios.length === 0) {
      mainContent.innerHTML = '<div class="wr-state-msg"><p>未找到可用的音频格式</p></div>';
      return;
    }

    let html = '<div class="wr-section-header">可用音频格式</div>';
    html += audios.map(f => formatItemHtml(f, 'audio')).join('');
    mainContent.innerHTML = html;
    bindDownloadBtns(title);
  }

  function renderSubtitles(captions, title) {
    if (captions.length === 0) {
      mainContent.innerHTML = '<div class="wr-state-msg"><p>该视频没有可用的字幕</p></div>';
      return;
    }

    mainContent.innerHTML = captions.map((c, i) => `
      <div class="wr-sub-item">
        <div class="wr-sub-info">
          <div class="wr-sub-lang">${escHtml(c.name)}</div>
          <div class="wr-sub-type">${c.isAuto ? '自动生成' : '人工字幕'} · ${escHtml(c.lang)}</div>
        </div>
        <div class="wr-sub-actions">
          <button class="wr-sub-btn" data-idx="${i}" data-fmt="srt">SRT</button>
          <button class="wr-sub-btn" data-idx="${i}" data-fmt="vtt">VTT</button>
        </div>
      </div>
    `).join('');

    mainContent.querySelectorAll('.wr-sub-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        downloadSubtitle(captions[idx], btn.dataset.fmt, title);
      });
    });
  }

  /* ═══════════════════════════════════════
     Format Item HTML
     ═══════════════════════════════════════ */
  function formatItemHtml(f, type) {
    const qualityText = type === 'audio'
      ? `${Math.round(f.bitrate / 1000)}kbps`
      : (f.quality || f.height + 'p');

    const badge = type === 'audio'
      ? '<span class="wr-badge wr-badge-audio">Audio</span>'
      : f.combined
        ? '<span class="wr-badge wr-badge-combined">A+V</span>' + getQualityBadge(f.height)
        : getQualityBadge(f.height);

    const detail = type === 'audio'
      ? `${f.container.toUpperCase()} · ${f.codec.split('.')[0]} · ${formatSize(f.contentLength)}`
      : `${f.container.toUpperCase()} · ${f.codec.split('.')[0]} · ${f.fps}fps · ${formatSize(f.contentLength)}`;

    return `
      <div class="wr-format-item">
        <div class="wr-format-info">
          <div class="wr-format-quality">${escHtml(qualityText)}${badge}</div>
          <div class="wr-format-detail">${detail}</div>
        </div>
        <button class="wr-dl-btn"
                data-url="${encodeURIComponent(f.url)}"
                data-ext="${type === 'audio' ? 'm4a' : 'mp4'}"
                data-quality="${escHtml(qualityText)}">下载</button>
      </div>
    `;
  }

  /* ═══════════════════════════════════════
     Download Handlers
     ═══════════════════════════════════════ */
  function bindDownloadBtns(title) {
    mainContent.querySelectorAll('.wr-dl-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const downloadUrl = decodeURIComponent(btn.dataset.url);
        const ext = btn.dataset.ext;
        const quality = btn.dataset.quality;
        const filename = sanitizeFilename(title) + '_' + quality + '.' + ext;

        console.log(LOG, '开始下载:', quality, filename);

        // Use chrome.downloads API for reliable downloads
        chrome.downloads.download({
          url: downloadUrl,
          filename: filename,
          saveAs: true
        }, (downloadId) => {
          if (chrome.runtime.lastError) {
            console.warn(LOG, 'downloads API 失败:', chrome.runtime.lastError.message);
            // Fallback: open in new tab
            chrome.tabs.create({ url: downloadUrl, active: false });
          } else {
            console.log(LOG, '下载已开始, id:', downloadId);
          }
        });
      });
    });
  }

  async function downloadSubtitle(caption, fmt, title) {
    const subUrl = caption.baseUrl + (fmt === 'srt' ? '&fmt=srv3' : '&fmt=vtt');

    try {
      const resp = await chrome.runtime.sendMessage({
        action: 'downloadSubtitle',
        url: subUrl
      });

      if (!resp || !resp.success) throw new Error(resp ? resp.error : '无响应');

      let content = resp.content;
      if (fmt === 'srt') {
        content = convertToSrt(content);
      }

      // Create downloadable blob URL via background
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      const filename = sanitizeFilename(title) + '.' + caption.lang + '.' + fmt;

      // Download via <a> click (works in popup context)
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        a.remove();
        URL.revokeObjectURL(blobUrl);
      }, 200);

    } catch (err) {
      console.error(LOG, '字幕下载失败:', err);
      showError('字幕下载失败: ' + (err.message || '未知错误'));
    }
  }

  function convertToSrt(srv3Content) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(srv3Content, 'text/xml');
    const texts = doc.querySelectorAll('text');
    let srt = '';
    let index = 1;

    texts.forEach(node => {
      const start = parseFloat(node.getAttribute('start') || '0');
      const dur = parseFloat(node.getAttribute('dur') || '0');
      const end = start + dur;
      const text = node.textContent
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/<[^>]+>/g, '');

      srt += index + '\n';
      srt += fmtSrtTime(start) + ' --> ' + fmtSrtTime(end) + '\n';
      srt += text.trim() + '\n\n';
      index++;
    });
    return srt.trim();
  }

  function fmtSrtTime(s) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    const ms = Math.round((s % 1) * 1000);
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')},${String(ms).padStart(3,'0')}`;
  }

  /* ═══════════════════════════════════════
     Utilities
     ═══════════════════════════════════════ */
  function getQualityBadge(h) {
    if (h >= 4320) return '<span class="wr-badge wr-badge-8k">8K</span>';
    if (h >= 2160) return '<span class="wr-badge wr-badge-4k">4K</span>';
    if (h >= 720)  return '<span class="wr-badge wr-badge-hd">HD</span>';
    return '';
  }

  function formatSize(bytes) {
    if (!bytes) return '未知大小';
    const u = ['B','KB','MB','GB'];
    let i = 0, s = bytes;
    while (s >= 1024 && i < u.length - 1) { s /= 1024; i++; }
    return s.toFixed(1) + ' ' + u[i];
  }

  function sanitizeFilename(name) {
    return name.replace(/[<>:"/\\|?*]/g, '_').substring(0, 200);
  }

  function escHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function showLoading(msg) {
    mainContent.innerHTML = `<div class="wr-state-msg"><div class="wr-spinner"></div><p>${escHtml(msg)}</p></div>`;
  }

  function showMessage(msg) {
    mainContent.innerHTML = `<div class="wr-state-msg"><p>${escHtml(msg)}</p></div>`;
    videoTitle.textContent = msg;
  }

  function showError(msg) {
    mainContent.innerHTML = `<div class="wr-error-msg"><strong>解析失败</strong><p>${escHtml(msg)}</p></div>`;
  }

  /* ═══════════════════════════════════════
     Start
     ═══════════════════════════════════════ */
  init();
})();
