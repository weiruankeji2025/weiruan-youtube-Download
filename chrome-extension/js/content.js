/**
 * 威软YouTube视频下载工具 - Content Script
 * 负责从YouTube页面提取视频数据并注入下载按钮
 */

(function () {
  'use strict';

  const BRAND = '威软YouTube视频下载工具';

  /* ───────── Extract player response from page ───────── */
  function getPlayerResponse() {
    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
      const text = script.textContent;
      const match = text.match(/var ytInitialPlayerResponse\s*=\s*(\{.+?\});/s);
      if (match) {
        try { return JSON.parse(match[1]); } catch (e) { /* ignore */ }
      }
    }
    return null;
  }

  function getVideoId() {
    const url = new URL(window.location.href);
    return url.searchParams.get('v');
  }

  /* ───────── Inject download button on YouTube page ───────── */
  function injectButton() {
    if (document.getElementById('wr-yt-page-btn')) return;

    const targetContainer = document.querySelector('#top-level-buttons-computed, ytd-menu-renderer #top-level-buttons-computed');
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
    btn.title = BRAND;
    btn.addEventListener('click', () => {
      // Send message to popup by storing data
      const videoId = getVideoId();
      if (!videoId) return;
      chrome.storage.local.set({ currentVideoId: videoId });
    });

    targetContainer.appendChild(btn);
  }

  /* ───────── Listen for data requests from popup ───────── */
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getPageData') {
      const videoId = getVideoId();
      const playerResponse = getPlayerResponse();
      sendResponse({
        videoId,
        playerResponse,
        pageTitle: document.title
      });
    }
    return true;
  });

  /* ───────── Observer for SPA navigation ───────── */
  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(injectButton, 1500);
    }
  });

  function init() {
    observer.observe(document.body, { childList: true, subtree: true });
    // Try to inject button after page load
    setTimeout(injectButton, 2000);
  }

  if (document.readyState === 'complete') {
    init();
  } else {
    window.addEventListener('load', init);
  }
})();
