/**
 * 威软YouTube视频下载工具 - Desktop App Frontend v1.0.0
 * pywebview API bridge: window.pywebview.api
 */

(function () {
  'use strict';

  // ─── State ───
  let videoData = null;
  let progressTimer = null;

  // ─── DOM References ───
  const $urlInput    = document.getElementById('url-input');
  const $fetchBtn    = document.getElementById('fetch-btn');
  const $loading     = document.getElementById('loading');
  const $errorMsg    = document.getElementById('error-msg');
  const $videoInfo   = document.getElementById('video-info');
  const $videoThumb  = document.getElementById('video-thumb');
  const $videoTitle  = document.getElementById('video-title');
  const $videoChannel = document.getElementById('video-channel');
  const $videoDuration = document.getElementById('video-duration');
  const $tabBar      = document.getElementById('tab-bar');
  const $panels      = document.getElementById('panels');
  const $videoList   = document.getElementById('video-list');
  const $audioList   = document.getElementById('audio-list');
  const $subtitleList = document.getElementById('subtitle-list');
  const $noSubtitles = document.getElementById('no-subtitles');
  const $progressBar = document.getElementById('progress-bar');
  const $progressFill = document.getElementById('progress-fill');
  const $progressText = document.getElementById('progress-text');
  const $progressSpeed = document.getElementById('progress-speed');
  const $dirBtn      = document.getElementById('dir-btn');
  const $dirPath     = document.getElementById('dir-path');
  const $versionBadge = document.getElementById('version-badge');

  // ─── Wait for pywebview API ───
  function waitForApi() {
    return new Promise((resolve) => {
      if (window.pywebview && window.pywebview.api) {
        resolve();
        return;
      }
      window.addEventListener('pywebviewready', resolve);
    });
  }

  // ─── Initialize ───
  async function init() {
    await waitForApi();
    const api = window.pywebview.api;

    // Load app info
    try {
      const info = JSON.parse(await api.get_app_info());
      $versionBadge.textContent = 'v' + info.version;
      $dirPath.textContent = shortenPath(info.download_dir);
      $dirPath.title = info.download_dir;
    } catch (e) {
      console.error('Failed to load app info:', e);
    }

    // ─── Event Listeners ───
    $fetchBtn.addEventListener('click', () => fetchInfo());

    $urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') fetchInfo();
    });

    // Handle paste - auto fetch
    $urlInput.addEventListener('paste', () => {
      setTimeout(() => {
        const val = $urlInput.value.trim();
        if (val && isYouTubeUrl(val)) {
          fetchInfo();
        }
      }, 100);
    });

    // Tab switching
    $tabBar.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        $tabBar.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        const panel = document.querySelector(`.panel[data-panel="${tab.dataset.tab}"]`);
        if (panel) panel.classList.add('active');
      });
    });

    // Directory selector
    $dirBtn.addEventListener('click', async () => {
      try {
        const result = JSON.parse(await api.select_directory());
        if (result.success) {
          $dirPath.textContent = shortenPath(result.path);
          $dirPath.title = result.path;
        }
      } catch (e) {
        console.error('Directory selection error:', e);
      }
    });

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => downloadPreset(btn.dataset.height));
    });
  }

  // ─── Fetch Video Info ───
  async function fetchInfo() {
    const url = $urlInput.value.trim();
    if (!url) return;

    const api = window.pywebview.api;

    // UI: show loading
    $loading.classList.remove('hidden');
    $errorMsg.classList.add('hidden');
    $videoInfo.classList.add('hidden');
    $tabBar.classList.add('hidden');
    $panels.classList.add('hidden');
    $progressBar.classList.add('hidden');
    $fetchBtn.disabled = true;

    try {
      const result = JSON.parse(await api.fetch_info(url));

      if (!result.success) {
        showError(result.error || '解析失败，请检查链接是否正确');
        return;
      }

      videoData = result.data;
      renderVideoInfo(videoData);
      renderFormats(videoData.formats || []);
      renderSubtitles(videoData.subtitles || {});

      // Show UI sections
      $videoInfo.classList.remove('hidden');
      $tabBar.classList.remove('hidden');
      $panels.classList.remove('hidden');

      // Add animation
      $videoInfo.classList.add('fade-in');
      $tabBar.classList.add('fade-in');
      $panels.classList.add('fade-in');

    } catch (e) {
      showError('解析失败: ' + e.message);
    } finally {
      $loading.classList.add('hidden');
      $fetchBtn.disabled = false;
    }
  }

  // ─── Render Video Info ───
  function renderVideoInfo(data) {
    $videoTitle.textContent = data.title || '未知标题';
    $videoChannel.textContent = data.channel || data.uploader || '';
    $videoDuration.textContent = data.duration_str || '';

    // Thumbnail
    if (data.thumbnail) {
      $videoThumb.src = data.thumbnail;
      $videoThumb.style.display = 'block';
    } else {
      $videoThumb.style.display = 'none';
    }
  }

  // ─── Render Format Lists ───
  function renderFormats(formats) {
    $videoList.innerHTML = '';
    $audioList.innerHTML = '';

    const videoFormats = [];
    const audioFormats = [];

    for (const f of formats) {
      if (f.type === 'audio') {
        audioFormats.push(f);
      } else {
        videoFormats.push(f);
      }
    }

    // Video formats
    if (videoFormats.length === 0) {
      $videoList.innerHTML = '<div class="empty-hint">没有可用的视频格式</div>';
    } else {
      for (const f of videoFormats) {
        $videoList.appendChild(createFormatItem(f));
      }
    }

    // Audio formats
    if (audioFormats.length === 0) {
      $audioList.innerHTML = '<div class="empty-hint">没有可用的音频格式</div>';
    } else {
      for (const f of audioFormats) {
        $audioList.appendChild(createAudioItem(f));
      }
    }
  }

  function createFormatItem(f) {
    const div = document.createElement('div');
    div.className = 'format-item';

    const isCombined = f.type === 'combined';
    const badgeClass = isCombined ? 'badge-combined' : 'badge-video';
    const badgeText = isCombined ? '含音频' : '仅视频';
    const resolution = f.height ? `${f.height}p` : f.format_note || f.format_id;
    const codec = f.vcodec || '';
    const size = f.filesize_str || '';
    const detail = [codec, size, f.fps ? f.fps + 'fps' : ''].filter(Boolean).join(' · ');

    div.innerHTML = `
      <div class="format-info">
        <div class="format-main">
          <span class="format-badge ${badgeClass}">${badgeText}</span>
          ${resolution}
        </div>
        <div class="format-detail">${detail}</div>
      </div>
      <button class="dl-btn">下载</button>
    `;

    div.querySelector('.dl-btn').addEventListener('click', () => {
      downloadFormat(f.format_id, f.type);
    });

    return div;
  }

  function createAudioItem(f) {
    const div = document.createElement('div');
    div.className = 'format-item';

    const abr = f.abr ? f.abr + 'kbps' : '';
    const codec = f.acodec || '';
    const size = f.filesize_str || '';
    const detail = [codec, abr, size].filter(Boolean).join(' · ');

    div.innerHTML = `
      <div class="format-info">
        <div class="format-main">
          <span class="format-badge badge-audio">音频</span>
          ${f.format_note || f.ext || 'audio'}
        </div>
        <div class="format-detail">${detail}</div>
      </div>
      <button class="dl-btn">下载</button>
    `;

    div.querySelector('.dl-btn').addEventListener('click', () => {
      downloadFormat(f.format_id, 'audio');
    });

    return div;
  }

  // ─── Render Subtitles ───
  function renderSubtitles(subtitles) {
    $subtitleList.innerHTML = '';
    const entries = Object.entries(subtitles);

    if (entries.length === 0) {
      $noSubtitles.classList.remove('hidden');
      return;
    }

    $noSubtitles.classList.add('hidden');

    for (const [lang, info] of entries) {
      const div = document.createElement('div');
      div.className = 'sub-item';

      const autoTag = info.is_auto ? '<span class="sub-auto">(自动生成)</span>' : '';

      div.innerHTML = `
        <div class="sub-info">${info.name || lang}${autoTag}</div>
        <div class="sub-actions">
          <button class="sub-dl-btn" data-fmt="srt">SRT</button>
          <button class="sub-dl-btn" data-fmt="vtt">VTT</button>
        </div>
      `;

      div.querySelectorAll('.sub-dl-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          downloadSubtitle(lang, btn.dataset.fmt, !!info.is_auto);
        });
      });

      $subtitleList.appendChild(div);
    }
  }

  // ─── Download Actions ───
  async function downloadFormat(formatId, fmtType) {
    const api = window.pywebview.api;
    try {
      const result = JSON.parse(await api.download_format(formatId, fmtType));
      if (result.success) {
        startProgressPolling();
      }
    } catch (e) {
      showError('下载启动失败: ' + e.message);
    }
  }

  async function downloadPreset(maxHeight) {
    const api = window.pywebview.api;
    try {
      const result = JSON.parse(await api.download_preset(maxHeight));
      if (result.success) {
        startProgressPolling();
      }
    } catch (e) {
      showError('下载启动失败: ' + e.message);
    }
  }

  async function downloadSubtitle(lang, fmt, isAuto) {
    const api = window.pywebview.api;
    try {
      await api.download_subtitle(lang, fmt, isAuto);
    } catch (e) {
      showError('字幕下载失败: ' + e.message);
    }
  }

  // ─── Progress Polling ───
  function startProgressPolling() {
    $progressBar.classList.remove('hidden');
    $progressFill.style.width = '0%';
    $progressText.textContent = '准备中...';
    $progressSpeed.textContent = '';

    if (progressTimer) clearInterval(progressTimer);

    progressTimer = setInterval(async () => {
      try {
        const api = window.pywebview.api;
        const prog = JSON.parse(await api.get_progress());

        if (prog.status === 'idle') {
          // Not started yet
          return;
        }

        if (prog.status === 'downloading') {
          const pct = prog.percent || 0;
          $progressFill.style.width = pct.toFixed(1) + '%';
          $progressText.textContent = `下载中 ${pct.toFixed(1)}%`;
          $progressSpeed.textContent = prog.speed || '';
        } else if (prog.status === 'merging') {
          $progressFill.style.width = '100%';
          $progressText.textContent = '合并中...';
          $progressSpeed.textContent = '';
        } else if (prog.status === 'done') {
          $progressFill.style.width = '100%';
          $progressText.textContent = '下载完成!';
          $progressSpeed.textContent = '';
          clearInterval(progressTimer);
          progressTimer = null;
          // Hide progress bar after a delay
          setTimeout(() => {
            $progressBar.classList.add('hidden');
          }, 3000);
        } else if (prog.status === 'error') {
          $progressText.textContent = '下载出错: ' + (prog.error || '');
          $progressSpeed.textContent = '';
          clearInterval(progressTimer);
          progressTimer = null;
        }
      } catch (e) {
        // Silently ignore polling errors
      }
    }, 500);
  }

  // ─── Helpers ───
  function showError(msg) {
    $errorMsg.textContent = msg;
    $errorMsg.classList.remove('hidden');
    $loading.classList.add('hidden');
  }

  function isYouTubeUrl(url) {
    return /(?:youtube\.com|youtu\.be)/i.test(url);
  }

  function shortenPath(p) {
    if (!p) return '';
    // Show last 2 segments
    const parts = p.replace(/\\/g, '/').split('/');
    if (parts.length <= 3) return p;
    return '.../' + parts.slice(-2).join('/');
  }

  // ─── Start ───
  init();
})();
