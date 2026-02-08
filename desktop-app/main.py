"""
威软YouTube视频下载工具 - Windows 桌面版
主入口：pywebview 窗口 + Python↔JS API 桥接

技术栈：pywebview (WebView2) + yt-dlp
"""

import os
import sys
import json
import threading
import webview
import ytdl_engine

# ─── Paths ───
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UI_DIR = os.path.join(BASE_DIR, 'ui')

BRAND = '威软YouTube视频下载工具'
VERSION = '1.0.0'


class Api:
    """
    暴露给 JavaScript 调用的 Python API。
    pywebview 会自动将此类的方法映射为 window.pywebview.api.xxx()
    """

    def __init__(self):
        self._window = None
        self._current_url = ''
        self._video_info = None
        self._download_dir = os.path.join(os.path.expanduser('~'), 'Downloads')

    def set_window(self, window):
        self._window = window

    # ─── Video Info ───

    def fetch_info(self, url):
        """获取视频信息 — 返回 JSON 字符串"""
        try:
            self._current_url = url.strip()
            info = ytdl_engine.fetch_video_info(self._current_url)
            self._video_info = info
            return json.dumps({'success': True, 'data': info}, ensure_ascii=False)
        except Exception as e:
            return json.dumps({'success': False, 'error': str(e)}, ensure_ascii=False)

    # ─── Downloads ───

    def download_format(self, format_id, fmt_type):
        """下载指定格式 (在后台线程执行)"""
        def _do():
            try:
                url = self._current_url
                out = self._download_dir
                if fmt_type == 'audio':
                    ytdl_engine.download_audio(url, format_id, out)
                elif fmt_type == 'combined':
                    ytdl_engine.download_video(url, format_id, out, merge_audio=False)
                else:
                    ytdl_engine.download_video(url, format_id, out, merge_audio=True)
            except Exception as e:
                print(f'[下载错误] {e}')

        threading.Thread(target=_do, daemon=True).start()
        return json.dumps({'success': True})

    def download_preset(self, max_height):
        """按预设质量下载"""
        def _do():
            try:
                h = int(max_height) if max_height else None
                ytdl_engine.download_best(self._current_url, self._download_dir, h)
            except Exception as e:
                print(f'[下载错误] {e}')

        threading.Thread(target=_do, daemon=True).start()
        return json.dumps({'success': True})

    def download_subtitle(self, lang, fmt, is_auto):
        """下载字幕"""
        def _do():
            try:
                ytdl_engine.download_subtitle(
                    self._current_url, lang, fmt,
                    self._download_dir, is_auto
                )
            except Exception as e:
                print(f'[字幕下载错误] {e}')

        threading.Thread(target=_do, daemon=True).start()
        return json.dumps({'success': True})

    # ─── Progress ───

    def get_progress(self):
        """获取下载进度"""
        return json.dumps(ytdl_engine.get_progress(), ensure_ascii=False)

    # ─── Directory ───

    def select_directory(self):
        """打开文件夹选择对话框"""
        if self._window:
            result = self._window.create_file_dialog(
                webview.FOLDER_DIALOG,
                directory=self._download_dir
            )
            if result and len(result) > 0:
                self._download_dir = result[0]
                return json.dumps({'success': True, 'path': self._download_dir}, ensure_ascii=False)
        return json.dumps({'success': False}, ensure_ascii=False)

    def get_download_dir(self):
        return self._download_dir

    # ─── App Info ───

    def get_app_info(self):
        return json.dumps({
            'brand': BRAND,
            'version': VERSION,
            'download_dir': self._download_dir,
        }, ensure_ascii=False)


def main():
    api = Api()

    window = webview.create_window(
        title=f'{BRAND} v{VERSION}',
        url=os.path.join(UI_DIR, 'index.html'),
        js_api=api,
        width=900,
        height=680,
        min_size=(800, 600),
        background_color='#0a0a1a',
        text_select=False,
    )

    api.set_window(window)

    webview.start(
        debug=('--debug' in sys.argv),
        gui='edgechromium',     # Use WebView2 on Windows
    )


if __name__ == '__main__':
    main()
