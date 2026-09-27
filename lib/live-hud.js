'use strict';

/**
 * PIXEL Real-Time Interactive On-Screen Floating Agent Dock
 * (Authentic Apple iPhone Dynamic Island UI & Silk-Smooth Dragging)
 *
 * Features:
 * - True Jet-Black OLED Aesthetic (#000000, 36px backdrop blur, continuous squircle pill curvature)
 * - Hardware notch simulation: Real TrueDepth front camera lens cutout with inner specular depth
 * - Apple Live Activity animated waveform bars & pulsating status beacon
 * - Silk-Smooth 60/120fps hardware-accelerated drag with requestAnimationFrame & tactile haptic scale
 * - Position memory across page reloads, navigations, and tab switches
 * - Safe DOM mounting: attaches cleanly via DOMContentLoaded and persists through SPA re-renders
 * - Compact Island Pill mode ↔ Expanded Live Control Center with authentic Apple spring transitions
 * - Apple-style frosted glass action capsules (Read, Focus, Privacy Shield, Clear)
 * - Spotlight/Siri-inspired prompt capsule bar with illuminated Apple action button
 * - Real-time turn-by-turn activity ticker with dynamic Apple system status highlights
 */

function generateLiveHudScript() {
  return `(() => {
    if (document.getElementById('__pixel_live_hud_root__')) return;

    // ─── Keyframes & Styles ────────────────────────────────────────────────────
    if (!document.getElementById('__pixel_dynamic_island_styles__')) {
      const s = document.createElement('style');
      s.id = '__pixel_dynamic_island_styles__';
      s.textContent = \`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        @keyframes pixelIslandPulse {
          0%, 100% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 currentColor; }
          50% { transform: scale(1.35); opacity: 0.8; box-shadow: 0 0 0 4px transparent; }
        }
        @keyframes pixelWave1 { 0%,100%{height:3px} 50%{height:12px} }
        @keyframes pixelWave2 { 0%,100%{height:10px} 50%{height:4px} }
        @keyframes pixelWave3 { 0%,100%{height:6px} 50%{height:13px} }
        @keyframes pixelWave4 { 0%,100%{height:8px} 50%{height:3px} }
        @keyframes pixelFadeIn {
          from { opacity: 0; transform: scale(0.92) translateY(-6px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes pixelThink {
          0%,100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        @keyframes pixelGlimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes pixelBorderSpin {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        #__pixel_live_hud_root__ {
          animation: pixelFadeIn 0.42s cubic-bezier(0.32, 0.72, 0, 1) forwards;
        }
        #__pixel_live_hud_root__, #__pixel_live_hud_root__ * {
          box-sizing: border-box !important;
          margin: 0;
          line-height: normal;
          text-shadow: none !important;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif !important;
        }
        #__pixel_live_hud_root__ input::placeholder {
          color: rgba(255,255,255,0.3) !important;
          opacity: 1 !important;
        }
        #__pixel_live_hud_root__ input:focus {
          border-color: rgba(10, 132, 255, 0.6) !important;
          background: rgba(10, 132, 255, 0.06) !important;
          outline: none !important;
          box-shadow: 0 0 0 2px rgba(10, 132, 255, 0.15) !important;
        }
        .__pixel_island_capsule__ {
          transition: all 0.18s cubic-bezier(0.32, 0.72, 0, 1) !important;
        }
        .__pixel_island_capsule__:hover {
          background: rgba(255, 255, 255, 0.14) !important;
          border-color: rgba(255, 255, 255, 0.22) !important;
          transform: translateY(-1px) scale(1.02) !important;
        }
        .__pixel_island_capsule__:active {
          transform: translateY(1px) scale(0.97) !important;
          filter: brightness(0.88) !important;
        }
        .__pixel_island_action_btn__:hover {
          transform: scale(1.1) !important;
          filter: brightness(1.12) !important;
        }
        .__pixel_island_action_btn__:active {
          transform: scale(0.9) !important;
        }
        .__pixel_island_dragging__ {
          transform: scale(0.982) !important;
          box-shadow: 0 32px 80px rgba(0, 0, 0, 0.98), 0 0 0 1px rgba(255,255,255,0.2), 0 0 40px rgba(0,0,0,0.6) !important;
          cursor: grabbing !important;
          transition: none !important;
          backdrop-filter: blur(60px) saturate(250%) !important;
        }
        #pixel-task-input {
          transition: all 0.2s ease !important;
        }
        .pixel-divider {
          height: 0.5px;
          background: linear-gradient(to right, transparent, rgba(255,255,255,0.08), transparent);
          margin: 1px 0;
        }
      \`;
      (document.head || document.documentElement).appendChild(s);
    }

    // ─── Position memory across ALL websites via localStorage ─────────────────
    // localStorage is per-origin but we store in a well-known key and also try
    // to broadcast via BroadcastChannel (same-browser, cross-origin).
    const POS_KEY = '__pixel_island_pos_v2';
    let savedPos = null;
    try { savedPos = JSON.parse(localStorage.getItem(POS_KEY)); } catch {}
    if (!savedPos) try { savedPos = JSON.parse(sessionStorage.getItem(POS_KEY)); } catch {}
    // Also read from window global (set by addScriptToEvaluateOnNewDocument injector)
    if (!savedPos && window.__pixel_island_pos) savedPos = window.__pixel_island_pos;

    const defaultTop  = 16;
    const defaultLeft = Math.max(16, Math.round((window.innerWidth - 380) / 2));
    const initTop  = (savedPos && typeof savedPos.top  === 'number') ? savedPos.top  : defaultTop;
    const initLeft = (savedPos && typeof savedPos.left === 'number') ? savedPos.left : defaultLeft;

    // ─── Root container ────────────────────────────────────────────────────────
    const root = document.createElement('div');
    root.id = '__pixel_live_hud_root__';
    root.setAttribute('aria-hidden', 'true');
    root.setAttribute('data-pixel-hud', 'true');
    root.style.cssText = \`
      position: fixed;
      top: \${initTop}px;
      left: \${initLeft}px;
      z-index: 2147483647;
      background: rgba(0, 0, 0, 0.92);
      backdrop-filter: blur(40px) saturate(220%) brightness(0.96);
      -webkit-backdrop-filter: blur(40px) saturate(220%) brightness(0.96);
      border: 0.5px solid rgba(255, 255, 255, 0.13);
      border-radius: 38px;
      box-shadow:
        0 24px 64px rgba(0, 0, 0, 0.9),
        0 0 0 0.5px rgba(255,255,255,0.07) inset,
        0 1px 0 rgba(255,255,255,0.12) inset;
      color: #f5f5f7;
      width: min(382px, calc(100vw - 32px));
      padding: 14px 17px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      user-select: none;
      -webkit-user-select: none;
      touch-action: none;
      transition:
        width 0.38s cubic-bezier(0.32, 0.72, 0, 1),
        border-radius 0.38s cubic-bezier(0.32, 0.72, 0, 1),
        padding 0.38s cubic-bezier(0.32, 0.72, 0, 1),
        box-shadow 0.3s ease,
        transform 0.22s cubic-bezier(0.32, 0.72, 0, 1);
    \`;

    root.innerHTML = \`
      <!-- Apple Dynamic Island Header: Camera Notch + Live Activity -->
      <div id="pixel-hud-header" style="display:flex;align-items:center;justify-content:space-between;cursor:grab;padding:2px 1px 3px;width:100%;box-sizing:border-box;gap:6px;">
        <!-- Left: TrueDepth Camera cutout + PIXEL brand -->
        <div style="display:flex;align-items:center;gap:7px;flex-shrink:0;">
          <div style="display:flex;align-items:center;gap:5px;background:rgba(0,0,0,0.9);padding:4px 8px 4px 5px;border-radius:9999px;border:0.5px solid rgba(255,255,255,0.1);box-shadow:inset 0 1px 4px rgba(0,0,0,0.9);flex-shrink:0;">
            <!-- Camera lens + inner specular depth ring -->
            <div style="width:10px;height:10px;border-radius:50%;background:#050505;border:0.5px solid rgba(255,255,255,0.18);box-shadow:inset 0 0 3px 1px #1e293b,inset 0 1px 1px rgba(255,255,255,0.3);flex-shrink:0;"></div>
            <!-- Live Activity beacon -->
            <div id="pixel-hud-sensor-dot" style="width:6.5px;height:6.5px;border-radius:50%;background:#30D158;color:#30D158;animation:pixelIslandPulse 2.2s infinite ease-in-out;flex-shrink:0;"></div>
          </div>
          <div style="display:flex;align-items:baseline;gap:4px;">
            <span style="font-weight:800;font-size:12.5px;letter-spacing:-0.3px;color:#fff;text-shadow:none;">PIXEL</span>
            <span style="font-weight:500;font-size:9px;letter-spacing:0.6px;color:rgba(255,255,255,0.35);text-transform:uppercase;">AI AGENT</span>
          </div>
        </div>

        <!-- Right: VLM live indicator + sound-wave + status badge + morph button -->
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
          <!-- Live VLM Mini Badge in header (visible in both minimized and expanded modes!) -->
          <div id="pixel-hud-vlm-pill" title="Vision-Language Model (Click to test on-device VLM)" style="display:flex;align-items:center;gap:4px;background:rgba(48,209,88,0.12);border:0.5px solid rgba(48,209,88,0.28);border-radius:9999px;padding:2px 7px;font-size:9px;font-weight:700;color:#30D158;cursor:pointer;flex-shrink:0;transition:all 0.2s ease;">
            <span id="pixel-hud-vlm-dot" style="width:5px;height:5px;border-radius:50%;background:#30D158;display:inline-block;box-shadow:0 0 5px #30D158;flex-shrink:0;"></span>
            <span id="pixel-hud-vlm-tag">VLM ON</span>
          </div>
          <div id="pixel-hud-waveform" style="display:flex;align-items:center;gap:2px;height:13px;opacity:0.75;flex-shrink:0;">
            <div style="width:2px;border-radius:2px;background:#30D158;animation:pixelWave1 1.1s infinite ease-in-out;"></div>
            <div style="width:2px;border-radius:2px;background:#30D158;animation:pixelWave2 1.3s infinite ease-in-out;"></div>
            <div style="width:2px;border-radius:2px;background:#30D158;animation:pixelWave3 0.9s infinite ease-in-out;"></div>
            <div style="width:2px;border-radius:2px;background:#30D158;animation:pixelWave4 1.5s infinite ease-in-out;"></div>
          </div>
          <span id="pixel-hud-status-badge" style="font-size:9px;font-weight:700;padding:2.5px 7px;border-radius:9999px;background:rgba(48,209,88,0.13);color:#30D158;border:0.5px solid rgba(48,209,88,0.3);letter-spacing:0.4px;text-transform:uppercase;transition:all 0.2s ease;white-space:nowrap;flex-shrink:0;">READY</span>
          <button id="pixel-hud-minimize-btn" type="button" title="Minimize / Expand" style="background:rgba(255,255,255,0.08);border:0.5px solid rgba(255,255,255,0.12);color:rgba(255,255,255,0.6);cursor:pointer;border-radius:50%;width:21px;height:21px;font-size:11px;display:flex;align-items:center;justify-content:center;padding:0;transition:all 0.18s ease;flex-shrink:0;">–</button>
        </div>
      </div>

      <!-- Expanded Control Center -->
      <div id="pixel-hud-body" style="display:flex;flex-direction:column;gap:9px;">

        <!-- Perception & Vision metrics row -->
        <div id="pixel-hud-stats" style="display:grid;grid-template-columns:1fr 1.15fr 1fr;gap:6px;">
          <div style="background:rgba(255,255,255,0.035);padding:7px 8px;border-radius:14px;border:0.5px solid rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:space-between;">
            <span style="color:rgba(255,255,255,0.4);font-size:9.5px;font-weight:600;text-transform:uppercase;letter-spacing:0.4px;">Nodes</span>
            <span id="pixel-nodes-count" style="font-weight:700;font-size:11.5px;color:#0A84FF;">0</span>
          </div>
          <div id="pixel-hud-vlm-card" style="background:rgba(255,255,255,0.035);padding:7px 8px;border-radius:14px;border:0.5px solid rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:space-between;cursor:pointer;" title="Vision-Language Model (Click to test on-device inference)">
            <span style="color:rgba(255,255,255,0.4);font-size:9.5px;font-weight:600;text-transform:uppercase;letter-spacing:0.4px;">VLM</span>
            <span id="pixel-vlm-status" style="font-weight:700;font-size:11.5px;color:#30D158;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Active ✓</span>
          </div>
          <div style="background:rgba(255,255,255,0.035);padding:7px 8px;border-radius:14px;border:0.5px solid rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:space-between;">
            <span style="color:rgba(255,255,255,0.4);font-size:9.5px;font-weight:600;text-transform:uppercase;letter-spacing:0.4px;">Privacy</span>
            <span id="pixel-privacy-status" style="font-weight:700;font-size:11.5px;color:#30D158;">On-Device</span>
          </div>
        </div>

        <!-- Apple frosted-glass action capsules -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;">
          <button id="pixel-btn-read" type="button" class="__pixel_island_capsule__" style="padding:8px 10px;background:rgba(255,255,255,0.06);color:#f5f5f7;border:0.5px solid rgba(255,255,255,0.1);border-radius:16px;font-weight:600;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
            <span style="color:#0A84FF;font-size:12px;">👁</span> Read Screen
          </button>
          <button id="pixel-btn-vlm" type="button" class="__pixel_island_capsule__" style="padding:8px 10px;background:rgba(255,255,255,0.06);color:#f5f5f7;border:0.5px solid rgba(255,255,255,0.1);border-radius:16px;font-weight:600;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
            <span style="color:#30D158;font-size:12px;">⚡</span> Test VLM
          </button>
          <button id="pixel-btn-blur" type="button" class="__pixel_island_capsule__" style="padding:8px 10px;background:rgba(255,255,255,0.06);color:#f5f5f7;border:0.5px solid rgba(255,255,255,0.1);border-radius:16px;font-weight:600;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
            <span style="color:#30D158;font-size:12px;">🛡</span> Shield PII
          </button>
          <button id="pixel-btn-readmode" type="button" class="__pixel_island_capsule__" style="padding:8px 10px;background:rgba(255,255,255,0.06);color:#f5f5f7;border:0.5px solid rgba(255,255,255,0.1);border-radius:16px;font-weight:600;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
            <span style="color:#BF5AF2;font-size:12px;">📖</span> Focus Mode
          </button>
          <button id="pixel-btn-clear" type="button" class="__pixel_island_capsule__" style="grid-column:span 2;padding:7px 10px;background:rgba(255,255,255,0.03);color:rgba(255,255,255,0.4);border:0.5px solid rgba(255,255,255,0.07);border-radius:14px;font-weight:600;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
            <span style="font-size:12px;">✕</span> Clear Overlays
          </button>
        </div>

        <!-- Live VLM Photo Preview Card -->
        <div id="pixel-hud-vlm-preview-card" style="display:none;flex-direction:column;gap:7px;background:rgba(255,255,255,0.04);border:0.5px solid rgba(48,209,88,0.3);border-radius:18px;padding:10px;box-shadow:0 12px 30px rgba(0,0,0,0.6);transition:all 0.3s ease;">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="font-size:12px;">📷</span>
              <span style="font-size:11px;font-weight:700;color:#fff;letter-spacing:0.3px;">VLM Vision Capture</span>
            </div>
            <div style="display:flex;align-items:center;gap:6px;">
              <span id="pixel-hud-vlm-badge" style="font-size:9px;font-weight:700;color:#30D158;background:rgba(48,209,88,0.15);border:0.5px solid rgba(48,209,88,0.3);border-radius:9999px;padding:1px 6px;">ON-DEVICE</span>
              <button id="pixel-hud-vlm-close-btn" type="button" title="Close Preview" style="background:rgba(255,255,255,0.08);border:none;color:rgba(255,255,255,0.6);cursor:pointer;border-radius:50%;width:18px;height:18px;font-size:10px;display:flex;align-items:center;justify-content:center;padding:0;">✕</button>
            </div>
          </div>

          <div id="pixel-hud-vlm-img-wrap" style="position:relative;border-radius:12px;overflow:hidden;border:0.5px solid rgba(255,255,255,0.12);background:#050505;cursor:pointer;" title="Click to view full-screen high-res photo">
            <img id="pixel-hud-vlm-img" src="" alt="VLM Vision Crop" style="width:100%;max-height:160px;object-fit:contain;display:block;" />
            <div style="position:absolute;bottom:6px;right:6px;background:rgba(0,0,0,0.8);backdrop-filter:blur(8px);border-radius:6px;padding:2px 7px;font-size:9px;color:#38bdf8;font-weight:600;border:0.5px solid rgba(255,255,255,0.15);">
              🔍 Click to zoom
            </div>
          </div>

          <div style="display:flex;justify-content:space-between;align-items:center;font-size:9.5px;color:rgba(255,255,255,0.55);">
            <span id="pixel-hud-vlm-dims">0×0 px</span>
            <span id="pixel-hud-vlm-savings" style="color:#30D158;font-weight:600;">0% bandwidth saved</span>
          </div>

          <div id="pixel-hud-vlm-desc" style="font-size:10.5px;color:#e2e8f0;background:rgba(0,0,0,0.35);border-radius:8px;padding:6px 9px;line-height:1.4;max-height:60px;overflow-y:auto;border:0.5px solid rgba(255,255,255,0.06);word-break:break-word;">
            Ready for visual capture
          </div>
        </div>

        <!-- Siri-inspired command input -->
        <div style="display:flex;gap:7px;align-items:center;">
          <input id="pixel-task-input" type="text" placeholder="Give PIXEL a task on any website…"
            style="flex:1;background:rgba(255,255,255,0.07);border:0.5px solid rgba(255,255,255,0.1);border-radius:9999px;padding:9px 16px;color:#fff;font-size:12px;font-weight:500;outline:none;font-family:inherit;" />
          <button id="pixel-btn-run" type="button" class="__pixel_island_action_btn__" title="Run"
            style="width:33px;height:33px;border-radius:50%;background:#fff;color:#000;border:none;font-weight:800;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 12px rgba(255,255,255,0.3);flex-shrink:0;transition:all 0.2s ease;">↑</button>
        </div>

        <!-- Live activity log pill -->
        <div id="pixel-log-msg" style="font-size:11px;color:rgba(255,255,255,0.45);max-height:46px;min-height:22px;overflow-y:auto;padding:7px 12px;background:rgba(255,255,255,0.025);border:0.5px solid rgba(255,255,255,0.05);border-radius:14px;font-family:'SF Mono','Menlo',ui-monospace,monospace;line-height:1.45;word-break:break-word;">
          Ready · Autonomous on-device agent active.
        </div>
      </div>
    \`;

    // ─── Island interaction logic ──────────────────────────────────────────────
    function setupIsland(container) {
      if (container.__pixel_initialized__) return;
      container.__pixel_initialized__ = true;

      let isMinimized = false;
      const minBtn  = container.querySelector('#pixel-hud-minimize-btn');
      const hudBody = container.querySelector('#pixel-hud-body');

      function setIslandMode(min) {
        isMinimized = min;
        if (isMinimized) {
          hudBody.style.display = 'none';
          container.style.width = 'min(330px, calc(100vw - 32px))';
          container.style.padding = '8px 14px';
          container.style.borderRadius = '9999px';
          if (minBtn) minBtn.textContent = '+';
        } else {
          hudBody.style.display = 'flex';
          container.style.width = 'min(382px, calc(100vw - 32px))';
          container.style.padding = '14px 17px';
          container.style.borderRadius = '38px';
          if (minBtn) minBtn.textContent = '–';
        }
      }

      if (minBtn) {
        minBtn.addEventListener('click', (e) => { e.stopPropagation(); setIslandMode(!isMinimized); });
      }
      const header = container.querySelector('#pixel-hud-header');
      if (header) {
        header.addEventListener('click', (e) => {
          if (isMinimized && e.target !== minBtn) setIslandMode(false);
        });
      }

      // ── Silk-smooth drag engine ──
      let isDragging = false, dragX = 0, dragY = 0, startLeft = 0, startTop = 0;
      let curLeft = initLeft, curTop = initTop, rafId = null;

      function applyPos() {
        container.style.left = curLeft + 'px';
        container.style.top  = curTop  + 'px';
        rafId = null;
      }
      function startDrag(cx, cy) {
        isDragging = true;
        const r = container.getBoundingClientRect();
        dragX = cx; dragY = cy;
        startLeft = r.left; startTop = r.top;
        curLeft = r.left; curTop = r.top;
        container.classList.add('__pixel_island_dragging__');
      }
      function moveDrag(cx, cy) {
        if (!isDragging) return;
        curLeft = Math.max(8, Math.min(window.innerWidth  - container.offsetWidth  - 8, startLeft + cx - dragX));
        curTop  = Math.max(8, Math.min(window.innerHeight - container.offsetHeight - 8, startTop  + cy - dragY));
        if (!rafId) rafId = requestAnimationFrame(applyPos);
      }
      function endDrag() {
        if (!isDragging) return;
        isDragging = false;
        container.classList.remove('__pixel_island_dragging__');
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        applyPos();
        // Persist position across ALL origins via localStorage
        const pos = { left: curLeft, top: curTop };
        window.__pixel_island_pos = pos;
        try { localStorage.setItem('${`__pixel_island_pos_v2`}', JSON.stringify(pos)); } catch {}
        try { sessionStorage.setItem('${`__pixel_island_pos_v2`}', JSON.stringify(pos)); } catch {}
        // Broadcast to other tabs (same-browser cross-origin)
        try {
          const bc = new BroadcastChannel('__pixel_island_pos');
          bc.postMessage(pos);
          bc.close();
        } catch {}
      }

      if (header) {
        header.addEventListener('mousedown', (e) => {
          if (e.target === minBtn || e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
          startDrag(e.clientX, e.clientY); e.preventDefault();
        });
        header.addEventListener('touchstart', (e) => {
          if (e.target === minBtn || e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
          if (e.touches.length === 1) startDrag(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: true });
      }
      window.addEventListener('mousemove', (e) => { if (isDragging) moveDrag(e.clientX, e.clientY); });
      window.addEventListener('mouseup', endDrag);
      window.addEventListener('touchmove', (e) => { if (isDragging && e.touches.length === 1) moveDrag(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
      window.addEventListener('touchend', endDrag);

      // Listen for position broadcasts from other tabs/pages
      try {
        const bc = new BroadcastChannel('__pixel_island_pos');
        bc.onmessage = (ev) => {
          if (ev.data && typeof ev.data.left === 'number' && !isDragging) {
            curLeft = Math.max(8, Math.min(window.innerWidth  - container.offsetWidth  - 8, ev.data.left));
            curTop  = Math.max(8, Math.min(window.innerHeight - container.offsetHeight - 8, ev.data.top));
            applyPos();
          }
        };
      } catch {}

      // ── Button states ──
      let isPrivacyBlurred = false, isReadModeActive = false;

      const btnRead = container.querySelector('#pixel-btn-read');
      if (btnRead) {
        btnRead.addEventListener('click', () => {
          window.__pixel_trigger_read = Date.now();
          const badge = container.querySelector('#pixel-hud-status-badge');
          const dot   = container.querySelector('#pixel-hud-sensor-dot');
          if (badge) { badge.textContent = 'READING'; badge.style.color = '#0A84FF'; badge.style.background = 'rgba(10,132,255,0.15)'; badge.style.borderColor = 'rgba(10,132,255,0.35)'; }
          if (dot)   { dot.style.background = '#0A84FF'; dot.style.color = '#0A84FF'; }
          const logMsg = container.querySelector('#pixel-log-msg');
          if (logMsg) logMsg.textContent = 'Perceiving page layout & interactive nodes…';
        });
      }

      const btnVlm = container.querySelector('#pixel-btn-vlm');
      const vlmPill = container.querySelector('#pixel-hud-vlm-pill');
      const vlmCard = container.querySelector('#pixel-hud-vlm-card');
      function triggerVlmScan() {
        window.__pixel_trigger_vlm = Date.now();
        const badge = container.querySelector('#pixel-hud-status-badge');
        const dot   = container.querySelector('#pixel-hud-sensor-dot');
        const vlmStatus = container.querySelector('#pixel-vlm-status');
        const vlmTag = container.querySelector('#pixel-hud-vlm-tag');
        const vlmDot = container.querySelector('#pixel-hud-vlm-dot');
        if (badge) { badge.textContent = 'VLM SCAN'; badge.style.color = '#30D158'; badge.style.background = 'rgba(48,209,88,0.18)'; badge.style.borderColor = 'rgba(48,209,88,0.4)'; }
        if (dot)   { dot.style.background = '#30D158'; dot.style.color = '#30D158'; }
        if (vlmStatus) { vlmStatus.textContent = 'Analyzing…'; vlmStatus.style.color = '#FF9F0A'; }
        if (vlmTag) { vlmTag.textContent = 'SCANNING'; }
        if (vlmDot) { vlmDot.style.background = '#FF9F0A'; vlmDot.style.boxShadow = '0 0 6px #FF9F0A'; }
        const logMsg = container.querySelector('#pixel-log-msg');
        if (logMsg) logMsg.textContent = 'Capturing visual crop & running On-Device VLM inference…';
      }
      if (btnVlm) btnVlm.addEventListener('click', triggerVlmScan);
      if (vlmPill) vlmPill.addEventListener('click', triggerVlmScan);
      if (vlmCard) vlmCard.addEventListener('click', triggerVlmScan);

      const btnReadMode = container.querySelector('#pixel-btn-readmode');
      if (btnReadMode) {
        btnReadMode.addEventListener('click', () => {
          isReadModeActive = !isReadModeActive;
          window.__pixel_trigger_read_mode = { timestamp: Date.now(), active: isReadModeActive };
          btnReadMode.style.background    = isReadModeActive ? 'rgba(191,90,242,0.22)' : 'rgba(255,255,255,0.06)';
          btnReadMode.style.borderColor   = isReadModeActive ? 'rgba(191,90,242,0.5)'  : 'rgba(255,255,255,0.1)';
          btnReadMode.innerHTML = isReadModeActive
            ? '<span style="color:#BF5AF2;font-size:12px;">📖</span> Focus [ON]'
            : '<span style="color:#BF5AF2;font-size:12px;">📖</span> Focus Mode';
        });
      }

      const btnBlur = container.querySelector('#pixel-btn-blur');
      if (btnBlur) {
        btnBlur.addEventListener('click', () => {
          isPrivacyBlurred = !isPrivacyBlurred;
          window.__pixel_trigger_privacy_blur = { timestamp: Date.now(), active: isPrivacyBlurred };
          btnBlur.style.background  = isPrivacyBlurred ? 'rgba(255,69,58,0.22)'  : 'rgba(255,255,255,0.06)';
          btnBlur.style.borderColor = isPrivacyBlurred ? 'rgba(255,69,58,0.5)'   : 'rgba(255,255,255,0.1)';
          btnBlur.innerHTML = isPrivacyBlurred
            ? '<span style="color:#ff453a;font-size:12px;">🛡</span> Shield [ON]'
            : '<span style="color:#30D158;font-size:12px;">🛡</span> Shield PII';
        });
      }

      const btnClear = container.querySelector('#pixel-btn-clear');
      if (btnClear) {
        btnClear.addEventListener('click', () => {
          window.__pixel_trigger_clear = Date.now();
          document.querySelectorAll('.__pixel_screen_box__,.__pixel_readmode_highlight__,.__pixel_privacy_badge__').forEach(b => b.remove());
          document.querySelectorAll('.__pixel_privacy_blurred__').forEach(el => { el.style.filter = ''; el.classList.remove('__pixel_privacy_blurred__'); });
          isPrivacyBlurred = false; isReadModeActive = false;
          if (btnBlur)     { btnBlur.style.background = 'rgba(255,255,255,0.06)'; btnBlur.style.borderColor = 'rgba(255,255,255,0.1)'; btnBlur.innerHTML = '<span style="color:#30D158;font-size:12px;">🛡</span> Shield PII'; }
          if (btnReadMode) { btnReadMode.style.background = 'rgba(255,255,255,0.06)'; btnReadMode.style.borderColor = 'rgba(255,255,255,0.1)'; btnReadMode.innerHTML = '<span style="color:#BF5AF2;font-size:12px;">📖</span> Focus Mode'; }
          const badge = container.querySelector('#pixel-hud-status-badge');
          const dot   = container.querySelector('#pixel-hud-sensor-dot');
          if (badge) { badge.textContent = 'READY'; badge.style.color = '#30D158'; badge.style.background = 'rgba(48,209,88,0.13)'; badge.style.borderColor = 'rgba(48,209,88,0.3)'; }
          if (dot)   { dot.style.background = '#30D158'; dot.style.color = '#30D158'; }
          const nodes = container.querySelector('#pixel-nodes-count');
          if (nodes) nodes.textContent = '0';
          const logMsg = container.querySelector('#pixel-log-msg');
          if (logMsg) logMsg.textContent = 'All overlays cleared.';
        });
      }

      // ── Task input / run ──
      const taskInput = container.querySelector('#pixel-task-input');
      const btnRun    = container.querySelector('#pixel-btn-run');

      function triggerRun(e) {
        if (e) try { e.preventDefault(); e.stopPropagation(); } catch {}
        if (!taskInput) return;
        const val = taskInput.value.trim();
        if (!val) return;
        window.__pixel_pending_task = val;
        taskInput.blur();
        const badge = container.querySelector('#pixel-hud-status-badge');
        const dot   = container.querySelector('#pixel-hud-sensor-dot');
        if (badge) { badge.textContent = 'EXECUTING'; badge.style.color = '#BF5AF2'; badge.style.background = 'rgba(191,90,242,0.18)'; badge.style.borderColor = 'rgba(191,90,242,0.4)'; }
        if (dot)   { dot.style.background = '#BF5AF2'; dot.style.color = '#BF5AF2'; }
        const logMsg = container.querySelector('#pixel-log-msg');
        if (logMsg) logMsg.textContent = '▶ ' + val;
      }

      if (btnRun) btnRun.addEventListener('click', triggerRun);
      if (taskInput) {
        taskInput.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') triggerRun(e); });
        taskInput.addEventListener('keyup',   (e) => e.stopPropagation());
        taskInput.addEventListener('keypress',(e) => e.stopPropagation());
        taskInput.addEventListener('click',   (e) => e.stopPropagation());
        taskInput.addEventListener('focus',   (e) => e.stopPropagation());
      }

      // ── VLM Photo Preview Card handlers ──
      const vlmCloseBtn = container.querySelector('#pixel-hud-vlm-close-btn');
      const vlmCardWrap = container.querySelector('#pixel-hud-vlm-preview-card');
      if (vlmCloseBtn && vlmCardWrap) {
        vlmCloseBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          vlmCardWrap.style.display = 'none';
        });
      }

      const vlmImgWrap = container.querySelector('#pixel-hud-vlm-img-wrap');
      const vlmImg = container.querySelector('#pixel-hud-vlm-img');
      if (vlmImgWrap && vlmImg) {
        vlmImgWrap.addEventListener('click', (e) => {
          e.stopPropagation();
          if (!vlmImg.src || vlmImg.src === window.location.href) return;
          let modal = document.getElementById('__pixel_vlm_lightbox_modal__');
          if (!modal) {
            modal = document.createElement('div');
            modal.id = '__pixel_vlm_lightbox_modal__';
            modal.setAttribute('aria-hidden', 'true');
            modal.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,0.88);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;cursor:zoom-out;animation:pixelFadeIn 0.22s ease forwards;';
            modal.innerHTML = \`
              <div style="position:relative;max-width:92vw;max-height:86vh;display:flex;flex-direction:column;align-items:center;gap:12px;" onclick="event.stopPropagation()">
                <img id="__pixel_modal_large_img__" style="max-width:100%;max-height:80vh;object-fit:contain;border-radius:14px;border:1px solid rgba(255,255,255,0.22);box-shadow:0 24px 70px rgba(0,0,0,0.95);" />
                <div style="display:flex;align-items:center;gap:12px;color:#f5f5f7;font-size:12px;background:rgba(0,0,0,0.75);padding:6px 16px;border-radius:9999px;border:0.5px solid rgba(255,255,255,0.18);">
                  <span>📷 On-Device VLM Vision Inspection Photo</span>
                  <span style="color:rgba(255,255,255,0.4);">•</span>
                  <button id="__pixel_modal_dismiss_btn__" style="background:transparent;border:none;color:#38bdf8;cursor:pointer;font-size:12px;font-weight:600;">Close [✕]</button>
                </div>
              </div>
            \`;
            modal.addEventListener('click', () => { modal.remove(); });
            const dismissBtn = modal.querySelector('#__pixel_modal_dismiss_btn__');
            if (dismissBtn) dismissBtn.addEventListener('click', () => { modal.remove(); });
            document.body.appendChild(modal);
          }
          const modalImg = modal.querySelector('#__pixel_modal_large_img__');
          if (modalImg) modalImg.src = vlmImg.src;
        });
      }
    }

    // ─── Safe DOM mounting ────────────────────────────────────────────────────
    function mount() {
      if (document.getElementById('__pixel_live_hud_root__')) return;
      if (!document.body) {
        if (document.readyState === 'loading') {
          window.addEventListener('DOMContentLoaded', mount, { once: true });
        } else {
          setTimeout(mount, 15);
        }
        return;
      }
      document.body.appendChild(root);
      setupIsland(root);
    }

    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', mount, { once: true });
    } else {
      mount();
    }

    // ─── Persistence: survive SPA re-renders & React/Vue unmounts ─────────────
    try {
      const observer = new MutationObserver(() => {
        if (!document.getElementById('__pixel_live_hud_root__') && document.body) {
          document.body.appendChild(root);
          setupIsland(root);
        }
      });
      const targetNode = document.documentElement || document.body;
      if (targetNode) {
        observer.observe(targetNode, { childList: true, subtree: true });
      } else {
        window.addEventListener('DOMContentLoaded', () => {
          try {
            observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
          } catch (_) {}
        }, { once: true });
      }
    } catch (_) {}
  })()`;
}

