# 威软YouTube视频下载工具

<p align="center">
  <strong>WeiRuan YouTube Video Downloader</strong><br>
  高清YouTube视频下载 · 自由选择分辨率 · 字幕下载 · 低内存占用 · Windows桌面版
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-6366f1?style=flat-square" alt="version">
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="license">
  <img src="https://img.shields.io/badge/platform-Chrome%20%7C%20Tampermonkey%20%7C%20Windows-8b5cf6?style=flat-square" alt="platform">
</p>

---

## 功能特性

- **自由选择分辨率** — 支持 360p / 480p / 720p / 1080p / 1440p / 4K / 8K 等全部可用分辨率
- **字幕下载** — 支持下载 SRT 和 VTT 格式字幕（含自动生成字幕与人工字幕）
- **音频提取** — 独立下载音频轨道，支持多种码率选择
- **高端UI设计** — 暗色主题 + 毛玻璃效果 + 渐变配色，视觉体验优秀
- **低内存占用** — 纯原生 JavaScript 实现，无第三方依赖，占用极少资源
- **三版本发布** — 油猴脚本、Chrome 扩展、Windows 桌面应用三种使用方式

---

## 项目结构

```
weiruan-youtube-Download/
├── tampermonkey/                          # 油猴脚本版本
│   └── weiruan-youtube-downloader.user.js # Tampermonkey 用户脚本
├── chrome-extension/                      # Chrome 扩展版本
│   ├── manifest.json                      # 扩展配置文件 (Manifest V3)
│   ├── popup.html                         # 弹出窗口页面
│   ├── css/
│   │   ├── popup.css                      # 弹出窗口样式
│   │   └── content.css                    # 内容脚本样式
│   ├── js/
│   │   ├── popup.js                       # 弹出窗口逻辑
│   │   ├── content.js                     # 内容脚本（页面注入）
│   │   └── background.js                  # 后台服务脚本
│   └── icons/                             # 扩展图标
│       ├── icon.svg
│       ├── icon16.png
│       ├── icon32.png
│       ├── icon48.png
│       └── icon128.png
├── desktop-app/                          # Windows 桌面应用版本
│   ├── main.py                           # 主入口 (pywebview + API)
│   ├── ytdl_engine.py                    # yt-dlp 下载引擎
│   ├── ui/
│   │   ├── index.html                    # 桌面端 UI 页面
│   │   ├── style.css                     # 桌面端样式
│   │   └── app.js                        # 桌面端前端逻辑
│   ├── requirements.txt                  # Python 依赖
│   ├── build.bat                         # Windows 构建脚本
│   └── run.bat                           # 快速启动脚本
├── LICENSE
└── README.md
```

---

## 安装使用

### 方式一：油猴脚本（Tampermonkey）

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展
2. 点击 Tampermonkey 图标 → 添加新脚本
3. 将 `tampermonkey/weiruan-youtube-downloader.user.js` 的全部内容复制粘贴进去
4. 保存脚本（Ctrl+S）
5. 打开任意 YouTube 视频页面，右下角出现下载按钮即安装成功

**使用方法：**
- 点击页面右下角的紫色下载按钮打开面板
- 在「视频下载」标签选择需要的分辨率和格式
- 在「音频下载」标签选择音频码率
- 在「字幕下载」标签选择语言，点击 SRT 或 VTT 下载字幕

### 方式二：Chrome 扩展

1. 打开 Chrome 浏览器，地址栏输入 `chrome://extensions/`
2. 开启右上角的「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择项目中的 `chrome-extension` 文件夹
5. 扩展安装完成，工具栏出现威软下载图标

**使用方法：**
- 打开任意 YouTube 视频页面
- 点击浏览器工具栏的威软下载图标
- 在弹出面板中选择视频/音频/字幕进行下载

### 方式三：Windows 桌面应用

**环境要求：**
- Python 3.10+
- Windows 10/11（使用 WebView2 渲染引擎）
- FFmpeg（推荐，用于合并视频+音频）

**安装运行：**

```bash
cd desktop-app
pip install -r requirements.txt
python main.py
```

**打包为 EXE：**

```bash
cd desktop-app
build.bat
```

打包完成后输出目录为 `dist/威软YouTube下载工具/`

**使用方法：**
- 粘贴 YouTube 链接到地址栏，点击「解析」或按回车
- 「快速下载」标签：选择预设画质（4K / 2K / 1080p 等），一键下载
- 「视频」标签：查看所有可用格式，自由选择下载
- 「音频」标签：独立下载音频轨道
- 「字幕」标签：下载 SRT / VTT 格式字幕
- 点击底部文件夹图标可更改下载目录

**桌面版技术栈：**
- **pywebview** — 轻量级跨平台 WebView 容器（Windows 使用 WebView2）
- **yt-dlp** — 强大的视频下载引擎
- **PyInstaller** — Python 应用打包为 Windows 可执行文件

---

## 界面预览

### 功能面板

| 功能 | 说明 |
|------|------|
| 视频下载 | 列出所有可用分辨率，区分「视频+音频」和「仅视频」格式 |
| 音频下载 | 列出所有可用音频码率 |
| 字幕下载 | 列出所有可用字幕语言，支持 SRT/VTT 两种格式导出 |

### UI 设计特点

- **暗色主题**：深邃的深蓝黑背景，减少视觉疲劳
- **渐变配色**：紫色-靛蓝渐变，打造科技感视觉效果
- **毛玻璃效果**：`backdrop-filter` 实现现代毛玻璃质感
- **流畅动画**：面板弹出、按钮悬浮等细腻过渡动画
- **清晰分级**：HD / 4K / 8K 等彩色标签，一目了然

---

## 技术实现

### 数据获取方式
1. **页面解析**：从 `ytInitialPlayerResponse` 全局变量中提取视频数据
2. **API 回退**：当页面解析失败时，通过 YouTube InnerTube API 获取数据

### 格式解析
- 解析 `streamingData.formats`（视频+音频混合流）
- 解析 `streamingData.adaptiveFormats`（自适应独立流）
- 提取分辨率、编码器、帧率、文件大小等完整信息

### 字幕处理
- 从 `captions.playerCaptionsTracklistRenderer` 提取字幕轨道列表
- 支持 VTT 格式直接下载
- 支持 SRV3 → SRT 格式转换下载

### 性能优化
- 纯原生 JavaScript，零依赖
- 数据缓存机制，避免重复请求
- SPA 导航检测，自动更新数据
- 最小化 DOM 操作

---

## 注意事项

- 本工具仅供个人学习研究使用
- 请遵守 YouTube 服务条款和相关法律法规
- 下载内容的版权归原作者所有
- 部分受保护视频可能无法获取下载链接
- 高分辨率「仅视频」格式不含音轨，需要使用 FFmpeg 等工具合并音视频

---

## 许可证

[MIT License](LICENSE)

---

<p align="center">
  <strong>威软科技 (WeiRuan Tech)</strong><br>
  Made with care for video enthusiasts
</p>
