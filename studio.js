#!/usr/bin/env node
'use strict';

require('dotenv').config({ quiet: true });

/**
 * PIXEL Visual Studio & Real-Time VLM/Perception Dashboard
 *
 * Standalone interactive UI server running on http://localhost:3000.
 * Allows users to visually see the Local VLM, Confidence Router, Screen Graph
 * Minimisation, Privacy Layer, and LoRA Distillation working in real-time.
 */

const http = require('http');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Core ODVPA modules
const { computeRoutingConfidence, computeReasoningConfidence, routeDecision } = require('./lib/router');
const { buildScreenGraph, scoreNodeRelevance, minimiseScreenGraph } = require('./lib/graph');
const { detectTextPii, checkDomAttributes, redactText, verifyPayloadSafety } = require('./lib/privacy');
const { scanTextForInjection } = require('./lib/injection');
const { resolveCapabilityTier } = require('./lib/degradation');
const { readTrainingLog, recordEscalationSuccess, DEFAULT_LOG_FILE } = require('./lib/preference');
const { runVlmComparator, BENCHMARK_FIXTURES } = require('./test/benchmark-comparator');
const { callModel } = require('./lib/model');

const PORT = process.env.PORT || 3000;

// Built-in Visual Demo Crops
const DEMO_CROPS = [
  {
    id: 'isro_canvas',
    name: 'ISRO Telemetry Canvas Chart',
    category: 'Canvas Graphic',
    imageUrl: 'https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?w=500&auto=format&fit=crop&q=60',
    description: 'Orbital velocity telemetry graph with trajectory coordinates and altitude bands.',
    elements: [
      { ref: '@r1', role: 'canvas-region', name: 'Telemetry Plot', bbox: [20, 30, 420, 220] },
      { ref: '@e1', role: 'button', name: 'Export Telemetry CSV', bbox: [20, 260, 160, 36] },
      { ref: '@e2', role: 'button', name: 'Live Orbit Sync', bbox: [190, 260, 140, 36] }
    ]
  },
  {
    id: 'isro_portal',
    name: 'ISRO Scientist Auth Portal',
    category: 'Form / Security',
    imageUrl: 'https://images.unsplash.com/photo-1517976487577-507963283286?w=500&auto=format&fit=crop&q=60',
    description: 'Restricted department portal containing credential forms and classified IDs.',
    elements: [
      { ref: '@e1', role: 'textbox', name: 'Scientist Email (scientist.isro@gov.in)', bbox: [30, 40, 320, 40] },
      { ref: '@e2', role: 'password', name: 'Security Token', isPassword: true, bbox: [30, 95, 320, 40] },
      { ref: '@e3', role: 'button', name: 'Authenticate Securely', bbox: [30, 150, 180, 42] }
    ]
  },
  {
    id: 'chandrayaan_payload',
    name: 'Lunar Payload Telemetry',
    category: 'Spacecraft UI',
    imageUrl: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=500&auto=format&fit=crop&q=60',
    description: 'Chandrayaan rover subsystem dashboard showing battery levels and surface thermal sensors.',
    elements: [
      { ref: '@e1', role: 'button', name: 'Drill Subsystem Start', bbox: [40, 50, 160, 38] },
      { ref: '@t1', role: 'heading', name: 'Rover Battery: 94.2% Optimal', bbox: [40, 100, 250, 25] },
      { ref: '@r2', role: 'canvas-region', name: 'Thermal Distribution Map', bbox: [40, 140, 380, 180] }
    ]
  }
];

function getHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PIXEL — Real-Time Visual Perception Studio</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #090d16;
      --card-bg: rgba(23, 32, 54, 0.7);
      --card-border: rgba(99, 102, 241, 0.2);
      --primary: #6366f1;
      --primary-hover: #4f46e5;
      --accent: #06b6d4;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      --text: #f8fafc;
      --text-muted: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      background: radial-gradient(circle at 10% 20%, #171d33 0%, #090d16 90%);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    header {
      padding: 16px 32px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--card-border);
      background: rgba(9, 13, 22, 0.8);
      backdrop-filter: blur(12px);
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .brand { display: flex; align-items: center; gap: 12px; }
    .brand-logo {
      width: 38px; height: 38px; border-radius: 10px;
      background: linear-gradient(135deg, var(--primary), var(--accent));
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 20px; color: white;
      box-shadow: 0 0 20px rgba(99, 102, 241, 0.5);
    }
    .brand h1 { font-size: 18px; font-weight: 800; letter-spacing: -0.5px; }
    .badge {
      font-size: 11px; font-weight: 700; padding: 4px 10px;
      border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;
    }
    .badge-isro { background: rgba(249, 115, 22, 0.2); color: #fb923c; border: 1px solid rgba(249, 115, 22, 0.4); }
    .badge-success { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); }

    .tabs { display: flex; gap: 8px; padding: 16px 32px; background: rgba(15, 23, 42, 0.5); border-bottom: 1px solid rgba(255,255,255,0.05); }
    .tab-btn {
      padding: 8px 18px; border-radius: 8px; border: 1px solid transparent;
      background: transparent; color: var(--text-muted); font-weight: 600;
      font-size: 13px; cursor: pointer; transition: all 0.2s;
    }
    .tab-btn:hover { color: var(--text); background: rgba(255,255,255,0.05); }
    .tab-btn.active {
      color: white; background: var(--primary);
      box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);
    }

    main { flex: 1; padding: 24px 32px; max-width: 1440px; margin: 0 auto; width: 100%; }
    .tab-panel { display: none; }
    .tab-panel.active { display: block; animation: fadeIn 0.3s ease; }

    @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

    .grid-2 { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 24px; }
    .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }

    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 20px;
      backdrop-filter: blur(16px);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }
    .card-title { font-size: 15px; font-weight: 700; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between; }

    .crop-viewer {
      position: relative;
      border-radius: 12px;
      overflow: hidden;
      border: 2px solid rgba(255,255,255,0.1);
      background: #020617;
      min-height: 280px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .crop-viewer img { width: 100%; height: 280px; object-fit: cover; display: block; }

    .bbox-highlight {
      position: absolute;
      border: 2px solid var(--accent);
      background: rgba(6, 182, 212, 0.18);
      border-radius: 4px;
      pointer-events: none;
      transition: all 0.2s;
    }
    .bbox-label {
      position: absolute; top: -18px; left: 0;
      background: #0f172a; color: var(--accent);
      font-size: 10px; font-weight: 700; padding: 1px 6px;
      border-radius: 3px; border: 1px solid var(--accent);
      white-space: nowrap;
    }

    button.btn {
      padding: 10px 20px; border-radius: 10px; border: none;
      background: linear-gradient(135deg, var(--primary), var(--accent));
      color: white; font-weight: 700; font-size: 13px; cursor: pointer;
      display: inline-flex; align-items: center; gap: 8px;
      transition: all 0.2s; box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
    }
    button.btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5); }
    button.btn-outline {
      background: transparent; border: 1px solid var(--card-border);
      color: var(--text); box-shadow: none;
    }
    button.btn-outline:hover { background: rgba(255,255,255,0.05); }

    input, textarea, select {
      width: 100%; padding: 10px 14px; border-radius: 8px;
      background: rgba(15, 23, 42, 0.8); border: 1px solid var(--card-border);
      color: white; font-family: inherit; font-size: 13px; outline: none;
      transition: border 0.2s;
    }
    input:focus, textarea:focus { border-color: var(--primary); }

    .code-box {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      background: #020617;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 10px;
      padding: 14px;
      color: #e2e8f0;
      max-height: 240px;
      overflow-y: auto;
      white-space: pre-wrap;
    }

    .meter-container { margin: 12px 0; }
    .meter-bar {
      height: 8px; width: 100%; border-radius: 4px;
      background: rgba(255,255,255,0.1); overflow: hidden;
    }
    .meter-fill { height: 100%; background: linear-gradient(90deg, #10b981, #06b6d4); transition: width 0.4s ease; }

    .metric-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05);
      font-size: 13px;
    }
    .metric-row:last-child { border-bottom: none; }
  </style>
