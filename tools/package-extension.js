'use strict';

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.join(__dirname, '..');
const extensionDir = path.join(rootDir, 'extension');
const zipOut = path.join(rootDir, 'pixel-extension-v2.0.0.zip');

console.log('[PIXEL Extension Packager]');
console.log(`Packaging extension folder: ${extensionDir}`);

if (!fs.existsSync(extensionDir)) {
  console.error(`Error: Extension directory not found at ${extensionDir}`);
  process.exit(1);
}

try {
  if (process.platform === 'win32') {
    const cmd = `powershell -Command "Compress-Archive -Path '${extensionDir}\\*' -DestinationPath '${zipOut}' -Force"`;
    execSync(cmd, { stdio: 'inherit' });
  } else {
    const cmd = `cd '${extensionDir}' && zip -r '${zipOut}' ./*`;
    execSync(cmd, { stdio: 'inherit' });
  }

  const stats = fs.statSync(zipOut);
  console.log(`\n✓ Extension packaged successfully!`);
  console.log(`📦 Output ZIP: ${zipOut} (${(stats.size / 1024).toFixed(1)} KB)`);
  console.log('You can now upload this .zip directly to the Chrome Web Store or share it with evaluators.');
} catch (err) {
  console.error('Packaging failed:', err.message);
  process.exit(1);
}
