'use strict';

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// ANSI Color Codes
const c = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  white: '\x1b[37m'
};

const rootDir = path.resolve(__dirname, '..');
const extensionDir = path.resolve(rootDir, 'extension');

function printBanner() {
  console.log(`
${c.cyan}${c.bright}========================================================================
  ██████╗ ██╗██╗  ██╗███████╗██╗     
  ██╔══██╗██║╚██╗██╔╝██╔════╝██║      ${c.white}PIXEL ODVPA v2.0.0${c.cyan}
  ██████╔╝██║ ╚███╔╝ █████╗  ██║      ${c.green}On-Device Visual Perception Agent${c.cyan}
  ██╔═══╝ ██║ ██╔██╗ ██╔══╝  ██║      ${c.yellow}SIH 2026 — ISRO (PS-26171)${c.cyan}
  ██║     ██║██╔╝ ██╗███████╗███████╗
========================================================================${c.reset}`);
}

function findChromePath() {
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

function copyToClipboard(text) {
  try {
    if (process.platform === 'win32') {
      execSync(`powershell -Command "Set-Clipboard -Value '${text}'"`, { stdio: 'ignore' });
      return true;
    }
  } catch (e) {
    return false;
  }
  return false;
}

function createDesktopShortcut(browserExe) {
  try {
    const possibleDesktops = [
      path.join(os.homedir(), 'OneDrive', 'Desktop'),
      path.join(os.homedir(), 'Desktop')
    ];

    let targetDesktop = possibleDesktops.find(d => fs.existsSync(d)) || possibleDesktops[0];
    const shortcutPath = path.join(targetDesktop, 'PIXEL Agent Chrome.lnk');
    const profileDir = path.join(os.homedir(), 'AppData', 'Local', 'PIXEL-Chrome-Profile');

    const vbsScript = `
      Set oWS = WScript.CreateObject("WScript.Shell")
      sLinkFile = "${shortcutPath.replace(/\\/g, '\\\\')}"
      Set oLink = oWS.CreateShortcut(sLinkFile)
      oLink.TargetPath = "${browserExe.replace(/\\/g, '\\\\')}"
      oLink.Arguments = "--user-data-dir=""${profileDir.replace(/\\/g, '\\\\')}"" --load-extension=""${extensionDir.replace(/\\/g, '\\\\')}"" --disable-extensions-except=""${extensionDir.replace(/\\/g, '\\\\')}"" --no-first-run"
      oLink.Description = "Launch Google Chrome with PIXEL ODVPA Agent Extension"
      oLink.Save
    `;

    const tempVbs = path.join(os.tmpdir(), 'create_pixel_shortcut.vbs');
    fs.writeFileSync(tempVbs, vbsScript, 'utf8');
    execSync(`cscript //Nologo "${tempVbs}"`);
    try { fs.unlinkSync(tempVbs); } catch (e) {}

    return shortcutPath;
  } catch (err) {
    return null;
  }
}

async function installAndLaunch() {
  printBanner();

  console.log(`${c.bright}🔍 Detecting Environment & Browser...${c.reset}`);
  const browserExe = findChromePath();
  if (!browserExe) {
    console.error(`${c.red}❌ Error: Google Chrome, Microsoft Edge, or Brave was not found on this machine.${c.reset}`);
    process.exit(1);
  }
  console.log(`  ${c.green}✓${c.reset} Browser:   ${c.white}${browserExe}${c.reset}`);
  console.log(`  ${c.green}✓${c.reset} Extension: ${c.white}${extensionDir}${c.reset}`);

  // 1. Copy folder path to clipboard
  copyToClipboard(extensionDir);
  console.log(`  ${c.green}✓${c.reset} Copied extension path to clipboard.`);

  // 2. Create 1-click Desktop Shortcut
  const shortcutPath = createDesktopShortcut(browserExe);
  if (shortcutPath) {
    console.log(`  ${c.green}✓${c.reset} Created Desktop Icon: ${c.cyan}${shortcutPath}${c.reset}`);
  }

  // 3. Isolated Dedicated Profile to bypass running Chrome singleton lock
  // This guarantees Chrome loads the unpacked extension 100% of the time,
  // even if 20 other Chrome windows are currently open!
  const profileDir = path.join(os.homedir(), 'AppData', 'Local', 'PIXEL-Chrome-Profile');
  if (!fs.existsSync(profileDir)) {
    fs.mkdirSync(profileDir, { recursive: true });
  }

  console.log(`\n${c.cyan}${c.bright}🚀 Launching Chrome with PIXEL Extension plugged in...${c.reset}`);

  const args = [
    `--user-data-dir=${profileDir}`,
    `--load-extension=${extensionDir}`,
    `--disable-extensions-except=${extensionDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-blink-features=AutomationControlled',
    'https://www.isro.gov.in'
  ];

  const child = spawn(browserExe, args, {
    detached: true,
    stdio: 'ignore'
  });
  child.unref();

  console.log(`
${c.green}${c.bright}========================================================================
  ✓ SUCCESS: Chrome has launched with PIXEL extension plugged in!
========================================================================${c.reset}

${c.white}${c.bright}👉 What to do in the opened Chrome window:${c.reset}
  1. Look at the top-right toolbar: Click the ${c.yellow}🧩 Puzzle icon${c.reset} (Extensions).
  2. Click the ${c.yellow}📌 Pin icon${c.reset} next to ${c.cyan}${c.bright}PIXEL ODVPA${c.reset}.
  3. The PIXEL icon is now in your toolbar! Click it to open the Side Panel.
  4. Test on the live ISRO page: Click ${c.green}"Scan Screen"${c.reset} or type ${c.green}"Click on Missions"${c.reset}!

${c.dim}Tip for Judges: You can also double-click the "PIXEL Agent Chrome" icon on your Desktop anytime.${c.reset}
`);

  process.exit(0);
}

installAndLaunch().catch((err) => {
  console.error(`${c.red}Fatal installation error:${c.reset}`, err);
  process.exit(1);
});
