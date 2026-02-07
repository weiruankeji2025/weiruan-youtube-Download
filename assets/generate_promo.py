"""
威软YouTube视频下载工具 - 宣传图标生成器
生成全套高质量宣传素材
"""

from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math
import os

# ─── Paths ───
OUT_DIR = '/home/user/weiruan-youtube-Download/assets/promo'
FONT_ZH = '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc'
ICON_DIR = '/home/user/weiruan-youtube-Download/chrome-extension/icons'

os.makedirs(OUT_DIR, exist_ok=True)


# ═══════════════════════════════════════════
#  Drawing Helpers
# ═══════════════════════════════════════════

def lerp_color(c1, c2, t):
    """Linear interpolation between two RGB colors."""
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))


def draw_gradient_rect(draw, bbox, c1, c2, direction='diagonal'):
    """Draw a gradient-filled rectangle."""
    x1, y1, x2, y2 = bbox
    w, h = x2 - x1, y2 - y1
    for y in range(y1, y2):
        for x in range(x1, x2):
            if direction == 'diagonal':
                t = ((x - x1) + (y - y1)) / (w + h) if (w + h) > 0 else 0
            elif direction == 'horizontal':
                t = (x - x1) / w if w > 0 else 0
            else:
                t = (y - y1) / h if h > 0 else 0
            color = lerp_color(c1, c2, t)
            draw.point((x, y), fill=color)


def create_gradient_bg(width, height, colors=None):
    """Create a full gradient background image."""
    if colors is None:
        colors = [(15, 15, 35), (26, 26, 62), (15, 15, 35)]

    img = Image.new('RGB', (width, height), colors[0])
    draw = ImageDraw.Draw(img)

    # Multi-stop gradient
    segments = len(colors) - 1
    seg_h = height // segments

    for i in range(segments):
        for y in range(seg_h):
            actual_y = i * seg_h + y
            if actual_y >= height:
                break
            t = y / seg_h
            color = lerp_color(colors[i], colors[i + 1], t)
            draw.line([(0, actual_y), (width, actual_y)], fill=color)

    return img


def draw_rounded_rect(draw, bbox, radius, fill):
    """Draw a rounded rectangle."""
    x1, y1, x2, y2 = bbox
    # Main body
    draw.rectangle([x1 + radius, y1, x2 - radius, y2], fill=fill)
    draw.rectangle([x1, y1 + radius, x2, y2 - radius], fill=fill)
    # Corners
    draw.pieslice([x1, y1, x1 + 2 * radius, y1 + 2 * radius], 180, 270, fill=fill)
    draw.pieslice([x2 - 2 * radius, y1, x2, y1 + 2 * radius], 270, 360, fill=fill)
    draw.pieslice([x1, y2 - 2 * radius, x1 + 2 * radius, y2], 90, 180, fill=fill)
    draw.pieslice([x2 - 2 * radius, y2 - 2 * radius, x2, y2], 0, 90, fill=fill)


def draw_download_icon(draw, cx, cy, size, color=(255, 255, 255)):
    """Draw a download arrow icon."""
    s = size / 100.0
    lw = max(int(8 * s), 2)

    # Vertical line
    draw.line([(cx, cy - int(35 * s)), (cx, cy + int(10 * s))], fill=color, width=lw)
    # Arrow head
    draw.line([(cx - int(20 * s), cy - int(5 * s)), (cx, cy + int(20 * s))], fill=color, width=lw)
    draw.line([(cx + int(20 * s), cy - int(5 * s)), (cx, cy + int(20 * s))], fill=color, width=lw)
    # Base
    draw.line([(cx - int(30 * s), cy + int(35 * s)), (cx + int(30 * s), cy + int(35 * s))], fill=color, width=lw)


def draw_play_button(draw, cx, cy, size, color=(255, 255, 255, 180)):
    """Draw a play triangle."""
    s = size / 100.0
    points = [
        (cx - int(15 * s), cy - int(20 * s)),
        (cx - int(15 * s), cy + int(20 * s)),
        (cx + int(20 * s), cy),
    ]
    draw.polygon(points, fill=color)


