'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const iconsDir = path.join(__dirname, '..', 'extension', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Sleek high-tech PIXEL icon SVG: dark cosmic background, glowing cyber iris & space chevron
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a0f1d" />
      <stop offset="100%" stop-color="#020408" />
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366f1" />
      <stop offset="50%" stop-color="#06b6d4" />
      <stop offset="100%" stop-color="#10b981" />
    </linearGradient>
    <linearGradient id="flame" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#f97316" />
      <stop offset="100%" stop-color="#facc15" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="16" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Outer Rounded Squircle -->
  <rect width="512" height="512" rx="112" fill="url(#bg)" stroke="rgba(99,102,241,0.4)" stroke-width="8" />

  <!-- Cyber Grid Subtle Overlay -->
  <circle cx="256" cy="256" r="190" fill="none" stroke="rgba(6,182,212,0.15)" stroke-width="2" stroke-dasharray="8 8" />
  <circle cx="256" cy="256" r="140" fill="none" stroke="rgba(99,102,241,0.25)" stroke-width="3" />

  <!-- Outer Sensor Ring with glowing notch -->
  <path d="M 120 256 A 136 136 0 1 1 392 256" fill="none" stroke="url(#accent)" stroke-width="18" stroke-linecap="round" filter="url(#glow)" />
  <circle cx="256" cy="120" r="12" fill="#38bdf8" filter="url(#glow)" />

  <!-- Central Camera Iris / Target Eye -->
  <circle cx="256" cy="256" r="76" fill="#090d16" stroke="url(#accent)" stroke-width="12" />
  <circle cx="256" cy="256" r="42" fill="url(#accent)" />
  <circle cx="270" cy="242" r="12" fill="#ffffff" opacity="0.9" />

  <!-- Tech Crosshairs -->
  <line x1="256" y1="40" x2="256" y2="76" stroke="#06b6d4" stroke-width="6" stroke-linecap="round" />
  <line x1="256" y1="436" x2="256" y2="472" stroke="#06b6d4" stroke-width="6" stroke-linecap="round" />
  <line x1="40" y1="256" x2="76" y2="256" stroke="#06b6d4" stroke-width="6" stroke-linecap="round" />
  <line x1="436" y1="256" x2="472" y2="256" stroke="#06b6d4" stroke-width="6" stroke-linecap="round" />

  <!-- ISRO Orange Space Corner Accent -->
  <polygon points="360,390 410,400 400,350" fill="url(#flame)" filter="url(#glow)" />
</svg>`;

async function generate() {
  fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgContent, 'utf8');

  const sizes = [16, 32, 48, 128];
  for (const size of sizes) {
    const pngPath = path.join(iconsDir, `icon${size}.png`);
    await sharp(Buffer.from(svgContent))
      .resize(size, size)
      .png()
      .toFile(pngPath);
    console.log(`Generated ${pngPath} (${size}x${size})`);
  }
  console.log('✓ All icons generated successfully.');
}

generate().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