function generateUpdateHudStatusScript({ status = 'READY', color = '#30D158', message = '', nodeCount = null, vlmStatus = null } = {}) {
  return `(() => {
    try {
      const badge = document.getElementById('pixel-hud-status-badge');
      const dot = document.getElementById('pixel-hud-sensor-dot');
      if (badge) {
        badge.textContent = ${JSON.stringify(status)};
        badge.style.color = ${JSON.stringify(color)};
        if (${JSON.stringify(status)} === 'EXECUTING' || ${JSON.stringify(status)} === 'ACTING') {
          badge.style.background = 'rgba(191, 90, 242, 0.18)';
          badge.style.borderColor = 'rgba(191, 90, 242, 0.4)';
          if (dot) { dot.style.background = '#BF5AF2'; dot.style.color = '#BF5AF2'; }
        } else if (${JSON.stringify(status)} === 'THINKING') {
          badge.style.background = 'rgba(255, 159, 10, 0.18)';
          badge.style.borderColor = 'rgba(255, 159, 10, 0.4)';
          if (dot) { dot.style.background = '#FF9F0A'; dot.style.color = '#FF9F0A'; }
        } else if (${JSON.stringify(status)} === 'FAILED') {
          badge.style.background = 'rgba(255, 69, 58, 0.18)';
          badge.style.borderColor = 'rgba(255, 69, 58, 0.4)';
          if (dot) { dot.style.background = '#FF453A'; dot.style.color = '#FF453A'; }
        } else {
          badge.style.background = 'rgba(48, 209, 88, 0.15)';
          badge.style.borderColor = 'rgba(48, 209, 88, 0.35)';
          if (dot) { dot.style.background = '#30D158'; dot.style.color = '#30D158'; }
        }
      }
      if (${JSON.stringify(message)}) {
        const msg = document.getElementById('pixel-log-msg');
        if (msg) msg.textContent = ${JSON.stringify(message)};
      }
      if (${nodeCount !== null}) {
        const nodes = document.getElementById('pixel-nodes-count');
        if (nodes) nodes.textContent = ${JSON.stringify(nodeCount + ' nodes')};
      }
      if (${JSON.stringify(vlmStatus)} !== null && ${JSON.stringify(vlmStatus)} !== undefined) {
        const vlmStatusEl = document.getElementById('pixel-vlm-status');
        if (vlmStatusEl) {
          vlmStatusEl.textContent = ${JSON.stringify(vlmStatus)};
          vlmStatusEl.style.color = '#30D158';
        }
        const vlmTagEl = document.getElementById('pixel-hud-vlm-tag');
        if (vlmTagEl) {
          vlmTagEl.textContent = ${JSON.stringify(vlmStatus)};
        }
        const vlmDotEl = document.getElementById('pixel-hud-vlm-dot');
        if (vlmDotEl) {
          vlmDotEl.style.background = '#30D158';
          vlmDotEl.style.boxShadow = '0 0 5px #30D158';
        }
      }
    } catch {}
  })()`;
}