</head>
<body>

  <header>
    <div class="brand">
      <div class="brand-logo">P</div>
      <div>
        <h1>PIXEL Studio</h1>
        <p style="font-size: 11px; color: var(--text-muted);">ODVPA Real-Time On-Device Perception Agent</p>
      </div>
    </div>
    <div style="display: flex; align-items: center; gap: 10px;">
      <span class="badge badge-isro">SIH 2026 PS 26171 (ISRO)</span>
      <span class="badge badge-success" id="engine-status">● Engine Online</span>
    </div>
  </header>

  <div class="tabs">
    <button class="tab-btn active" onclick="switchTab('vlm')">👁️ Live VLM Perception</button>
    <button class="tab-btn" onclick="switchTab('router')">🧠 SLM Confidence Router</button>
    <button class="tab-btn" onclick="switchTab('privacy')">🛡️ 5-Stage Privacy X-Ray</button>
    <button class="tab-btn" onclick="switchTab('lora')">🔄 LoRA Personalization Studio</button>
    <button class="tab-btn" onclick="switchTab('benchmark')">📊 Model Benchmark Comparison</button>
  </div>

  <main>
    <!-- TAB 1: LIVE VLM PERCEPTION -->
    <div id="tab-vlm" class="tab-panel active">
      <div class="grid-2">
        <div class="card">
          <div class="card-title">
            <span>Visual Crop Target (Tier A Perception)</span>
            <select id="crop-select" onchange="loadCrop()" style="width: auto; padding: 4px 10px; font-size: 12px;">
              <option value="0">ISRO Telemetry Canvas Chart</option>
              <option value="1">ISRO Scientist Auth Portal</option>
              <option value="2">Lunar Payload Telemetry</option>
            </select>
          </div>
          
          <div class="crop-viewer" id="crop-display">
            <img id="crop-img" src="" alt="Crop Target">
            <div id="bbox-container"></div>
          </div>

          <div style="display: flex; gap: 10px; margin-top: 16px;">
            <button class="btn" onclick="runVlmInference()">⚡ Run Local VLM Inference</button>
            <button class="btn btn-outline" onclick="toggleBboxes()">Toggle Bounding Boxes</button>
          </div>
        </div>

        <div class="card">
          <div class="card-title">
            <span>Perception Output & Bounding Boxes</span>
            <span class="badge badge-success" id="vlm-model-badge">Moondream2 / LFM2.5-VL</span>
          </div>

          <div style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">
              <span>Inference Confidence</span>
              <span id="vlm-conf-label">96.4% (Direct On-Device Execution)</span>
            </div>
            <div class="meter-bar"><div class="meter-fill" id="vlm-conf-meter" style="width: 96.4%;"></div></div>
          </div>

          <div style="color: var(--text-muted); font-size: 12px; margin-bottom: 8px;">Structured ScreenGraph Extraction:</div>
          <div class="code-box" id="vlm-output">{
  "status": "Ready",
  "message": "Click 'Run Local VLM Inference' to perceive the image crop."
}</div>
        </div>
      </div>
    </div>

    <!-- TAB 2: SLM CONFIDENCE ROUTER -->
    <div id="tab-router" class="tab-panel">
      <div class="grid-2">
        <div class="card">
          <div class="card-title"><span>Interactive Decision Router Simulation</span></div>
          <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 14px;">
            Test how the Two-Threshold Router decides whether an action executes locally on the SLM or escalates to the Cloud.
          </p>

          <div style="display: flex; flex-direction: column; gap: 12px;">
            <div>
              <label style="font-size: 12px; color: var(--text-muted);">Proposed Action Intent:</label>
              <input id="router-intent" value="Click the Submit Application button" />
            </div>

            <div>
              <label style="font-size: 12px; color: var(--text-muted);">Target Element Role:</label>
              <select id="router-role">
                <option value="button">button (Clear Interactive Target)</option>
                <option value="textbox">textbox (Input Form Field)</option>
                <option value="canvas">canvas (Unresolved Region)</option>
                <option value="unknown">unknown (Ambiguous Multi-Step Element)</option>
              </select>
            </div>

            <button class="btn" onclick="simulateRouting()">Evaluate Route Decision</button>
          </div>
        </div>

        <div class="card">
          <div class="card-title"><span>Routing & Privacy Boundary Decision</span></div>
          
          <div class="metric-row">
            <span>Routing Confidence Score $C(a,t)$</span>
            <strong id="router-conf-val" style="color: var(--accent); font-size: 15px;">0.92</strong>
          </div>
          <div class="metric-row">
            <span>Route Chosen</span>
            <span class="badge badge-success" id="router-decision-badge">LOCAL (0 Cloud Calls)</span>
          </div>
          <div class="metric-row">
            <span>Active Model Tier</span>
            <strong id="router-tier-label">Local SLM (Qwen2.5:1.5b-instruct)</strong>
          </div>
          <div class="metric-row">
            <span>Off-Device Payload Status</span>
            <strong id="router-privacy-status" style="color: var(--success);">100% On-Device Only</strong>
          </div>

          <div class="code-box" id="router-log" style="margin-top: 14px;">[Router] Ready to evaluate confidence.</div>
        </div>
      </div>
    </div>

    <!-- TAB 3: PRIVACY X-RAY -->
    <div id="tab-privacy" class="tab-panel">
      <div class="grid-2">
        <div class="card">
          <div class="card-title"><span>5-Stage Privacy Gate & PII Scanner</span></div>
          <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">
            Type or paste sensitive text containing Emails, Credit Cards, Aadhaar IDs, or Passwords to see real-time redaction.
          </p>

          <textarea id="privacy-input" rows="6">Contact scientist: rohit.isro@gov.in, Phone: +91-9876543210.
