"""
威软YouTube视频下载工具 - 下载引擎
基于 yt-dlp 实现视频信息获取、格式解析、下载控制
"""

import os
import threading
import time
import yt_dlp

# ─── Progress State ───
_progress = {
    'status': 'idle',       # idle / fetching / downloading / merging / done / error
    'percent': 0,
    'speed': '',
    'eta': '',
    'filename': '',
    'error': '',
}
_lock = threading.Lock()


def get_progress():
    with _lock:
        return dict(_progress)


def _set_progress(**kw):
    with _lock:
        _progress.update(kw)


def _progress_hook(d):
    if d['status'] == 'downloading':
        total = d.get('total_bytes') or d.get('total_bytes_estimate') or 0
        downloaded = d.get('downloaded_bytes', 0)
        pct = (downloaded / total * 100) if total > 0 else 0
        speed = d.get('_speed_str', d.get('speed', ''))
        if isinstance(speed, (int, float)):
            speed = f"{speed / 1024 / 1024:.1f} MB/s"
        eta = d.get('_eta_str', d.get('eta', ''))
        if isinstance(eta, (int, float)):
            m, s = divmod(int(eta), 60)
            eta = f"{m}:{s:02d}"
        _set_progress(status='downloading', percent=round(pct, 1), speed=str(speed), eta=str(eta))
    elif d['status'] == 'finished':
        _set_progress(status='merging', percent=99, speed='', eta='')


# ═══════════════════════════════════════
#  Fetch Video Info
# ═══════════════════════════════════════

