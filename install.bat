@echo off
title PIXEL Chrome Extension Installer (ISRO PS-26171)
color 0B

echo =========================================================================
echo   PIXEL: On-Device Visual Perception Browser Agent
echo   Smart India Hackathon 2026 - Problem Statement 26171 (ISRO)
echo =========================================================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% equ 0 (
    node "%~dp0tools\install-extension.js"
    exit /b 0
)

:: Standalone fallback if Node.js is not installed on the judge's machine
echo [Pure Windows Mode] Node.js not detected. Launching Chrome directly...

set "EXT_DIR=%~dp0extension"
set "PROFILE_DIR=%LOCALAPPDATA%\PIXEL-Chrome-Profile"

set "CHROME_EXE="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "CHROME_EXE=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "CHROME_EXE=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "CHROME_EXE=%LocalAppData%\Google\Chrome\Application\chrome.exe"
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" set "CHROME_EXE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"

if "%CHROME_EXE%"=="" (
    echo Error: Could not find Google Chrome or Microsoft Edge.
    pause
    exit /b 1
)

echo Found browser: "%CHROME_EXE%"
echo Extension path: "%EXT_DIR%"
echo.
echo Launching Chrome with PIXEL extension plugged in...

start "" "%CHROME_EXE%" --user-data-dir="%PROFILE_DIR%" --load-extension="%EXT_DIR%" --disable-extensions-except="%EXT_DIR%" --no-first-run --no-default-browser-check https://www.isro.gov.in

echo.
echo =========================================================================
echo   SUCCESS: Chrome launched with PIXEL extension active!
echo   Click the puzzle icon in Chrome's toolbar and pin PIXEL ODVPA.
echo =========================================================================
echo.
pause