/**
 * Generates script to draw visual bounding boxes on all detected screen elements
 */
function generateAnnotateBoxesScript(elements = []) {
  return `(() => {
    // Remove previous boxes
    document.querySelectorAll('.__pixel_screen_box__').forEach(e => e.remove());

    const els = ${JSON.stringify(elements)};
    let count = 0;

    for (const el of els) {
      if (!el.bbox) continue;
      const b = el.bbox;
      const x = b.x ?? b[0] ?? 0;
      const y = b.y ?? b[1] ?? 0;
      const w = b.width ?? b[2] ?? 0;
      const h = b.height ?? b[3] ?? 0;

      if (w <= 0 || h <= 0) continue;

      const box = document.createElement('div');
      box.className = '__pixel_screen_box__';
      box.style.cssText = \`
        position: absolute;
        left: \${x}px;
        top: \${y}px;
        width: \${w}px;
        height: \${h}px;
        border: 1.5px solid #0A84FF;
        background: rgba(10, 132, 255, 0.14);
        border-radius: 6px;
        box-shadow: 0 0 10px rgba(10, 132, 255, 0.35);
        pointer-events: none;
        z-index: 2147483640;
        transition: all 0.15s ease-in-out;
      \`;

      const label = document.createElement('div');
      label.style.cssText = \`
        position: absolute;
        top: -19px;
        left: 0;
        background: #000000;
        color: #ffffff;
        font-size: 10px;
        font-weight: 600;
        padding: 1px 7px;
        border-radius: 4px;
        white-space: nowrap;
        border: 0.5px solid #0A84FF;
        box-shadow: 0 2px 6px rgba(0,0,0,0.5);
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
      \`;
      label.textContent = (el.ref || '') + ' ' + (el.role || '');
      box.appendChild(label);
      document.body.appendChild(box);
      count++;
    }

    // Update Island count
    const nodeBadge = document.getElementById('pixel-nodes-count');
    if (nodeBadge) nodeBadge.textContent = count + ' elements';
    const statusBadge = document.getElementById('pixel-hud-status-badge');
    if (statusBadge) {
      statusBadge.textContent = 'PERCEIVED';
      statusBadge.style.color = '#0A84FF';
      statusBadge.style.background = 'rgba(10, 132, 255, 0.15)';
      statusBadge.style.borderColor = 'rgba(10, 132, 255, 0.35)';
    }
    const logMsg = document.getElementById('pixel-log-msg');
    if (logMsg) logMsg.textContent = 'Perceived ' + count + ' interactive elements.';
  })()`;
}