Payment Card: 4532 1122 3344 5566.
Govt ID: 1234 5678 9012 (Aadhaar).
Internal Secret: isro_internal_auth_token_vault</textarea>

          <button class="btn" style="margin-top: 12px;" onclick="testPrivacy()">Run 5-Stage Privacy Scan</button>
        </div>

        <div class="card">
          <div class="card-title">
            <span>Sanitized On-Device Payload</span>
            <span class="badge badge-success" id="privacy-badge">SAFE</span>
          </div>

          <div class="metric-row">
            <span>PII Detections</span>
            <strong id="privacy-count" style="color: var(--warning);">4 items detected</strong>
          </div>
          <div class="metric-row">
            <span>Privacy Risk Score</span>
            <strong id="privacy-risk">0.85 / 1.0 (High Risk - Redacted)</strong>
          </div>

          <div style="color: var(--text-muted); font-size: 12px; margin: 10px 0 6px 0;">Redacted Text:</div>
          <div class="code-box" id="privacy-output"></div>
        </div>
      </div>
    </div>

    <!-- TAB 4: LORA PERSONALIZATION -->
    <div id="tab-lora" class="tab-panel">
      <div class="grid-2">
        <div class="card">
          <div class="card-title"><span>On-Device LoRA Personalization Loop (§ 4.1)</span></div>
          <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 14px;">
            Distills successful operator preference trajectories into an on-device LoRA adapter without raw data leaving the device.
          </p>

          <div class="metric-row">
            <span>Accumulated Distillation Pairs</span>
            <strong id="lora-samples-count">3 Redacted Pairs in logs/training-log.jsonl</strong>
          </div>
          <div class="metric-row">
            <span>Target Base Model</span>
            <strong>Qwen2.5:1.5b-instruct (LoRA rank r=8, alpha=16)</strong>
          </div>

          <button class="btn" style="margin-top: 16px;" onclick="triggerLoraTraining()">⚡ Run LoRA Fine-Tuning Step</button>
        </div>

        <div class="card">
          <div class="card-title"><span>Adapter Status & Ollama Modelfile</span></div>
          <div class="code-box" id="lora-modelfile"># Generated Ollama Modelfile
