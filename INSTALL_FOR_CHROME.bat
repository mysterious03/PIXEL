@echo off
title PIXEL (ISRO PS-26171) - Chrome Extension Launcher for Evaluators
color 0B
echo =========================================================================
echo   PIXEL: On-Device Visual Perception for Lightweight Browser Agents
echo   Smart India Hackathon 2026 - Problem Statement 26171 (ISRO)
echo =========================================================================
echo.
echo Launching Google Chrome with PIXEL Extension plugged in directly...
echo.

node "%~dp0tools\install-extension.js"

echo.
echo If Chrome did not launch automatically, follow these 2 simple steps:
echo 1. Open Google Chrome and go to: chrome://extensions
echo 2. Enable "Developer mode" (top right) and click "Load unpacked"
echo    Select this folder: %~dp0extension
echo.
pause