/**
 * Generates script to scan the live DOM and visually blur all sensitive PII & credentials.
 * Places glowing "🔒 Protected" privacy badges on blurred elements.
 */
function generatePrivacyBlurScript(opts = {}) {
  const active = opts.active !== false;

  return `(() => {
    // 1. If unblurring, remove blur filters and badges
    if (!${active}) {
      document.querySelectorAll('.__pixel_privacy_blurred__').forEach(el => {
        el.style.filter = '';
        el.classList.remove('__pixel_privacy_blurred__');
      });
      document.querySelectorAll('.__pixel_privacy_badge__').forEach(b => b.remove());
      const pStatus = document.getElementById('pixel-privacy-status');
      if (pStatus) {
        pStatus.textContent = '100% On-Device';
        pStatus.style.color = '#30D158';
      }
      return 0;
    }

    // 2. Sensitive field selectors (passwords, emails, phone, card, account, address)
    const sensitiveSelectors = [
      'input[type="password"]',
      'input[type="email"]',
      'input[type="tel"]',
      'input[autocomplete*="cc-"]',
      'input[autocomplete*="email"]',
      'input[autocomplete*="tel"]',
      'input[autocomplete*="postal"]',
      'input[autocomplete*="street"]',
      'input[name*="card"]',
      'input[name*="cvv"]',
      'input[name*="ssn"]',
      'input[name*="password"]',
      'input[name*="phone"]',
      'input[name*="mobile"]',
      'input[name*="account"]',
      'input[name*="address"]',
      '#nav-global-location-slot', // Amazon delivery address
      '#nav-link-accountList-nav-line-1', // Amazon user greeting
      '.address-line',
      '.payment-method',
      '.card-number',
      '.user-profile-name',
      '.account-balance'
    ];

    let blurredCount = 0;
    const elementsToBlur = new Set();

    // Query selector matching
    for (const sel of sensitiveSelectors) {
      try {
        document.querySelectorAll(sel).forEach(el => {
          if (el.offsetWidth > 0 || el.offsetHeight > 0) {
            elementsToBlur.add(el);
          }
        });
      } catch (e) {}
    }

    // PII Regex Patterns for text nodes
    const piiRegexes = [
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,             // Email
      /(\\+?\\d{1,3}[-.\\s]?)?\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}/, // Phone
      /\\b(?:\\d[ -]*?){13,16}\\b/,                                   // Card number
      /\\b\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}\\b|\\b[A-Z]{5}\\d{4}[A-Z]{1}\\b/, // Aadhaar / PAN ID
      /\\b\\d{3}-\\d{2}-\\d{4}\\b/                                    // SSN
    ];

    // Scan text in leaf elements
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, {
      acceptNode: function(node) {
        if (node.id === '__pixel_live_hud_root__' || node.classList.contains('__pixel_screen_box__') || node.classList.contains('__pixel_privacy_badge__')) {
          return NodeFilter.FILTER_REJECT;
        }
        if (node.children.length === 0 && node.textContent && node.textContent.trim().length > 3) {
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_SKIP;
      }
    });

    let current;
    while ((current = walker.nextNode())) {
      const text = current.textContent.trim();
      for (const rx of piiRegexes) {
        if (rx.test(text)) {
          elementsToBlur.add(current);
          break;
        }
      }
    }

    // Apply blur styling and Apple privacy badge
    elementsToBlur.forEach(el => {
      if (!el.classList.contains('__pixel_privacy_blurred__')) {
        el.classList.add('__pixel_privacy_blurred__');
        el.style.filter = 'blur(8px) !important';
        el.style.webkitFilter = 'blur(8px)';
        el.style.transition = 'filter 0.2s ease-in-out';
        el.style.userSelect = 'none';

        // Add badge
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const badge = document.createElement('div');
          badge.className = '__pixel_privacy_badge__';
          badge.style.cssText = \`
            position: absolute;
            left: \${rect.left + window.scrollX}px;
            top: \${Math.max(0, rect.top + window.scrollY - 16)}px;
            background: #000000;
            color: #30D158;
            border: 0.5px solid #30D158;
            box-shadow: 0 0 10px rgba(48, 209, 88, 0.4);
            font-size: 10px;
            font-weight: 600;
            padding: 1px 7px;
            border-radius: 6px;
            pointer-events: none;
            z-index: 2147483642;
            white-space: nowrap;
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
          \`;
          badge.textContent = '🔒 Shielded (PII Blurred)';
          document.body.appendChild(badge);
        }

        blurredCount++;
      }
    });

    // Update Island indicator
    const pStatus = document.getElementById('pixel-privacy-status');
    if (pStatus) {
      pStatus.textContent = blurredCount > 0 ? ('🔒 ' + blurredCount + ' Shielded') : '100% On-Device';
      pStatus.style.color = '#30D158';
    }

    return blurredCount;
  })()`;
}

