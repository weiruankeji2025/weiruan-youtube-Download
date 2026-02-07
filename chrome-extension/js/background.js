/**
 * 威软YouTube视频下载工具 - Background Service Worker
 * 处理跨域请求和消息中转
 */

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'fetchPlayerData') {
    fetchPlayerData(message.videoId)
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // Keep message channel open for async response
  }

  if (message.action === 'downloadSubtitle') {
    fetchSubtitle(message.url)
      .then(content => sendResponse({ success: true, content }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

async function fetchPlayerData(videoId) {
  const apiUrl = 'https://www.youtube.com/youtubei/v1/player';
  const body = {
    videoId: videoId,
    context: {
      client: {
        clientName: 'WEB',
        clientVersion: '2.20240101.00.00',
        hl: 'zh-CN',
        gl: 'CN'
      }
    }
  };

  const resp = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!resp.ok) throw new Error('API request failed: ' + resp.status);
  return resp.json();
}

async function fetchSubtitle(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('Subtitle fetch failed: ' + resp.status);
  return resp.text();
}
