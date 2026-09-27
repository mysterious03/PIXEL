# 🚀 PIXEL Deployment & Chrome Extension Guide

**PIXEL: On-Device Visual Perception for Lightweight Browser Agents**  
*Smart India Hackathon 2026 — Problem Statement ID: 26171 (ISRO / Department of Space)*

---

## 📑 Table of Contents
1. [Chrome Extension Setup (Load Unpacked)](#1-chrome-extension-setup-load-unpacked)
2. [Extension Architecture & Capabilities](#2-extension-architecture--capabilities)
3. [Packaging the Extension for Distribution](#3-packaging-the-extension-for-distribution)
4. [Local Backend & Studio Deployment](#4-local-backend--studio-deployment)
5. [Docker Container Deployment](#5-docker-container-deployment)
6. [Cloud Platform Deployment (Render, Railway, VPS)](#6-cloud-platform-deployment)
7. [Publishing to the Chrome Web Store](#7-publishing-to-the-chrome-web-store)

---

## 1. Chrome Extension Setup

You can load and install the extension either **directly from your terminal with 1 command** (recommended) or **manually via Chrome UI**.

### ⚡ Method A: 1-Command Terminal Launch (Fastest)

Run any of the following commands in your project terminal:

```bash
# Using npm
npm run ext

# OR using the Windows batch script
.\install-extension.bat

# OR using PowerShell
.\install-extension.ps1
```

**What this does automatically:**
1. Discovers your local Google Chrome, Microsoft Edge, or Brave installation.
2. Spawns the browser with `--load-extension="...\extension"` pre-loaded into an isolated profile.
3. Automatically opens Chrome with the PIXEL extension ready to use in the toolbar!

---

### 🖱️ Method B: Manual Installation via Chrome UI (Load Unpacked)

1. **Open Google Chrome** (or any Chromium browser: Brave, Edge, Opera).
2. In the address bar, type:
   ```text
   chrome://extensions
   ```
3. In the top-right corner of the Extensions page, **turn ON "Developer mode"**.
4. In the top-left toolbar, click the **"Load unpacked"** button.
5. In the file picker, select the `extension` folder located inside the project:
   ```text
   C:\Users\ASUS\OneDrive\Desktop\SIH\extension
   ```
6. Click **Select Folder**.
7. **Done!** You will see **PIXEL: On-Device Visual Perception Browser Agent** appear in your extensions list.

> [!TIP]
> Pin the PIXEL extension to your browser toolbar by clicking the puzzle piece icon (Extensions) in Chrome's top-right toolbar and clicking the pin icon next to **PIXEL ODVPA**.

---

## 2. Extension Architecture & Capabilities

The extension is designed to run in two cooperative modes:

| Feature | Standalone Extension Mode | Connected Mode (with Studio Backend) |
| :--- | :--- | :--- |
| **Backend Required?** | ❌ No backend needed | ✅ Local `http://localhost:3000` active |
| **Fast-Path Extraction** | Native client-side DOM + AXTree ($0.00 / 0 tokens) | Native client-side DOM + AXTree |
| **Visual Bounding Boxes** | Full `@e1`, `@e2`, `@r1` overlay rendering | Full `@e1`, `@e2`, `@r1` overlay rendering |
| **In-Page Dynamic Island** | Interactive floating dock inside the web page | Interactive floating dock inside the web page |
| **5-Stage Privacy Shield** | Auto-blurs passwords, credit cards & tokens | Auto-blurs + verifies safety gate via API |
| **VLM Escalation** | Client heuristic perceptual fallback | Real-time Tier A (450M) / Tier B (1.6B) router |

### How to Use the Extension:

- **Open Side Panel Dock**: Click the PIXEL extension icon in the toolbar, then click **"Open Agent Side Panel Dock"**. This opens a persistent cyber-themed dock on the right of your browser.
- **Scan Current Screen**: Click **"Scan Screen"** to extract all interactive elements (`@e1`, `@e2`, etc.) and visual canvas areas (`@r1`) with zero cloud latency.
- **Highlight & Click Elements**: In the side panel's Perceived Elements list, clicking any item will smoothly scroll the webpage and highlight it with a neon bounding box. Click the **"Click"** button to execute a simulated click.
- **Toggle In-Page Dynamic Island**: Click the **"In-Page Island"** capsule to spawn a floating draggable pill directly inside any webpage.
- **5-Stage Hard Privacy Shield**: Sensitive fields (passwords, PINs, tokens) are automatically blurred and masked with zero data egress.

---

## 3. Packaging the Extension for Distribution

To distribute the extension to evaluators, team members, or for Chrome Web Store submission, run the built-in packaging script:

```bash
npm run extension:pack
```

This will automatically create a production-ready ZIP archive:
```text
pixel-extension-v2.0.0.zip
```

---

## 4. Local Backend & Studio Deployment

To unlock the full local VLM cascade and visual perception dashboard, run the PIXEL Visual Studio:

### 1. Install Dependencies
```bash
npm install
```

### 2. Start PIXEL Studio Server
```bash
npm start
# or
npm run studio
```
The server will start at:
```text
http://localhost:3000
```
*(The Chrome Extension will automatically detect this server and switch to "Studio :3000 Connected" mode).*

### 3. Run Multi-Tab Live Runner (CDP Injection)
```bash
npm run live
```

---

## 5. Docker Container Deployment

PIXEL includes a pre-configured, production-optimized [Dockerfile](file:///c:/Users/ASUS/OneDrive/Desktop/SIH/Dockerfile) and [docker-compose.yml](file:///c:/Users/ASUS/OneDrive/Desktop/SIH/docker-compose.yml).

### Quickstart with Docker Compose:

```bash
# Build and start in detached mode
docker compose up -d

# View live logs
docker compose logs -f

# Check container health status
docker ps
```

The service will be live on:
```text
http://localhost:3000
```

### Manual Docker Build & Run:

```bash
# 1. Build the Docker image
docker build -t pixel-odvpa:2.0.0 .

# 2. Run the container
docker run -d \
  --name pixel-studio \
  -p 3000:3000 \
  -v %cd%/logs:/app/logs \
  pixel-odvpa:2.0.0
```

---

## 6. Cloud Platform Deployment

You can deploy the PIXEL Perception Backend to any cloud provider:

### Option A: Render (Free / Web Service)
1. Push this repository to GitHub.
2. Log in to [Render.com](https://render.com) and click **"New +" → "Web Service"**.
3. Select your repository.
4. Set the runtime to **Docker** (Render will detect the `Dockerfile` automatically).
5. Set environment variable: `PORT = 3000`.
6. Click **Deploy Web Service**.

### Option B: Railway
1. Go to [Railway.app](https://railway.app).
2. Click **"New Project" → "Deploy from GitHub repo"**.
3. Railway automatically detects the `Dockerfile` and deploys on port 3000.

### Option C: Linux / Ubuntu VPS with PM2
```bash
# 1. Clone repository and install dependencies
git clone https://github.com/mysterious03/PIXEL.git
cd PIXEL
npm install --production

# 2. Install PM2 process manager
npm install -g pm2

# 3. Start PIXEL Studio with automatic restart
pm2 start studio.js --name pixel-studio

# 4. Save PM2 startup script
pm2 startup
pm2 save
```

---

## 7. Publishing to the Chrome Web Store

1. Run the packager to build the latest release:
   ```bash
   npm run extension:pack
   ```
2. Navigate to the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole).
3. Log in with your Google Developer account.
4. Click **"Add new item"**.
5. Upload the generated `pixel-extension-v2.0.0.zip`.
6. Fill in the store listing:
   - **Category**: Developer Tools / Productivity
   - **Privacy Policy**: Mention that PIXEL processes DOM and visual crops strictly on-device with zero cloud data transmission.
7. Submit for review!