/**
 * Generates script to activate distraction-free Read Mode on active page
 */
function generateReadModeScript(opts = {}) {
  const active = opts.active !== false;

  return `(() => {
    // 1. If disabling, remove readmode classes
    if (!${active}) {
      document.querySelectorAll('.__pixel_readmode_dimmed__').forEach(e => {
        e.style.opacity = '';
        e.classList.remove('__pixel_readmode_dimmed__');
      });
      document.querySelectorAll('.__pixel_readmode_focus__').forEach(e => {
        e.style.outline = '';
        e.style.boxShadow = '';
        e.classList.remove('__pixel_readmode_focus__');
      });
      return false;
    }

    // 2. Identify main readable articles / product content
    const mainContent = document.querySelector('main, article, [role="main"], #search, #centerCol, #dp');
    if (mainContent) {
      mainContent.classList.add('__pixel_readmode_focus__');
      mainContent.style.outline = '1.5px solid rgba(10, 132, 255, 0.6)';
      mainContent.style.boxShadow = '0 0 35px rgba(10, 132, 255, 0.2)';
      mainContent.style.borderRadius = '12px';
    }

    // Dim noisy peripheral elements (headers, footers, sidebars, ad containers)
    const peripherals = document.querySelectorAll('header, footer, nav, [role="banner"], [role="contentinfo"], .ad, .advertisement');
    peripherals.forEach(p => {
      if (p.id !== '__pixel_live_hud_root__' && !p.contains(document.getElementById('__pixel_live_hud_root__'))) {
        p.classList.add('__pixel_readmode_dimmed__');
        p.style.opacity = '0.3';
        p.style.transition = 'opacity 0.25s ease-in-out';
      }
    });

    return true;
  })()`;
}

