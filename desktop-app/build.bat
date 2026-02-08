@echo off
chcp 65001 >nul
echo ════════════════════════════════════════
echo   威软YouTube视频下载工具 - 构建脚本
echo ════════════════════════════════════════
echo.

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 Python，请先安装 Python 3.10+
    pause
    exit /b 1
)

:: Install dependencies
echo [1/3] 安装依赖...
pip install -r requirements.txt
if errorlevel 1 (
    echo [错误] 依赖安装失败
    pause
    exit /b 1
)

:: Build with PyInstaller
echo.
echo [2/3] 打包应用程序...
pyinstaller ^
    --noconfirm ^
    --onedir ^
    --windowed ^
    --name "威软YouTube下载工具" ^
    --add-data "ui;ui" ^
    --hidden-import "clr" ^
    --hidden-import "webview" ^
    --hidden-import "yt_dlp" ^
    main.py

if errorlevel 1 (
    echo [错误] 打包失败
    pause
    exit /b 1
)

:: Copy ffmpeg if available
echo.
echo [3/3] 检查 ffmpeg...
where ffmpeg >nul 2>&1
if not errorlevel 1 (
    echo 复制 ffmpeg 到输出目录...
    copy /Y "$(where ffmpeg)" "dist\威软YouTube下载工具\" >nul 2>&1
) else (
    echo [提示] 未找到 ffmpeg，合并视频+音频功能需要 ffmpeg
    echo        请从 https://ffmpeg.org 下载并放入程序目录
)

echo.
echo ════════════════════════════════════════
echo   构建完成!
echo   输出目录: dist\威软YouTube下载工具\
echo ════════════════════════════════════════
pause
