/**
 * 威软YouTube视频下载工具 - Background Service Worker v1.1.0
 * 处理跨域请求、InnerTube API 调用、字幕下载
 */

const LOG = '[威软下载工具/bg]';

/* ═══════════════════════════════════════
   Message Handler
   ═══════════════════════════════════════ */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'fetchPlayerData') {
    console.log(LOG, 'fetchPlayerData:', message.videoId);
    fetchPlayerData(message.videoId)
      .then(data => {
        console.log(LOG, 'fetchPlayerData 成功');
        sendResponse({ success: true, data });
      })
      .catch(err => {
        console.error(LOG, 'fetchPlayerData 失败:', err.message);
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }

  if (message.action === 'downloadSubtitle') {
    console.log(LOG, 'downloadSubtitle');
    fetchSubtitle(message.url)
      .then(content => sendResponse({ success: true, content }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  return false;
});

/* ═══════════════════════════════════════
   InnerTube API — Player Data
   ═══════════════════════════════════════ */
async function fetchPlayerData(videoId) {
  // Try WEB client first, then ANDROID as fallback
  const clients = [
    {
      clientName: 'WEB',
      clientVersion: '2.20260101.00.00',
      apiKey: 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8',
    },
    {
      clientName: 'ANDROID',
      clientVersion: '19.09.37',
      androidSdkVersion: 30,
      apiKey: 'AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w',
    }
  ];

  let lastError = null;

  for (const client of clients) {
    try {
      const data = await fetchWithClient(videoId, client);
      if (data && data.streamingData) {
        console.log(LOG, `成功: ${client.clientName} client`);
        return data;
      }
    } catch (err) {
      console.warn(LOG, `${client.clientName} client 失败:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error('All API clients failed');
}

async function fetchWithClient(videoId, client) {
  const apiUrl = `https://www.youtube.com/youtubei/v1/player?key=${client.apiKey}`;
  const body = {
    videoId: videoId,
    context: {
      client: {
        clientName: client.clientName,
        clientVersion: client.clientVersion,
        hl: 'zh-CN',
      }
    }
  };

  if (client.androidSdkVersion) {
    body.context.client.androidSdkVersion = client.androidSdkVersion;
  }

  const resp = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    throw new Error(`API ${resp.status}: ${resp.statusText}`);
  }

  return resp.json();
}

/* ═══════════════════════════════════════
   Subtitle Fetch
   ═══════════════════════════════════════ */
async function fetchSubtitle(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('Subtitle fetch failed: ' + resp.status);
  return resp.text();
}

/* ═══════════════════════════════════════
   Extension Install / Update
   ═══════════════════════════════════════ */
chrome.runtime.onInstalled.addListener((details) => {
  console.log(LOG, '扩展已安装/更新:', details.reason);
});