/**
 * Generates script to display captured VLM screenshot / crop right inside the Chrome HUD
 */
function generateShowVlmPhotoScript({
  imageBase64,
  mimeType = 'image/jpeg',
  model = 'LiquidAI/LFM2.5-VL',
  savingsPercent = 0,
  cropDimensions = '',
  description = '',
  badge = 'ON-DEVICE',
} = {}) {
  return `(() => {
    try {
      const container = document.getElementById('__pixel_live_hud_root__');
      if (!container) return false;

      const card = container.querySelector('#pixel-hud-vlm-preview-card');
      const img = container.querySelector('#pixel-hud-vlm-img');
      const dims = container.querySelector('#pixel-hud-vlm-dims');
      const savings = container.querySelector('#pixel-hud-vlm-savings');
      const desc = container.querySelector('#pixel-hud-vlm-desc');
      const badgeEl = container.querySelector('#pixel-hud-vlm-badge');
      const vlmStatus = container.querySelector('#pixel-vlm-status');
      const hudBody = container.querySelector('#pixel-hud-body');

      // Auto-expand HUD body if minimized so user sees the photo immediately
      if (hudBody && hudBody.style.display === 'none') {
        hudBody.style.display = 'flex';
        container.style.width = 'min(382px, calc(100vw - 32px))';
        container.style.padding = '14px 17px';
        container.style.borderRadius = '38px';
        const minBtn = container.querySelector('#pixel-hud-minimize-btn');
        if (minBtn) minBtn.textContent = '–';
      }

      if (img && ${JSON.stringify(imageBase64)}) {
        img.src = 'data:' + ${JSON.stringify(mimeType)} + ';base64,' + ${JSON.stringify(imageBase64)};
      }
      if (dims && ${JSON.stringify(cropDimensions)}) dims.textContent = ${JSON.stringify(cropDimensions)};
      if (savings) savings.textContent = ${JSON.stringify(savingsPercent + '% bandwidth saved')};
      if (desc && ${JSON.stringify(description)}) desc.textContent = ${JSON.stringify(description)};
      if (badgeEl && ${JSON.stringify(badge)}) badgeEl.textContent = ${JSON.stringify(badge)};
      if (vlmStatus) {
        vlmStatus.textContent = ${JSON.stringify(model)};
        vlmStatus.style.color = '#30D158';
      }

      if (card) {
        card.style.display = 'flex';
      }

      const logMsg = container.querySelector('#pixel-log-msg');
      if (logMsg) logMsg.textContent = '📷 VLM inspection photo captured: ' + ${JSON.stringify(cropDimensions)};
      return true;
    } catch (e) {
      return false;
    }
  })()`;
}

module.exports = {
  generateLiveHudScript,
  generateUpdateHudStatusScript,
  generateAnnotateBoxesScript,
  generatePrivacyBlurScript,
  generateReadModeScript,
  generateShowVlmPhotoScript,
};