def fetch_video_info(url):
    """获取视频信息，返回格式化的字典"""
    _set_progress(status='fetching', percent=0, error='')

    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'skip_download': True,
        'no_color': True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

        if not info:
            raise Exception('无法获取视频信息')

        # Parse formats
        formats = []
        seen = set()
        for f in (info.get('formats') or []):
            fid = f.get('format_id', '')
            if fid in seen:
                continue
            seen.add(fid)

            vcodec = f.get('vcodec', 'none')
            acodec = f.get('acodec', 'none')
            has_video = vcodec != 'none' and vcodec is not None
            has_audio = acodec != 'none' and acodec is not None

            if not has_video and not has_audio:
                continue

            height = f.get('height') or 0
            ext = f.get('ext', '?')
            filesize = f.get('filesize') or f.get('filesize_approx') or 0
            fps_val = f.get('fps') or 0
            tbr = f.get('tbr') or 0

            if has_video:
                quality_label = f.get('format_note', '') or (f'{height}p' if height else '')
                ftype = 'combined' if has_audio else 'video'
            else:
                quality_label = f.get('format_note', '') or f'{int(tbr)}kbps'
                ftype = 'audio'

            formats.append({
                'format_id': fid,
                'type': ftype,
                'quality': quality_label,
                'height': height,
                'fps': fps_val,
                'ext': ext,
                'filesize': filesize,
                'vcodec': (vcodec if has_video else ''),
                'acodec': (acodec if has_audio else ''),
                'tbr': tbr,
            })

        # Sort: combined first, then video-only by height desc, then audio by tbr desc
        type_order = {'combined': 0, 'video': 1, 'audio': 2}
        formats.sort(key=lambda x: (
            type_order.get(x['type'], 9),
            -x['height'],
            -x['tbr']
        ))

        # Parse subtitles
        subtitles = []
        for lang, subs in (info.get('subtitles') or {}).items():
            subtitles.append({
                'lang': lang,
                'name': _lang_name(lang),
                'is_auto': False,
            })
        for lang, subs in (info.get('automatic_captions') or {}).items():
            # Only include a subset of auto-captions
            if lang in ('zh-Hans', 'zh-Hant', 'zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'pt', 'ru', 'ar', 'hi'):
                subtitles.append({
                    'lang': lang,
                    'name': _lang_name(lang) + ' (自动)',
                    'is_auto': True,
                })

        duration = info.get('duration') or 0
        minutes = duration // 60
        seconds = duration % 60

        result = {
            'id': info.get('id', ''),
            'title': info.get('title', '未知视频'),
            'author': info.get('uploader', info.get('channel', '未知')),
            'duration': f'{minutes}:{seconds:02d}',
            'duration_sec': duration,
            'view_count': info.get('view_count', 0),
            'thumbnail': info.get('thumbnail', ''),
            'formats': formats,
            'subtitles': subtitles,
        }

        _set_progress(status='idle', percent=0)
        return result

    except Exception as e:
        _set_progress(status='error', error=str(e))
        raise


# ═══════════════════════════════════════
#  Download Video / Audio
# ═══════════════════════════════════════

def download_video(url, format_id, output_dir, merge_audio=True):
    """下载视频，支持自动合并音频"""
    _set_progress(status='downloading', percent=0, speed='', eta='', error='', filename='')

    # Build format spec
    if merge_audio:
        # Download this format + best audio, merge into mp4
        format_spec = f'{format_id}+bestaudio/best'
    else:
        format_spec = format_id

    ydl_opts = {
        'format': format_spec,
        'outtmpl': os.path.join(output_dir, '%(title)s_%(height)sp.%(ext)s'),
        'merge_output_format': 'mp4',
        'progress_hooks': [_progress_hook],
        'quiet': True,
        'no_warnings': True,
        'no_color': True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        _set_progress(status='done', percent=100)
        return True
    except Exception as e:
        _set_progress(status='error', error=str(e))
        raise


def download_audio(url, format_id, output_dir):
    """下载音频"""
    _set_progress(status='downloading', percent=0, speed='', eta='', error='', filename='')

    ydl_opts = {
        'format': format_id,
        'outtmpl': os.path.join(output_dir, '%(title)s_audio.%(ext)s'),
        'progress_hooks': [_progress_hook],
        'quiet': True,
        'no_warnings': True,
        'no_color': True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        _set_progress(status='done', percent=100)
        return True
    except Exception as e:
        _set_progress(status='error', error=str(e))
        raise


# ═══════════════════════════════════════
#  Download Subtitle
# ═══════════════════════════════════════

def download_subtitle(url, lang, fmt, output_dir, is_auto=False):
    """下载字幕 fmt: 'srt' or 'vtt'"""
    _set_progress(status='downloading', percent=50, error='')

    sub_key = 'automatic_captions' if is_auto else 'subtitles'

    ydl_opts = {
        'skip_download': True,
        'writesubtitles': not is_auto,
        'writeautomaticsub': is_auto,
        'subtitleslangs': [lang],
        'subtitlesformat': fmt,
        'outtmpl': os.path.join(output_dir, '%(title)s'),
        'quiet': True,
        'no_warnings': True,
        'no_color': True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        _set_progress(status='done', percent=100)
        return True
    except Exception as e:
        _set_progress(status='error', error=str(e))
        raise


# ═══════════════════════════════════════
#  Best Format Presets
# ═══════════════════════════════════════

def download_best(url, output_dir, max_height=None):
    """下载最佳质量（可限制最大分辨率）"""
    _set_progress(status='downloading', percent=0, speed='', eta='', error='')

    if max_height:
        format_spec = f'bestvideo[height<={max_height}]+bestaudio/best[height<={max_height}]/best'
    else:
        format_spec = 'bestvideo+bestaudio/best'

    ydl_opts = {
        'format': format_spec,
        'outtmpl': os.path.join(output_dir, '%(title)s_%(height)sp.%(ext)s'),
        'merge_output_format': 'mp4',
        'progress_hooks': [_progress_hook],
        'quiet': True,
        'no_warnings': True,
        'no_color': True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        _set_progress(status='done', percent=100)
        return True
    except Exception as e:
        _set_progress(status='error', error=str(e))
        raise


# ═══════════════════════════════════════
#  Helpers
# ═══════════════════════════════════════

_LANG_MAP = {
    'zh': '中文', 'zh-Hans': '简体中文', 'zh-Hant': '繁体中文',
    'en': 'English', 'ja': '日本語', 'ko': '한국어',
    'es': 'Español', 'fr': 'Français', 'de': 'Deutsch',
    'pt': 'Português', 'ru': 'Русский', 'ar': 'العربية',
    'hi': 'हिन्दी', 'it': 'Italiano', 'nl': 'Nederlands',
    'pl': 'Polski', 'tr': 'Türkçe', 'vi': 'Tiếng Việt',
    'th': 'ไทย', 'id': 'Indonesia',
}

def _lang_name(code):
    return _LANG_MAP.get(code, code)


def format_filesize(size):
    if not size:
        return '未知'
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size < 1024:
            return f'{size:.1f} {unit}'
        size /= 1024
    return f'{size:.1f} TB'
