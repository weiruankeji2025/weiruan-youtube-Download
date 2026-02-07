/**
 * 威软YouTube视频下载工具 - Popup Script
 * 主界面逻辑：解析视频、展示格式、处理下载
 */

(function () {
  'use strict';

  /* ───────── State ───────── */
  let currentTab = 'video';
  let videoData = null;

  /* ───────── DOM References ───────── */
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const mainContent = $('#mainContent');
  const stateMsg = $('#stateMsg');
  const videoTitle = $('#videoTitle');
  const videoMeta = $('#videoMeta');
  const videoThumb = $('#videoThumb');
  const thumbPlaceholder = $('#thumbPlaceholder');

  /* ───────── Init ───────── */
  async function init() {
    bindTabs();
    await loadVideoData();
  }

  /* ───────── Tab Switching ───────── */
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

  /* ───────── Load Video Data ───────── */
  async function loadVideoData() {
    showLoading('正在解析视频信息...');

    try {
      // Get active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.url || !tab.url.includes('youtube.com/watch')) {
        showMessage('请在YouTube视频页面使用此工具');
        return;
      }

      const url = new URL(tab.url);
      const videoId = url.searchParams.get('v');
      if (!videoId) {
        showMessage('未检测到视频ID');
        return;
      }

      // Try getting data from content script first
      let pageData = null;
      try {
        pageData = await chrome.tabs.sendMessage(tab.id, { action: 'getPageData' });
      } catch (e) {
        // Content script might not be loaded yet
      }

      let playerResponse = pageData?.playerResponse;

      // If content script didn't provide data, fetch via background
      if (!playerResponse || !playerResponse.streamingData) {
        const resp = await chrome.runtime.sendMessage({
          action: 'fetchPlayerData',
          videoId: videoId
        });
        if (resp.success) {
          playerResponse = resp.data;
        } else {
          showError('解析失败: ' + (resp.error || '未知错误'));
          return;
        }
      }

      // Parse video details
      const details = playerResponse.videoDetails || {};
      const title = details.title || '未知视频';
      const author = details.author || '未知';
      const lengthSeconds = parseInt(details.lengthSeconds || '0');
      const minutes = Math.floor(lengthSeconds / 60);
      const seconds = lengthSeconds % 60;
      const views = details.viewCount ? parseInt(details.viewCount).toLocaleString() : '';

      // Update UI
      videoTitle.textContent = title;
      videoMeta.textContent = [author, `${minutes}:${String(seconds).padStart(2, '0')}`, views ? views + ' 次观看' : ''].filter(Boolean).join(' · ');

      // Thumbnail
      const thumbUrl = details.thumbnail?.thumbnails?.slice(-1)[0]?.url;
      if (thumbUrl) {
        videoThumb.src = thumbUrl;
        videoThumb.style.display = 'block';
        thumbPlaceholder.style.display = 'none';
      }

      // Parse formats & captions
      const formats = parseFormats(playerResponse);
      const captions = parseCaptions(playerResponse);

      videoData = { videoId, title, author, formats, captions };
      renderContent();

    } catch (err) {
      console.error('[威软下载工具]', err);
      showError('加载失败，请刷新视频页面后重试');
    }
  }

  /* ───────── Parse Formats ───────── */
  function parseFormats(playerResponse) {
    const formats = [];
    const sd = playerResponse.streamingData;
    if (!sd) return formats;

    const all = [...(sd.formats || []), ...(sd.adaptiveFormats || [])];

    for (const f of all) {
      const mime = f.mimeType || '';
      const isVideo = mime.startsWith('video/');
      const isAudio = mime.startsWith('audio/');
      if (!isVideo && !isAudio) continue;

      let codec = '';
      const cm = mime.match(/codecs="([^"]+)"/);
      if (cm) codec = cm[1];

      const isCombined = isVideo && (sd.formats || []).includes(f);

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
        combined: isCombined,
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

  /* ───────── Parse Captions ───────── */
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

  /* ───────── Render Content ───────── */
  function renderContent() {
    if (!videoData) return;
    const { formats, captions, title } = videoData;

    if (currentTab === 'video') {
      renderVideoFormats(formats, title);
    } else if (currentTab === 'audio') {
      renderAudioFormats(formats, title);
    } else if (currentTab === 'subtitle') {
      renderSubtitles(captions, title);
    }
  }

  function renderVideoFormats(formats, title) {
    const videos = formats.filter(f => f.type === 'video');
    if (videos.length === 0) {
      mainContent.innerHTML = '<div class="wr-state-msg"><p>未找到可用的视频格式</p></div>';
      return;
    }

    // Group: combined first, then video-only
    const combined = videos.filter(f => f.combined);
    const videoOnly = videos.filter(f => !f.combined);

    let html = '';

    if (combined.length > 0) {
      html += '<div class="wr-section-header">视频+音频 (可直接播放)</div>';
      html += combined.map(f => formatItemHtml(f, 'video', title)).join('');
    }

    if (videoOnly.length > 0) {
      html += '<div class="wr-section-header">仅视频 (无音轨)</div>';
      html += videoOnly.map(f => formatItemHtml(f, 'video', title)).join('');
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
    html += audios.map(f => formatItemHtml(f, 'audio', title)).join('');

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

    // Bind subtitle buttons
    mainContent.querySelectorAll('.wr-sub-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        const fmt = btn.dataset.fmt;
        downloadSubtitle(captions[idx], fmt, title);
      });
    });
  }

  /* ───────── Format Item HTML ───────── */
  function formatItemHtml(f, type, title) {
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
          <div class="wr-format-quality">
            ${escHtml(qualityText)}${badge}
          </div>
          <div class="wr-format-detail">${detail}</div>
        </div>
        <button class="wr-dl-btn" data-url="${encodeURIComponent(f.url)}" data-ext="${type === 'audio' ? 'm4a' : 'mp4'}" data-quality="${escHtml(qualityText)}">下载</button>
      </div>
    `;
  }

  function bindDownloadBtns(title) {
    mainContent.querySelectorAll('.wr-dl-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const url = decodeURIComponent(btn.dataset.url);
        const ext = btn.dataset.ext;
        const quality = btn.dataset.quality;

        const filename = sanitizeFilename(title) + '_' + quality + '.' + ext;

        // Open download in new tab
        chrome.tabs.create({ url: url, active: false });
      });
    });
  }

  /* ───────── Subtitle Download ───────── */
  async function downloadSubtitle(caption, fmt, title) {
    const subUrl = caption.baseUrl + (fmt === 'srt' ? '&fmt=srv3' : '&fmt=vtt');

    try {
      const resp = await chrome.runtime.sendMessage({
        action: 'downloadSubtitle',
        url: subUrl
      });

      if (!resp.success) throw new Error(resp.error);

      let content = resp.content;
      if (fmt === 'srt') {
        content = convertToSrt(content);
      }

      // Download via blob
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      const filename = sanitizeFilename(title) + '.' + caption.lang + '.' + fmt;

      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);

    } catch (err) {
      console.error('[字幕下载]', err);
      alert('字幕下载失败: ' + err.message);
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

  /* ───────── Utilities ───────── */
  function getQualityBadge(height) {
    if (height >= 4320) return '<span class="wr-badge wr-badge-8k">8K</span>';
    if (height >= 2160) return '<span class="wr-badge wr-badge-4k">4K</span>';
    if (height >= 720) return '<span class="wr-badge wr-badge-hd">HD</span>';
    return '';
  }

  function formatSize(bytes) {
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

  function escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function showLoading(msg) {
    mainContent.innerHTML = `<div class="wr-state-msg"><div class="wr-spinner"></div><p>${escHtml(msg)}</p></div>`;
  }

  function showMessage(msg) {
    mainContent.innerHTML = `<div class="wr-state-msg"><p>${escHtml(msg)}</p></div>`;
    videoTitle.textContent = msg;
  }

  function showError(msg) {
    mainContent.innerHTML = `<div class="wr-error-msg"><strong>解析失败</strong>${escHtml(msg)}</div>`;
  }

  /* ───────── Start ───────── */
  init();
})();
