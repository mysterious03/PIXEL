# PIXEL Extension - Direct Terminal Chrome Plugin
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host "  PIXEL: Direct Terminal Chrome Extension Plugin (ISRO PS-26171) " -ForegroundColor Green
Write-Host "=============================================================" -ForegroundColor Cyan

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
node "$scriptDir\tools\install-extension.js"