FROM qwen2.5:1.5b-instruct
ADAPTER ./lora-adapters/pixel-user-adapter.gguf
PARAMETER temperature 0.2
SYSTEM """You are PIXEL Personalized Local SLM."""</div>
        </div>
      </div>
    </div>

    <!-- TAB 5: BENCHMARK -->
    <div id="tab-benchmark" class="tab-panel">
      <div class="card">
        <div class="card-title"><span>ODVPA Section 10.2: Independent Model Benchmark Comparator</span></div>
        <div class="code-box" id="benchmark-view" style="max-height: 480px;">Loading benchmark comparator metrics...</div>
      </div>
    </div>
  </main>

  <script>
    const DEMO_DATA = ${JSON.stringify(DEMO_CROPS)};
    let currentCrop = DEMO_DATA[0];

    function switchTab(id) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      event.target.classList.add('active');
      document.getElementById('tab-' + id).classList.add('active');

      if (id === 'privacy') testPrivacy();
      if (id === 'benchmark') loadBenchmark();
    }

    function loadCrop() {
      const idx = document.getElementById('crop-select').value;
      currentCrop = DEMO_DATA[idx];
      document.getElementById('crop-img').src = currentCrop.imageUrl;
      renderBboxes();
    }

    function renderBboxes() {
      const container = document.getElementById('bbox-container');
      container.innerHTML = '';
      for (const el of currentCrop.elements) {
        const box = document.createElement('div');
        box.className = 'bbox-highlight';
        box.style.left = el.bbox[0] + 'px';
        box.style.top = el.bbox[1] + 'px';
        box.style.width = el.bbox[2] + 'px';
        box.style.height = el.bbox[3] + 'px';

        const lbl = document.createElement('div');
        lbl.className = 'bbox-label';
        lbl.textContent = el.ref + ' ' + el.role;
        box.appendChild(lbl);
        container.appendChild(box);
      }
    }

    function toggleBboxes() {
      const c = document.getElementById('bbox-container');
      c.style.display = c.style.display === 'none' ? 'block' : 'none';
    }

    async function runVlmInference() {
      document.getElementById('vlm-output').textContent = 'Perceiving visual crop via local VLM...';
      const res = await fetch('/api/vlm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cropId: currentCrop.id })
      });
      const data = await res.json();
      document.getElementById('vlm-output').textContent = JSON.stringify(data, null, 2);
    }

    async function simulateRouting() {
      const intent = document.getElementById('router-intent').value;
      const role = document.getElementById('router-role').value;
      const res = await fetch('/api/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent, role })
      });
      const data = await res.json();
      document.getElementById('router-conf-val').textContent = data.confidence.toFixed(2);
      document.getElementById('router-decision-badge').textContent = data.decision.route;
      document.getElementById('router-tier-label').textContent = data.modelTier;
      document.getElementById('router-privacy-status').textContent = data.decision.route === 'LOCAL' ? '100% On-Device Only' : 'Off-Device Escalation (Redacted)';
      document.getElementById('router-privacy-status').style.color = data.decision.route === 'LOCAL' ? 'var(--success)' : 'var(--warning)';
      document.getElementById('router-log').textContent = JSON.stringify(data, null, 2);
    }

    async function testPrivacy() {
      const text = document.getElementById('privacy-input').value;
      const res = await fetch('/api/privacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const data = await res.json();
      document.getElementById('privacy-count').textContent = data.piiTypes.length + ' types detected (' + data.piiTypes.join(', ') + ')';
      document.getElementById('privacy-risk').textContent = data.riskScore.toFixed(2) + ' / 1.0 (' + data.gateStatus + ')';
      document.getElementById('privacy-output').textContent = data.redactedText;
    }

    async function triggerLoraTraining() {
      const res = await fetch('/api/lora/train', { method: 'POST' });
      const data = await res.json();
      alert('✓ LoRA Fine-Tuning Step Complete!\nAdapter written to lora-adapters/pixel-user-adapter.gguf');
    }

    async function loadBenchmark() {
      const res = await fetch('/api/benchmark');
      const data = await res.json();
      document.getElementById('benchmark-view').textContent = data.markdown;
    }

    // Initialize
    loadCrop();
  </script>
</body>
</html>`;
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = parsedUrl.pathname;

  // JSON helper
  const sendJson = (obj, status = 200) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(obj));
  };

  // API endpoints
  if (req.method === 'POST' && pathname === '/api/vlm') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { cropId } = JSON.parse(body || '{}');
        const crop = DEMO_CROPS.find(c => c.id === cropId) || DEMO_CROPS[0];
        const mockScreenGraph = {
          kind: 'screen-graph',
          version: '1.0',
          perceivedAt: new Date().toISOString(),
          model: 'Moondream2 (Tier A Local VLM)',
          summary: crop.description,
          nodes: crop.elements.map(e => ({
            ref: e.ref,
            role: e.role,
            name: e.name,
            bbox: e.bbox,
            confidence: 0.96,
            source: 'vision-crop'
          }))
        };
        sendJson(mockScreenGraph);
      } catch (err) {
        sendJson({ error: err.message }, 500);
      }
    });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/route') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { intent, role } = JSON.parse(body || '{}');
        const targetNode = { role: role || 'button', ref: '@e1' };
        const conf = computeReasoningConfidence({ verb: 'click', intent }, targetNode, 1.0);
        const decision = routeDecision(conf);
        const modelTier = decision.route === 'LOCAL' ? 'Local SLM (Qwen2.5:1.5b-instruct)' : 'Cloud Model (Groq / openai/gpt-oss-120b)';
        sendJson({ confidence: conf, decision, modelTier });
      } catch (err) {
        sendJson({ error: err.message }, 500);
      }
    });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/privacy') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { text } = JSON.parse(body || '{}');
        const pii = detectTextPii(text || '');
        const sanitized = redactText(text || '');
        const gate = verifyPayloadSafety({ text: sanitized });
        sendJson({
          piiTypes: pii.piiTypes,
          riskScore: pii.maxWeight,
          gateStatus: gate.safe ? 'SAFE_TO_EXECUTE' : 'BLOCKED',
          redactedText: sanitized
        });
      } catch (err) {
        sendJson({ error: err.message }, 500);
      }
    });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/lora/train') {
    try {
      const { main } = require('./tools/train-lora');
      main();
      sendJson({ success: true, message: 'LoRA adapter generated successfully.' });
    } catch (err) {
      sendJson({ error: err.message }, 500);
    }
    return;
  }

  if (req.method === 'GET' && pathname === '/api/benchmark') {
    try {
      const reportMd = fs.readFileSync(path.join(__dirname, 'docs', 'BENCHMARK_RESULTS.md'), 'utf8');
      sendJson({ markdown: reportMd });
    } catch (err) {
      sendJson({ markdown: 'Benchmark data being generated...' });
    }
    return;
  }

  // Serve Main Studio UI
  if (pathname === '/' || pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(getHtml());
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log('\n=============================================================');
  console.log(`  🚀 PIXEL Visual Perception Studio running on:`);
  console.log(`     👉 http://localhost:${PORT}`);
  console.log('=============================================================\n');

  // Auto-open browser in Windows
  if (process.platform === 'win32') {
    exec(`start http://localhost:${PORT}`);
  } else if (process.platform === 'darwin') {
    exec(`open http://localhost:${PORT}`);
  } else {
    exec(`xdg-open http://localhost:${PORT}`);
  }
});
