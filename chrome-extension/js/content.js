/**
 * 威软YouTube视频下载工具 - Content Script v1.1.0
 * 负责从YouTube页面提取视频数据 + 在YouTube页面注入下载按钮
 */

(function () {
  'use strict';

  const LOG = '[威软下载工具/content]';
  const BRAND = '威软YouTube视频下载工具';

  /* ═══════════════════════════════════════
     Extract player response — 4 methods
     ═══════════════════════════════════════ */
  function getPlayerResponse() {
    // Method 1: Global variable
    try {
      if (typeof ytInitialPlayerResponse !== 'undefined' &&
          ytInitialPlayerResponse && ytInitialPlayerResponse.streamingData) {
        return ytInitialPlayerResponse;
      }
    } catch (e) { /* ignore */ }

    // Method 2: movie_player element API
    try {
      const player = document.getElementById('movie_player');
      if (player && typeof player.getPlayerResponse === 'function') {
        const pr = player.getPlayerResponse();
        if (pr && pr.streamingData) return pr;
      }
    } catch (e) { /* ignore */ }

    // Method 3: ytplayer.config
    try {
      if (window.ytplayer && window.ytplayer.config && window.ytplayer.config.args) {
        const pr = JSON.parse(window.ytplayer.config.args.raw_player_response);
        if (pr && pr.streamingData) return pr;
      }
    } catch (e) { /* ignore */ }

    // Method 4: Parse script tags with brute-force bracket matching
    try {
      const scripts = document.querySelectorAll('script');
      for (const script of scripts) {
        const text = script.textContent;
        if (!text || text.length < 200) continue;
        if (!text.includes('ytInitialPlayerResponse')) continue;

        const idx = text.indexOf('ytInitialPlayerResponse');
        const jsonStart = text.indexOf('{', idx);
        if (jsonStart === -1) continue;

        let depth = 0;
        let jsonEnd = jsonStart;
        for (let i = jsonStart; i < text.length && i < jsonStart + 500000; i++) {
          if (text[i] === '{') depth++;
          else if (text[i] === '}') depth--;
          if (depth === 0) { jsonEnd = i + 1; break; }
        }

        try {
          const data = JSON.parse(text.substring(jsonStart, jsonEnd));
          if (data && (data.streamingData || data.videoDetails)) return data;
        } catch (e) { /* try next */ }
      }
    } catch (e) { /* ignore */ }

    return null;
  }

  function getVideoId() {
    try {
      return new URL(window.location.href).searchParams.get('v');
    } catch (e) {
      return null;
    }
  }

  /* ═══════════════════════════════════════
     Inject download button on YouTube page
     ═══════════════════════════════════════ */
  function injectButton() {
    if (document.getElementById('wr-yt-page-btn')) return;

    // Try multiple possible containers
    const selectors = [
      '#top-level-buttons-computed',
      'ytd-menu-renderer #top-level-buttons-computed',
      '#menu #top-level-buttons-computed',
      '#actions #menu',
    ];

    let targetContainer = null;
    for (const sel of selectors) {
      targetContainer = document.querySelector(sel);
      if (targetContainer) break;
    }
    if (!targetContainer) return;

    const btn = document.createElement('button');
    btn.id = 'wr-yt-page-btn';
    btn.className = 'wr-yt-inject-btn';
    btn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      <span>威软下载</span>
    `;
    btn.title = BRAND + ' - 点击工具栏图标打开下载面板';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      // Open extension popup is not possible programmatically.
      // Show a hint instead.
      showPageHint();
    });

    targetContainer.appendChild(btn);
    console.log(LOG, '页面下载按钮已注入');
  }

  function showPageHint() {
    let hint = document.getElementById('wr-page-hint');
    if (!hint) {
      hint = document.createElement('div');
      hint.id = 'wr-page-hint';
      hint.style.cssText = 'position:fixed;top:20px;right:20px;padding:14px 22px;background:linear-gradient(135deg,#0f0f23,#1a1a3e);border:1px solid rgba(99,102,241,.5);border-radius:12px;color:#e2e8f0;font-size:14px;font-family:-apple-system,sans-serif;z-index:2147483647;box-shadow:0 8px 32px rgba(0,0,0,.5);transition:opacity .3s;pointer-events:none;';
      document.body.appendChild(hint);
    }
    hint.textContent = '请点击浏览器工具栏的威软下载图标打开下载面板';
    hint.style.opacity = '1';
    setTimeout(() => { hint.style.opacity = '0'; }, 3000);
  }

  /* ═══════════════════════════════════════
     Message listener for popup requests
     ═══════════════════════════════════════ */
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getPageData') {
      console.log(LOG, '收到 getPageData 请求');
      const videoId = getVideoId();
      const playerResponse = getPlayerResponse();
      console.log(LOG, 'playerResponse:', playerResponse ? '有数据' : '无数据',
        playerResponse?.streamingData ? '(有streamingData)' : '(无streamingData)');
      sendResponse({
        videoId,
        playerResponse,
        pageTitle: document.title
      });
    }
    return true;
  });

  /* ═══════════════════════════════════════
     SPA Navigation Observer
     ═══════════════════════════════════════ */
  let lastUrl = location.href;

  function onNavigate() {
    if (location.href === lastUrl) return;
    lastUrl = location.href;
    console.log(LOG, '页面导航:', location.href);
    // Remove old button so it gets re-injected
    const oldBtn = document.getElementById('wr-yt-page-btn');
    if (oldBtn) oldBtn.remove();
    setTimeout(injectButton, 2000);
  }

  function init() {
    console.log(LOG, '初始化');

    // Observe DOM for SPA navigation
    const observer = new MutationObserver(onNavigate);
    observer.observe(document.body, { childList: true, subtree: true });

    // Listen for YouTube SPA events
    window.addEventListener('yt-navigate-finish', onNavigate);
    document.addEventListener('yt-navigate-finish', onNavigate);

    // Initial button injection
    setTimeout(injectButton, 2000);
  }

  if (document.readyState === 'complete') {
    init();
  } else {
    window.addEventListener('load', init);
  }
})();