def draw_glow_circle(img, cx, cy, radius, color, alpha=30):
    """Draw a soft glow circle."""
    overlay = Image.new('RGBA', img.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    for r in range(radius, 0, -2):
        a = int(alpha * (r / radius))
        od.ellipse(
            [cx - r, cy - r, cx + r, cy + r],
            fill=(*color, a)
        )
    img.paste(Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB'))


def draw_star_particles(draw, width, height, count=30):
    """Draw small decorative particles."""
    import random
    random.seed(42)
    for _ in range(count):
        x = random.randint(0, width)
        y = random.randint(0, height)
        size = random.randint(1, 3)
        alpha = random.randint(40, 120)
        draw.ellipse([x, y, x + size, y + size], fill=(255, 255, 255, alpha) if draw.mode == 'RGBA' else (100 + alpha, 100 + alpha, 140 + min(alpha, 115)))


def draw_grid_pattern(draw, width, height, spacing=40, color=(255, 255, 255)):
    """Draw subtle grid lines."""
    for x in range(0, width, spacing):
        draw.line([(x, 0), (x, height)], fill=(*color, 8) if len(color) == 3 else color, width=1)
    for y in range(0, height, spacing):
        draw.line([(0, y), (width, y)], fill=(*color, 8) if len(color) == 3 else color, width=1)


# ═══════════════════════════════════════════
#  1. Main Promotional Banner (1280x640)
# ═══════════════════════════════════════════

def create_main_banner():
    W, H = 1280, 640
    img = create_gradient_bg(W, H, [
        (10, 10, 30), (20, 18, 55), (25, 20, 65), (15, 12, 40), (10, 10, 30)
    ])
    draw = ImageDraw.Draw(img)

    # Decorative particles
    draw_star_particles(draw, W, H, count=50)

    # Glow effects
    draw_glow_circle(img, 200, 320, 300, (99, 102, 241), alpha=15)
    draw_glow_circle(img, 1080, 320, 250, (168, 85, 247), alpha=12)
    draw = ImageDraw.Draw(img)

    # ── Left Side: Text Content ──
    font_title = ImageFont.truetype(FONT_ZH, 52)
    font_sub = ImageFont.truetype(FONT_ZH, 24)
    font_en = ImageFont.truetype(FONT_ZH, 18)
    font_feature = ImageFont.truetype(FONT_ZH, 17)

    # Logo icon background
    logo_x, logo_y = 80, 135
    draw_rounded_rect(draw, [logo_x, logo_y, logo_x + 60, logo_y + 60], 14, fill=(99, 102, 241))
    draw_download_icon(draw, logo_x + 30, logo_y + 28, 50, color=(255, 255, 255))

    # Brand title
    draw.text((logo_x + 75, logo_y + 5), '威软YouTube', fill=(255, 255, 255), font=font_title)
    draw.text((logo_x + 75, logo_y + 65), '视频下载工具', fill=(255, 255, 255), font=font_title)

    # English subtitle
    draw.text((logo_x, logo_y + 140), 'WeiRuan YouTube Video Downloader', fill=(148, 163, 184), font=font_en)

    # Separator line
    draw.line([(logo_x, logo_y + 175), (logo_x + 380, logo_y + 175)], fill=(99, 102, 241), width=2)

    # Features
    features = [
        ('自由选择分辨率', '360p ~ 8K 全分辨率支持'),
        ('字幕下载', 'SRT / VTT 双格式导出'),
        ('高端UI设计', '暗色主题 + 毛玻璃效果'),
        ('低内存占用', '纯原生JS · 零依赖'),
    ]

    fy = logo_y + 195
    for i, (title, desc) in enumerate(features):
        # Bullet dot
        dot_color = [(99, 102, 241), (168, 85, 247), (59, 130, 246), (34, 197, 94)][i]
        draw.ellipse([logo_x + 2, fy + 5, logo_x + 12, fy + 15], fill=dot_color)
        draw.text((logo_x + 22, fy), title, fill=(226, 232, 240), font=font_feature)
        draw.text((logo_x + 22, fy + 22), desc, fill=(100, 116, 139), font=ImageFont.truetype(FONT_ZH, 13))
        fy += 52

    # ── Right Side: Mock UI Panel ──
    panel_x, panel_y = 720, 60
    panel_w, panel_h = 480, 520

    # Panel background
    panel_img = Image.new('RGBA', (panel_w, panel_h), (0, 0, 0, 0))
    pd = ImageDraw.Draw(panel_img)
    draw_rounded_rect(pd, [0, 0, panel_w - 1, panel_h - 1], 16, fill=(18, 18, 42, 230))

    # Panel border
    pd.rounded_rectangle([0, 0, panel_w - 1, panel_h - 1], radius=16, outline=(99, 102, 241, 80), width=1)

    # Panel header
    draw_rounded_rect(pd, [1, 1, panel_w - 2, 52], 16, fill=(25, 25, 55, 200))
    pd.rectangle([1, 36, panel_w - 2, 52], fill=(25, 25, 55, 200))

    hf = ImageFont.truetype(FONT_ZH, 15)
    pd.text((20, 17), 'W', fill=(255, 255, 255), font=ImageFont.truetype(FONT_ZH, 18))
    pd.text((45, 18), '威软YouTube下载工具', fill=(129, 140, 248), font=hf)

    # Close button
    pd.text((panel_w - 30, 16), '×', fill=(148, 163, 184), font=ImageFont.truetype(FONT_ZH, 20))

    # Video info area
    pd.rectangle([20, 65, 130, 125], fill=(30, 30, 60))
    draw_play_button(pd, 75, 95, 40, color=(255, 255, 255, 120))

    small_font = ImageFont.truetype(FONT_ZH, 12)
    tiny_font = ImageFont.truetype(FONT_ZH, 10)
    pd.text((145, 70), 'YouTube 高清视频示例', fill=(203, 213, 225), font=small_font)
    pd.text((145, 90), '威软科技 · 10:24 · 1,234,567 次观看', fill=(71, 85, 105), font=tiny_font)

    # Tabs
    tab_y = 140
    tabs = ['视频下载', '音频下载', '字幕下载']
    tab_w = (panel_w - 40) // 3
    for i, tab in enumerate(tabs):
        tx = 20 + i * tab_w
        color = (129, 140, 248) if i == 0 else (100, 116, 139)
        pd.text((tx + tab_w // 2 - 24, tab_y), tab, fill=color, font=small_font)
        if i == 0:
            pd.line([(tx, tab_y + 22), (tx + tab_w, tab_y + 22)], fill=(99, 102, 241), width=2)

    pd.line([(20, tab_y + 25), (panel_w - 20, tab_y + 25)], fill=(255, 255, 255, 15), width=1)

    # Format items
    formats_data = [
        ('1080p', 'HD', 'MP4 · avc1 · 30fps · 245.8 MB', (34, 197, 94)),
        ('720p', 'HD', 'MP4 · avc1 · 30fps · 128.3 MB', (34, 197, 94)),
        ('480p', '', 'MP4 · avc1 · 30fps · 68.5 MB', None),
        ('360p', '', 'MP4 · avc1 · 30fps · 34.2 MB', None),
        ('4K', '4K', 'WEBM · vp9 · 60fps · 1.2 GB', (251, 191, 36)),
        ('1440p', 'HD', 'WEBM · vp9 · 60fps · 580.0 MB', (34, 197, 94)),
    ]

    iy = tab_y + 40
    item_font = ImageFont.truetype(FONT_ZH, 13)
    detail_font = ImageFont.truetype(FONT_ZH, 10)
    btn_font = ImageFont.truetype(FONT_ZH, 11)

    for quality, badge, detail, badge_color in formats_data:
        if iy + 46 > panel_h - 30:
            break
        # Item background
        draw_rounded_rect(pd, [15, iy, panel_w - 15, iy + 44], 8, fill=(255, 255, 255, 8))

        # Quality text
        pd.text((28, iy + 8), quality, fill=(226, 232, 240), font=item_font)

        # Badge
        if badge and badge_color:
            bx = 28 + len(quality) * 12 + 8
            draw_rounded_rect(pd, [bx, iy + 8, bx + 28, iy + 22], 3, fill=(*badge_color, 30))
            pd.text((bx + 4, iy + 8), badge, fill=badge_color, font=ImageFont.truetype(FONT_ZH, 9))

        # Detail
        pd.text((28, iy + 26), detail, fill=(71, 85, 105), font=detail_font)

        # Download button
        bw, bh = 50, 26
        bx = panel_w - 15 - bw - 10
        by = iy + 9
        draw_rounded_rect(pd, [bx, by, bx + bw, by + bh], 6, fill=(99, 102, 241))
        pd.text((bx + 13, by + 5), '下载', fill=(255, 255, 255), font=btn_font)

        iy += 52

    # Footer
    pd.text((panel_w // 2 - 60, panel_h - 22), 'v1.0.0 · 威软科技出品', fill=(51, 65, 85), font=tiny_font)

    # Composite panel onto main image
    img = img.convert('RGBA')
    img.paste(panel_img, (panel_x, panel_y), panel_img)

    # Version badge at bottom
    final = img.convert('RGB')
    fd = ImageDraw.Draw(final)
    fd.text((W // 2 - 120, H - 35), 'v1.0.0  ·  油猴脚本  ·  Chrome扩展  ·  MIT License', fill=(71, 85, 105), font=ImageFont.truetype(FONT_ZH, 12))

    final.save(f'{OUT_DIR}/banner-main-1280x640.png', 'PNG', optimize=True)
    print('[OK] banner-main-1280x640.png')


# ═══════════════════════════════════════════
#  2. Square Logo Icon (512x512)
# ═══════════════════════════════════════════

def create_square_icon():
    SIZE = 512
    img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Rounded rect background with gradient
    radius = 100
    for y in range(SIZE):
        for x in range(SIZE):
            # Check rounded rect bounds
            in_rect = True
            corners = [
                (radius, radius, 0, 0),
                (SIZE - radius, radius, SIZE - 2 * radius, 0),
                (radius, SIZE - radius, 0, SIZE - 2 * radius),
                (SIZE - radius, SIZE - radius, SIZE - 2 * radius, SIZE - 2 * radius),
            ]
            if x < radius and y < radius:
                if (x - radius) ** 2 + (y - radius) ** 2 > radius ** 2:
                    in_rect = False
            elif x > SIZE - radius and y < radius:
                if (x - (SIZE - radius)) ** 2 + (y - radius) ** 2 > radius ** 2:
                    in_rect = False
            elif x < radius and y > SIZE - radius:
                if (x - radius) ** 2 + (y - (SIZE - radius)) ** 2 > radius ** 2:
                    in_rect = False
            elif x > SIZE - radius and y > SIZE - radius:
                if (x - (SIZE - radius)) ** 2 + (y - (SIZE - radius)) ** 2 > radius ** 2:
                    in_rect = False

            if in_rect:
                t = (x + y) / (2 * SIZE)
                r = int(80 + (158 - 80) * t)
                g = int(85 + (65 - 85) * t)
                b = int(235 + (240 - 235) * t)
                img.putpixel((x, y), (r, g, b, 255))

    draw = ImageDraw.Draw(img)

    # Download icon (large, centered)
    cx, cy = SIZE // 2, SIZE // 2 - 20
    lw = 28

    # Arrow shaft
    draw.line([(cx, cy - 100), (cx, cy + 40)], fill=(255, 255, 255, 240), width=lw)
    # Arrow head
    draw.line([(cx - 65, cy + 5), (cx, cy + 70)], fill=(255, 255, 255, 240), width=lw)
    draw.line([(cx + 65, cy + 5), (cx, cy + 70)], fill=(255, 255, 255, 240), width=lw)
    # Round caps at joints
    draw.ellipse([cx - 14, cy - 114, cx + 14, cy - 86], fill=(255, 255, 255, 240))
    draw.ellipse([cx - 14, cy + 56, cx + 14, cy + 84], fill=(255, 255, 255, 240))

    # Base line
    base_y = cy + 120
    draw.line([(cx - 100, base_y), (cx + 100, base_y)], fill=(255, 255, 255, 200), width=lw)
    draw.ellipse([cx - 100 - 14, base_y - 14, cx - 100 + 14, base_y + 14], fill=(255, 255, 255, 200))
    draw.ellipse([cx + 100 - 14, base_y - 14, cx + 100 + 14, base_y + 14], fill=(255, 255, 255, 200))

    # Brand text
    font_brand = ImageFont.truetype(FONT_ZH, 36)
    draw.text((SIZE // 2 - 72, SIZE - 80), 'WeiRuan', fill=(255, 255, 255, 140), font=font_brand)

    img.save(f'{OUT_DIR}/icon-512x512.png', 'PNG', optimize=True)
    print('[OK] icon-512x512.png')


# ═══════════════════════════════════════════
#  3. Chrome Web Store Tile (440x280)
# ═══════════════════════════════════════════

def create_chrome_store_tile():
    W, H = 440, 280
    img = create_gradient_bg(W, H, [
        (12, 12, 32), (22, 20, 58), (12, 12, 32)
    ])
    draw = ImageDraw.Draw(img)

    # Glow
    draw_glow_circle(img, W // 2, H // 2, 150, (99, 102, 241), alpha=18)
    draw = ImageDraw.Draw(img)

    # Particles
    draw_star_particles(draw, W, H, count=20)

    # Logo icon
    icon_size = 64
    ix = W // 2 - icon_size // 2
    iy = 40
    draw_rounded_rect(draw, [ix, iy, ix + icon_size, iy + icon_size], 14, fill=(99, 102, 241))
    draw_download_icon(draw, ix + icon_size // 2, iy + icon_size // 2 - 2, icon_size - 10, color=(255, 255, 255))

    # Title
    font_title = ImageFont.truetype(FONT_ZH, 26)
    font_sub = ImageFont.truetype(FONT_ZH, 13)
    font_en = ImageFont.truetype(FONT_ZH, 12)

    draw.text((W // 2 - 130, iy + icon_size + 18), '威软YouTube下载工具', fill=(255, 255, 255), font=font_title)
    draw.text((W // 2 - 115, iy + icon_size + 55), 'WeiRuan YouTube Video Downloader', fill=(148, 163, 184), font=font_en)

    # Features row
    fy = iy + icon_size + 85
    features = ['自由选择分辨率', '字幕下载', '高端UI', '低内存']
    total_w = sum(len(f) * 12 + 24 for f in features) + 10 * (len(features) - 1)
    fx = (W - total_w) // 2

    tag_font = ImageFont.truetype(FONT_ZH, 11)
    colors = [(99, 102, 241), (168, 85, 247), (59, 130, 246), (34, 197, 94)]
    for i, feat in enumerate(features):
        tw = len(feat) * 12 + 20
        c = colors[i]
        draw_rounded_rect(draw, [fx, fy, fx + tw, fy + 24], 6, fill=(c[0], c[1], c[2], 40) if False else (c[0] // 4, c[1] // 4, c[2] // 4))
        draw.text((fx + 10, fy + 4), feat, fill=c, font=tag_font)
        fx += tw + 10

    # Bottom
    draw.text((W // 2 - 60, H - 30), 'Chrome扩展 · MIT License', fill=(71, 85, 105), font=ImageFont.truetype(FONT_ZH, 10))

    img.save(f'{OUT_DIR}/chrome-store-tile-440x280.png', 'PNG', optimize=True)
    print('[OK] chrome-store-tile-440x280.png')


# ═══════════════════════════════════════════
#  4. Greasy Fork / Script Banner (800x450)
# ═══════════════════════════════════════════

def create_script_banner():
    W, H = 800, 450
    img = create_gradient_bg(W, H, [
        (10, 10, 28), (18, 16, 50), (28, 24, 70), (18, 16, 50), (10, 10, 28)
    ])
    draw = ImageDraw.Draw(img)

    # Glows
    draw_glow_circle(img, 150, 225, 250, (99, 102, 241), alpha=12)
    draw_glow_circle(img, 650, 225, 200, (168, 85, 247), alpha=10)
    draw = ImageDraw.Draw(img)

    draw_star_particles(draw, W, H, count=40)

    # ── Central content ──
    # Logo
    logo_size = 72
    lx = W // 2 - logo_size // 2
    ly = 50
    draw_rounded_rect(draw, [lx, ly, lx + logo_size, ly + logo_size], 16, fill=(99, 102, 241))
    draw_download_icon(draw, lx + logo_size // 2, ly + logo_size // 2 - 2, logo_size - 12, color=(255, 255, 255))

    # Title
    font_title = ImageFont.truetype(FONT_ZH, 38)
    font_sub = ImageFont.truetype(FONT_ZH, 16)
    font_en = ImageFont.truetype(FONT_ZH, 14)

    title = '威软YouTube视频下载工具'
    tw = len(title) * 38
    draw.text((W // 2 - tw // 2 + 10, ly + logo_size + 20), title, fill=(255, 255, 255), font=font_title)

    en_text = 'WeiRuan YouTube Video Downloader v1.0.0'
    draw.text((W // 2 - len(en_text) * 7 // 2, ly + logo_size + 70), en_text, fill=(148, 163, 184), font=font_en)

    # Divider
    div_y = ly + logo_size + 100
    draw.line([(W // 2 - 150, div_y), (W // 2 + 150, div_y)], fill=(99, 102, 241, 100), width=1)

    # Feature cards
    card_y = div_y + 20
    card_data = [
        ('全分辨率', '360p~8K', (99, 102, 241)),
        ('字幕下载', 'SRT/VTT', (168, 85, 247)),
        ('高端UI', '暗色毛玻璃', (59, 130, 246)),
        ('零依赖', '低内存', (34, 197, 94)),
    ]

    card_w = 150
    card_h = 70
    card_gap = 20
    total_cards_w = len(card_data) * card_w + (len(card_data) - 1) * card_gap
    card_x_start = (W - total_cards_w) // 2

    card_title_font = ImageFont.truetype(FONT_ZH, 15)
    card_desc_font = ImageFont.truetype(FONT_ZH, 12)

    for i, (title, desc, color) in enumerate(card_data):
        cx = card_x_start + i * (card_w + card_gap)
        # Card bg
        draw_rounded_rect(draw, [cx, card_y, cx + card_w, card_y + card_h], 10, fill=(color[0] // 8, color[1] // 8, color[2] // 8))
        # Top accent line
        draw.line([(cx + 10, card_y + 2), (cx + card_w - 10, card_y + 2)], fill=color, width=2)
        # Text
        draw.text((cx + card_w // 2 - len(title) * 8, card_y + 18), title, fill=color, font=card_title_font)
        draw.text((cx + card_w // 2 - len(desc) * 6, card_y + 42), desc, fill=(148, 163, 184), font=card_desc_font)

    # Platform badges
    badge_y = card_y + card_h + 30
    badge_font = ImageFont.truetype(FONT_ZH, 13)

    badges = [('Tampermonkey 油猴脚本', (99, 102, 241)), ('Chrome 扩展', (168, 85, 247))]
    bx = W // 2 - 170
    for text, color in badges:
        bw = len(text) * 13 + 24
        draw_rounded_rect(draw, [bx, badge_y, bx + bw, badge_y + 30], 8, fill=(color[0] // 5, color[1] // 5, color[2] // 5))
        draw.text((bx + 12, badge_y + 6), text, fill=color, font=badge_font)
        bx += bw + 16

    # Footer
    draw.text((W // 2 - 55, H - 32), '威软科技 · MIT License', fill=(71, 85, 105), font=ImageFont.truetype(FONT_ZH, 11))

    img.save(f'{OUT_DIR}/script-banner-800x450.png', 'PNG', optimize=True)
    print('[OK] script-banner-800x450.png')


# ═══════════════════════════════════════════
#  5. Social Share Card (1200x630)
# ═══════════════════════════════════════════

def create_social_card():
    W, H = 1200, 630
    img = create_gradient_bg(W, H, [
        (10, 10, 30), (20, 18, 55), (28, 24, 68), (20, 18, 55), (10, 10, 30)
    ])
    draw = ImageDraw.Draw(img)

    draw_glow_circle(img, W // 2, H // 2, 300, (99, 102, 241), alpha=12)
    draw = ImageDraw.Draw(img)
    draw_star_particles(draw, W, H, count=40)

    # Large centered logo
    logo_size = 90
    lx = W // 2 - logo_size // 2
    ly = 100
    draw_rounded_rect(draw, [lx, ly, lx + logo_size, ly + logo_size], 20, fill=(99, 102, 241))
    draw_download_icon(draw, lx + logo_size // 2, ly + logo_size // 2 - 2, logo_size - 14, color=(255, 255, 255))

    # Title
    font_title = ImageFont.truetype(FONT_ZH, 48)
    font_sub = ImageFont.truetype(FONT_ZH, 20)
    font_en = ImageFont.truetype(FONT_ZH, 16)

    title = '威软YouTube视频下载工具'
    draw.text((W // 2 - len(title) * 24, ly + logo_size + 30), title, fill=(255, 255, 255), font=font_title)

    sub = 'WeiRuan YouTube Video Downloader'
    draw.text((W // 2 - len(sub) * 5, ly + logo_size + 90), sub, fill=(148, 163, 184), font=font_en)

    # Feature line
    fy = ly + logo_size + 130
    draw.line([(W // 2 - 200, fy), (W // 2 + 200, fy)], fill=(99, 102, 241), width=1)

    feat_font = ImageFont.truetype(FONT_ZH, 18)
    features = '自由选择分辨率  ·  字幕下载  ·  高端UI  ·  低内存  ·  零依赖'
    draw.text((W // 2 - len(features) * 5, fy + 18), features, fill=(165, 180, 252), font=ImageFont.truetype(FONT_ZH, 15))

    # Platform tags
    py = fy + 60
    tag_font = ImageFont.truetype(FONT_ZH, 14)
    tags = [('油猴脚本', (99, 102, 241)), ('Chrome扩展', (168, 85, 247)), ('MIT开源', (34, 197, 94))]
    tx = W // 2 - 160
    for text, color in tags:
        tw = len(text) * 14 + 24
        draw_rounded_rect(draw, [tx, py, tx + tw, py + 32], 8, fill=(color[0] // 5, color[1] // 5, color[2] // 5))
        draw.text((tx + 12, py + 6), text, fill=color, font=tag_font)
        tx += tw + 14

    # Footer
    draw.text((W // 2 - 40, H - 40), '威软科技出品', fill=(71, 85, 105), font=ImageFont.truetype(FONT_ZH, 13))

    img.save(f'{OUT_DIR}/social-card-1200x630.png', 'PNG', optimize=True)
    print('[OK] social-card-1200x630.png')


# ═══════════════════════════════════════════
#  6. High-Res App Icons
# ═══════════════════════════════════════════

def create_app_icons():
    """Create refined app icons in multiple sizes."""
    sizes = [256, 192, 128, 64]

    for size in sizes:
        img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)

        radius = size // 5
        s = size / 128.0

        # Rounded rectangle with gradient
        for y in range(size):
            for x in range(size):
                in_rect = True
                if x < radius and y < radius:
                    if (x - radius) ** 2 + (y - radius) ** 2 > radius ** 2:
                        in_rect = False
                elif x > size - radius and y < radius:
                    if (x - (size - radius)) ** 2 + (y - radius) ** 2 > radius ** 2:
                        in_rect = False
                elif x < radius and y > size - radius:
                    if (x - radius) ** 2 + (y - (size - radius)) ** 2 > radius ** 2:
                        in_rect = False
                elif x > size - radius and y > size - radius:
                    if (x - (size - radius)) ** 2 + (y - (size - radius)) ** 2 > radius ** 2:
                        in_rect = False

                if in_rect:
                    t = (x + y) / (2 * size)
                    r = int(85 + (155 - 85) * t)
                    g = int(90 + (70 - 90) * t)
                    b = int(238 + (242 - 238) * t)
                    img.putpixel((x, y), (r, g, b, 255))

        draw = ImageDraw.Draw(img)
        cx = size // 2
        cy = size // 2 - int(5 * s)
        lw = max(int(8 * s), 2)

        # Download arrow
        draw.line([(cx, cy - int(32 * s)), (cx, cy + int(12 * s))], fill=(255, 255, 255, 245), width=lw)
        draw.line([(cx - int(20 * s), cy - int(3 * s)), (cx, cy + int(22 * s))], fill=(255, 255, 255, 245), width=lw)
        draw.line([(cx + int(20 * s), cy - int(3 * s)), (cx, cy + int(22 * s))], fill=(255, 255, 255, 245), width=lw)

        # Base
        base_y = cy + int(38 * s)
        draw.line([(cx - int(28 * s), base_y), (cx + int(28 * s), base_y)], fill=(255, 255, 255, 200), width=lw)

        img.save(f'{OUT_DIR}/icon-{size}x{size}.png', 'PNG', optimize=True)
        print(f'[OK] icon-{size}x{size}.png')


# ═══════════════════════════════════════════
#  Run All Generators
# ═══════════════════════════════════════════

if __name__ == '__main__':
    print('=== 威软YouTube下载工具 - 宣传图标生成 ===\n')

    create_main_banner()
    create_square_icon()
    create_chrome_store_tile()
    create_script_banner()
    create_social_card()
    create_app_icons()

    print(f'\n=== 全部完成! 文件保存在: {OUT_DIR} ===')
