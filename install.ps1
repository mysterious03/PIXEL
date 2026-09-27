# ==============================================================================
# PIXEL ODVPA - 1-Line Global Windows Terminal Installer
# Exactly like Ollama (irm ... | iex)
# ==============================================================================

$ErrorActionPreference = 'Stop'

Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "  PIXEL: On-Device Visual Perception Browser Agent (ISRO PS-26171)      " -ForegroundColor Green
Write-Host "  1-Line Global Terminal Installer                                      " -ForegroundColor Yellow
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host ""

$installDir = "$HOME\.pixel"
$binDir = "$installDir\bin"
$extensionDir = "$installDir\extension"

# 1. Check if installing from remote web or local repository
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if ($scriptDir -and (Test-Path "$scriptDir\extension")) {
    Write-Host "[1/4] Installing from local directory: $scriptDir" -ForegroundColor Cyan
    if (!(Test-Path $installDir)) { New-Item -ItemType Directory -Path $installDir -Force | Out-Null }
    Copy-Item -Path "$scriptDir\*" -Destination $installDir -Recurse -Force
} else {
    Write-Host "[1/4] Downloading latest PIXEL from GitHub..." -ForegroundColor Cyan
    if (!(Test-Path $installDir)) { New-Item -ItemType Directory -Path $installDir -Force | Out-Null }
    $zipUrl = "https://github.com/mysterious03/PIXEL/archive/refs/heads/main.zip"
    $zipFile = "$installDir\pixel-latest.zip"
    
    Invoke-WebRequest -Uri $zipUrl -OutFile $zipFile -UseBasicParsing
    Expand-Archive -Path $zipFile -DestinationPath "$installDir\temp" -Force
    Copy-Item -Path "$installDir\temp\PIXEL-main\*" -Destination $installDir -Recurse -Force
    Remove-Item -Path "$installDir\temp" -Recurse -Force
    Remove-Item -Path $zipFile -Force
}

# 2. Create Global CLI executable 'pixel' in $binDir
Write-Host "[2/4] Registering global 'pixel' command..." -ForegroundColor Cyan
if (!(Test-Path $binDir)) { New-Item -ItemType Directory -Path $binDir -Force | Out-Null }

$cmdContent = '@echo off' + [Environment]::NewLine + 'node "' + $installDir + '\tools\install-extension.js"'
[System.IO.File]::WriteAllText("$binDir\pixel.cmd", $cmdContent)

# 3. Add to Permanent User PATH if not already present
Write-Host "[3/4] Adding PIXEL to Windows PATH..." -ForegroundColor Cyan
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($currentPath -notlike "*$binDir*") {
    [Environment]::SetEnvironmentVariable("Path", "$currentPath;$binDir", "User")
    $env:Path += ";$binDir"
    Write-Host "  [OK] Added $binDir to user PATH." -ForegroundColor Green
} else {
    Write-Host "  [OK] $binDir is already in user PATH." -ForegroundColor Green
}

# 4. Launch Chrome with extension plugged in immediately
Write-Host "[4/4] Plugging PIXEL into Google Chrome..." -ForegroundColor Cyan

$candidates = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LocalAppData\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
)

$browser = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($browser) {
    $profileDir = "$env:LocalAppData\PIXEL-Chrome-Profile"
    $argsList = @(
        "--user-data-dir=$profileDir",
        "--load-extension=$extensionDir",
        "--no-first-run",
        "--no-default-browser-check",
        "https://www.isro.gov.in"
    )
    Start-Process -FilePath $browser -ArgumentList $argsList
    Write-Host "  [OK] Chrome launched with PIXEL active!" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================================================" -ForegroundColor Green
Write-Host "  SUCCESS: PIXEL is now installed globally on this computer!            " -ForegroundColor Green
Write-Host "========================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "You can now open ANY terminal and simply type:" -ForegroundColor Yellow
Write-Host "    pixel" -ForegroundColor Cyan
Write-Host "    pixel ext" -ForegroundColor Cyan
Write-Host "    pixel studio" -ForegroundColor Cyan
Write-Host ""
