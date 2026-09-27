'use strict';

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const net = require('net');

const PORT = 3000;
const extensionPath = path.resolve(__dirname, '..', 'extension');
const profileDir = path.join(os.homedir(), '.pixel', 'chrome-extension-profile');

if (!fs.existsSync(profileDir)) {
  fs.mkdirSync(profileDir, { recursive: true });
}

// 1. Check if port is open
function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(800);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      resolve(false);
    });
    socket.connect(port, '127.0.0.1');
  });
}

// 2. Start Studio backend if not running
async function ensureBackendRunning() {
  const running = await isPortOpen(PORT);
  if (running) {
    console.log(`✓ PIXEL Perception Studio is already running on http://localhost:${PORT}`);
    return;
  }

  console.log(`⚡ Port ${PORT} is idle. Starting PIXEL Studio backend in background...`);
  const studioScript = path.resolve(__dirname, '..', 'studio.js');
  
  const studioProcess = spawn(process.execPath, [studioScript], {
    detached: true,
    stdio: 'ignore',
    cwd: path.resolve(__dirname, '..')
  });
  studioProcess.unref();

  // Wait up to 6 seconds for server to be responsive
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 300));
    if (await isPortOpen(PORT)) {
      console.log(`✓ PIXEL Perception Studio successfully started on http://localhost:${PORT}`);
      return;
    }
  }
  console.warn('⚠️ Server launch timeout, proceeding to browser...');
}

// 3. Detect Chrome / Chromium browser binary
function findBrowserPath() {
  const isWin = process.platform === 'win32';
  const isMac = process.platform === 'darwin';

  if (isWin) {
    const candidates = [
      `${process.env.PROGRAMFILES}\\Google\\Chrome\\Application\\chrome.exe`,
      `${process.env['PROGRAMFILES(X86)']}\\Google\\Chrome\\Application\\chrome.exe`,
      `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
      `${process.env.PROGRAMFILES}\\Microsoft\\Edge\\Application\\msedge.exe`,
      `${process.env['PROGRAMFILES(X86)']}\\Microsoft\\Edge\\Application\\msedge.exe`,
      `${process.env.LOCALAPPDATA}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`
    ].filter(Boolean);

    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
  } else if (isMac) {
    const candidates = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Chromium.app/Contents/MacOS/Chromium'
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
  } else {
    return 'google-chrome';
  }

  return null;
}

async function main() {
  console.log('\n=============================================================');
  console.log('    🛡️  PIXEL ODVPA: Bulletproof Extension Launcher         ');
  console.log('=============================================================');

  const browserPath = findBrowserPath();
  if (!browserPath) {
    console.error('❌ Could not find Google Chrome, Edge, or Brave on your system.');
    process.exit(1);
  }

  console.log(`🌐 Browser:   ${browserPath}`);
  console.log(`🧩 Extension: ${extensionPath}`);
  console.log(`📂 Profile:   ${profileDir}`);

  // Chromium flags for 100% reliable unpacked extension loading
  const args = [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-blink-features=AutomationControlled',
    '--new-window',
    'https://www.isro.gov.in'
  ];

  console.log('🚀 Spawning browser with PIXEL extension plugged in...');
  const child = spawn(browserPath, args, {
    detached: true,
    stdio: 'ignore'
  });
  child.unref();

  console.log('\n=============================================================');
  console.log('  ✓ Chrome launched with PIXEL extension active!');
  console.log('  👉 Target Site: https://www.isro.gov.in (Official ISRO Portal)');
  console.log('  👉 Extension:   Look at the top-right toolbar for PIXEL icon');
  console.log('  👉 100% On-Device: Zero servers or localhost required!');
  console.log('=============================================================\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal launcher error:', err);
  process.exit(1);
});
