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

    // Inject Apple Dynamic Island Keyframes & Glassmorphic CSS
    if (!document.getElementById('__pixel_dynamic_island_styles__')) {
      const styleTag = document.createElement('style');
      styleTag.id = '__pixel_dynamic_island_styles__';
      styleTag.textContent = \`
        @keyframes pixelIslandPulse {
          0%, 100% { transform: scale(1); opacity: 1; filter: drop-shadow(0 0 5px currentColor); }
          50% { transform: scale(1.28); opacity: 0.82; filter: drop-shadow(0 0 10px currentColor); }
        }
        @keyframes pixelWave1 {
          0%, 100% { height: 4px; }
          50% { height: 13px; }
        }
        @keyframes pixelWave2 {
          0%, 100% { height: 11px; }
          50% { height: 5px; }
        }
        @keyframes pixelWave3 {
          0%, 100% { height: 7px; }
          50% { height: 14px; }
        }
        #__pixel_live_hud_root__, #__pixel_live_hud_root__ * {
          box-sizing: border-box !important;
          margin: 0;
          line-height: normal;
          text-shadow: none !important;
        }
        #__pixel_live_hud_root__ input::placeholder {
          color: #86868b !important;
          opacity: 1 !important;
        }
        .__pixel_island_capsule__:hover {
          background: rgba(255, 255, 255, 0.12) !important;
          border-color: rgba(255, 255, 255, 0.2) !important;
          transform: translateY(-1px);
        }
        .__pixel_island_capsule__:active {
          transform: translateY(1px) scale(0.98);
          filter: brightness(0.92);
        }
        .__pixel_island_action_btn__:hover {
          transform: scale(1.06);
          filter: brightness(1.1);
        }
        .__pixel_island_action_btn__:active {
          transform: scale(0.94);
        }
        .__pixel_island_dragging__ {
          transform: scale(0.985) !important;
          box-shadow: 0 28px 70px rgba(0, 0, 0, 0.95), 0 0 0 1px rgba(255, 255, 255, 0.18) !important;
          cursor: grabbing !important;
          transition: none !important;
        }
      \`;
      (document.head || document.documentElement).appendChild(styleTag);
    }

    const root = document.createElement('div');
    root.id = '__pixel_live_hud_root__';

    // Retrieve saved drag coordinates or default to top center of screen
    let savedPos = null;
    try {
      savedPos = JSON.parse(sessionStorage.getItem('__pixel_island_pos') || 'null') || window.__pixel_island_pos || null;
    } catch {}

    const defaultTop = 14;
    const defaultLeft = Math.max(14, Math.round((window.innerWidth - 370) / 2));
    const initTop = (savedPos && typeof savedPos.top === 'number') ? savedPos.top : defaultTop;
    const initLeft = (savedPos && typeof savedPos.left === 'number') ? savedPos.left : defaultLeft;

    root.style.cssText = \`
      position: fixed;
      top: \${initTop}px;
      left: \${initLeft}px;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif;
      background: #000000;
      backdrop-filter: blur(36px) saturate(200%);
      -webkit-backdrop-filter: blur(36px) saturate(200%);
      border: 0.5px solid rgba(255, 255, 255, 0.15);
      border-radius: 36px;
      box-shadow: 0 22px 60px rgba(0, 0, 0, 0.85), 0 0 1px rgba(255, 255, 255, 0.2);
      color: #f5f5f7;
      width: 370px;
      padding: 13px 16px;
      display: flex;
      flex-direction: column;
      gap: 11px;
      box-sizing: border-box;
      user-select: none;
      -webkit-user-select: none;
      transition: width 0.36s cubic-bezier(0.32, 0.72, 0, 1), height 0.36s cubic-bezier(0.32, 0.72, 0, 1), border-radius 0.36s cubic-bezier(0.32, 0.72, 0, 1), padding 0.36s ease, transform 0.25s cubic-bezier(0.32, 0.72, 0, 1), box-shadow 0.3s ease;
      touch-action: none;
    \`;

    root.innerHTML = \`
      <!-- Apple Dynamic Island Notch Header & Grab Bar -->
      <div id="pixel-hud-header" style="display: flex; align-items: center; justify-content: space-between; cursor: grab; padding: 2px 2px 4px 2px;">
        <!-- Left: Physical TrueDepth Camera Cutout & Live Activity Beacon -->
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 6px; background: #080808; padding: 3px 8px 3px 5px; border-radius: 9999px; border: 0.5px solid rgba(255,255,255,0.12); box-shadow: inset 0 1px 3px rgba(0,0,0,0.8);">
            <!-- Specular Camera Lens -->
            <div style="width: 10px; height: 10px; border-radius: 50%; background: #030303; border: 0.5px solid rgba(255,255,255,0.22); box-shadow: inset 0 0 2px 1px #1e293b, inset 0 1px 1px rgba(255,255,255,0.35);"></div>
            <!-- Status Beacon Dot -->
            <div id="pixel-hud-sensor-dot" style="width: 6.5px; height: 6.5px; border-radius: 50%; background: #30D158; color: #30D158; animation: pixelIslandPulse 2s infinite ease-in-out;"></div>
          </div>
          <div style="display: flex; align-items: baseline; gap: 6px;">
            <span style="font-weight: 700; font-size: 13px; letter-spacing: -0.3px; color: #ffffff;">PIXEL</span>
            <span style="font-weight: 500; font-size: 10px; letter-spacing: 0.6px; color: #86868b; text-transform: uppercase;">Dynamic Island</span>
          </div>
        </div>

        <!-- Right: Animated Sound Wave + Apple Tag + Island Morph Button -->
        <div style="display: flex; align-items: center; gap: 9px;">
          <!-- Animated Apple Waveform Bars -->
          <div id="pixel-hud-waveform" style="display: flex; align-items: center; gap: 2px; height: 14px; opacity: 0.85;">
            <div style="width: 2px; border-radius: 2px; background: #30D158; animation: pixelWave1 1.1s infinite ease-in-out;"></div>
            <div style="width: 2px; border-radius: 2px; background: #30D158; animation: pixelWave2 1.3s infinite ease-in-out;"></div>
            <div style="width: 2px; border-radius: 2px; background: #30D158; animation: pixelWave3 0.9s infinite ease-in-out;"></div>
          </div>
          <!-- Status Tag -->
          <span id="pixel-hud-status-badge" style="font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 9999px; background: rgba(48, 209, 88, 0.15); color: #30D158; border: 0.5px solid rgba(48, 209, 88, 0.35); letter-spacing: 0.4px; text-transform: uppercase;">READY</span>
          <!-- Morph Button -->
          <button id="pixel-hud-minimize-btn" type="button" title="Collapse / Expand Dynamic Island" style="background: rgba(255,255,255,0.1); border: 0.5px solid rgba(255,255,255,0.15); color: #86868b; cursor: pointer; border-radius: 50%; width: 20px; height: 20px; font-size: 10px; line-height: 1; display: flex; align-items: center; justify-content: center; padding: 0; transition: all 0.18s ease;">_</button>
        </div>
      </div>

      <!-- Island Expandable Control Center -->
      <div id="pixel-hud-body" style="display: flex; flex-direction: column; gap: 10px; transition: opacity 0.2s ease;">
        <!-- Compact Metrics Pill Row -->
        <div id="pixel-hud-stats" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div style="background: rgba(255,255,255,0.04); padding: 7px 10px; border-radius: 14px; border: 0.5px solid rgba(255,255,255,0.07); display: flex; align-items: center; justify-content: space-between;">
            <span style="color: #86868b; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px;">Perception</span>
            <span id="pixel-nodes-count" style="font-weight: 600; font-size: 12px; color: #0A84FF;">0 nodes</span>
          </div>
          <div style="background: rgba(255,255,255,0.04); padding: 7px 10px; border-radius: 14px; border: 0.5px solid rgba(255,255,255,0.07); display: flex; align-items: center; justify-content: space-between;">
            <span style="color: #86868b; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px;">Privacy</span>
            <span id="pixel-privacy-status" style="font-weight: 600; font-size: 12px; color: #30D158;">100% On-Device</span>
          </div>
        </div>

        <!-- Apple Capsule Action Pills (Frosted Glass) -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 7px;">
          <button id="pixel-btn-read" type="button" class="__pixel_island_capsule__" style="padding: 8px 10px; background: rgba(255, 255, 255, 0.07); color: #f5f5f7; border: 0.5px solid rgba(255, 255, 255, 0.1); border-radius: 16px; font-weight: 600; font-size: 11px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s ease;">
            <span style="color: #0A84FF; font-size: 12px;">👁️</span> Read Screen
          </button>
          <button id="pixel-btn-readmode" type="button" class="__pixel_island_capsule__" style="padding: 8px 10px; background: rgba(255, 255, 255, 0.07); color: #f5f5f7; border: 0.5px solid rgba(255, 255, 255, 0.1); border-radius: 16px; font-weight: 600; font-size: 11px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s ease;">
            <span style="color: #bf5af2; font-size: 12px;">📖</span> Read Mode
          </button>
          <button id="pixel-btn-blur" type="button" class="__pixel_island_capsule__" style="padding: 8px 10px; background: rgba(255, 255, 255, 0.07); color: #f5f5f7; border: 0.5px solid rgba(255, 255, 255, 0.1); border-radius: 16px; font-weight: 600; font-size: 11px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s ease;">
            <span style="color: #30D158; font-size: 12px;">🔒</span> Privacy Blur
          </button>
          <button id="pixel-btn-clear" type="button" class="__pixel_island_capsule__" style="padding: 8px 10px; background: rgba(255, 255, 255, 0.04); color: #86868b; border: 0.5px solid rgba(255, 255, 255, 0.08); border-radius: 16px; font-weight: 600; font-size: 11px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s ease;">
            <span style="font-size: 12px;">✕</span> Clear All
          </button>
        </div>

        <!-- Apple Spotlight-Inspired Prompt Pill -->
        <div style="display: flex; gap: 7px; align-items: center; position: relative;">
          <input id="pixel-task-input" type="text" placeholder="Ask PIXEL or type autonomous task..." style="flex: 1; background: rgba(255, 255, 255, 0.08); border: 0.5px solid rgba(255, 255, 255, 0.12); border-radius: 9999px; padding: 9px 15px; color: #ffffff; font-size: 12px; outline: none; font-family: inherit; transition: border-color 0.2s, background 0.2s;" />
          <button id="pixel-btn-run" type="button" class="__pixel_island_action_btn__" title="Run Task" style="width: 32px; height: 32px; border-radius: 50%; background: #ffffff; color: #000000; border: none; font-weight: 800; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 10px rgba(255, 255, 255, 0.35); flex-shrink: 0; transition: all 0.2s ease;">
            ↑
          </button>
        </div>

        <!-- Live Activity Feedback Card -->
        <div id="pixel-log-msg" style="font-size: 11px; color: #a1a1a6; max-height: 48px; min-height: 22px; overflow-y: auto; padding: 7px 11px; background: rgba(255, 255, 255, 0.03); border: 0.5px solid rgba(255, 255, 255, 0.06); border-radius: 14px; font-family: -apple-system, BlinkMacSystemFont, 'SF Mono', ui-monospace, monospace; line-height: 1.4;">
          Ready · Autonomous on-device agent active.
        </div>
      </div>
    \`;

    // Safe setup of all event listeners on the container element
    function setupIsland(container) {
      if (container.__pixel_initialized__) return;
      container.__pixel_initialized__ = true;

      // Morph between Compact Dynamic Island Pill ↔ Expanded Control Center
      let isMinimized = false;
      const minBtn = container.querySelector('#pixel-hud-minimize-btn');
      const hudBody = container.querySelector('#pixel-hud-body');

      function setIslandMode(minimized) {
        isMinimized = minimized;
        if (isMinimized) {
          hudBody.style.display = 'none';
          container.style.width = '230px';
          container.style.padding = '8px 12px';
          container.style.borderRadius = '9999px';
          if (minBtn) minBtn.textContent = '+';
        } else {
          hudBody.style.display = 'flex';
          container.style.width = '370px';
          container.style.padding = '13px 16px';
          container.style.borderRadius = '36px';
          if (minBtn) minBtn.textContent = '_';
        }
      }

      if (minBtn) {
        minBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          setIslandMode(!isMinimized);
        });
      }

      const header = container.querySelector('#pixel-hud-header');
      if (header) {
        header.addEventListener('click', (e) => {
          if (isMinimized && e.target !== minBtn) {
            setIslandMode(false);
          }
        });
      }

      // Silk-Smooth Dragging Engine with requestAnimationFrame & boundary clamping
      let isDragging = false;
      let dragStartX = 0, dragStartY = 0, initialLeft = 0, initialTop = 0;
      let currentLeft = initLeft, currentTop = initTop;
      let animFrameId = null;

      function applyPosition() {
        container.style.left = currentLeft + 'px';
        container.style.top = currentTop + 'px';
        animFrameId = null;
      }

      function onDragStart(clientX, clientY) {
        isDragging = true;
        const rect = container.getBoundingClientRect();
        dragStartX = clientX;
        dragStartY = clientY;
        initialLeft = rect.left;
        initialTop = rect.top;
        currentLeft = rect.left;
        currentTop = rect.top;
        container.classList.add('__pixel_island_dragging__');
      }

      function onDragMove(clientX, clientY) {
        if (!isDragging) return;
        const dx = clientX - dragStartX;
        const dy = clientY - dragStartY;

        currentLeft = Math.max(8, Math.min(window.innerWidth - container.offsetWidth - 8, initialLeft + dx));
        currentTop = Math.max(8, Math.min(window.innerHeight - container.offsetHeight - 8, initialTop + dy));

        if (!animFrameId) {
          animFrameId = requestAnimationFrame(applyPosition);
        }
      }

      function onDragEnd() {
        if (!isDragging) return;
        isDragging = false;
        container.classList.remove('__pixel_island_dragging__');
        if (animFrameId) {
          cancelAnimationFrame(animFrameId);
          animFrameId = null;
        }
        applyPosition();

        // Persist coordinates
        const pos = { left: currentLeft, top: currentTop };
        window.__pixel_island_pos = pos;
        try {
          sessionStorage.setItem('__pixel_island_pos', JSON.stringify(pos));
        } catch {}
      }

      if (header) {
        header.addEventListener('mousedown', (e) => {
          if (e.target === minBtn || e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
          onDragStart(e.clientX, e.clientY);
          e.preventDefault();
        });

        header.addEventListener('touchstart', (e) => {
          if (e.target === minBtn || e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
          if (e.touches.length === 1) {
            onDragStart(e.touches[0].clientX, e.touches[0].clientY);
          }
        }, { passive: true });
      }

      window.addEventListener('mousemove', (e) => {
        if (isDragging) onDragMove(e.clientX, e.clientY);
      });
      window.addEventListener('mouseup', onDragEnd);

      window.addEventListener('touchmove', (e) => {
        if (isDragging && e.touches.length === 1) onDragMove(e.touches[0].clientX, e.touches[0].clientY);
      }, { passive: true });
      window.addEventListener('touchend', onDragEnd);

      // Track active toggle states
      let isPrivacyBlurred = false;
      let isReadModeActive = false;

      // Action button event handlers
      const btnRead = container.querySelector('#pixel-btn-read');
      if (btnRead) {
        btnRead.addEventListener('click', () => {
          window.__pixel_trigger_read = Date.now();
          const badge = container.querySelector('#pixel-hud-status-badge');
          const dot = container.querySelector('#pixel-hud-sensor-dot');
          if (badge) {
            badge.textContent = 'READING...';
            badge.style.color = '#0A84FF';
            badge.style.background = 'rgba(10, 132, 255, 0.15)';
            badge.style.borderColor = 'rgba(10, 132, 255, 0.35)';
          }
          if (dot) {
            dot.style.background = '#0A84FF';
            dot.style.color = '#0A84FF';
          }
          const logMsg = container.querySelector('#pixel-log-msg');
          if (logMsg) logMsg.textContent = 'Perceiving page layout & interactive nodes...';
        });
      }

      const btnReadMode = container.querySelector('#pixel-btn-readmode');
      if (btnReadMode) {
        btnReadMode.addEventListener('click', () => {
          isReadModeActive = !isReadModeActive;
          window.__pixel_trigger_read_mode = { timestamp: Date.now(), active: isReadModeActive };
          if (isReadModeActive) {
            btnReadMode.style.background = 'rgba(191, 90, 242, 0.25)';
            btnReadMode.style.borderColor = 'rgba(191, 90, 242, 0.5)';
            btnReadMode.style.color = '#f5f5f7';
            btnReadMode.innerHTML = '<span style="color: #bf5af2; font-size: 12px;">📖</span> Read Mode [ON]';
          } else {
            btnReadMode.style.background = 'rgba(255, 255, 255, 0.07)';
            btnReadMode.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            btnReadMode.style.color = '#f5f5f7';
            btnReadMode.innerHTML = '<span style="color: #bf5af2; font-size: 12px;">📖</span> Read Mode';
          }
        });
      }

      const btnBlur = container.querySelector('#pixel-btn-blur');
      if (btnBlur) {
        btnBlur.addEventListener('click', () => {
          isPrivacyBlurred = !isPrivacyBlurred;
          window.__pixel_trigger_privacy_blur = { timestamp: Date.now(), active: isPrivacyBlurred };
          if (isPrivacyBlurred) {
            btnBlur.style.background = 'rgba(255, 69, 58, 0.25)';
            btnBlur.style.borderColor = 'rgba(255, 69, 58, 0.5)';
            btnBlur.style.color = '#f5f5f7';
            btnBlur.innerHTML = '<span style="color: #ff453a; font-size: 12px;">🔒</span> Privacy [SHIELD]';
          } else {
            btnBlur.style.background = 'rgba(255, 255, 255, 0.07)';
            btnBlur.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            btnBlur.style.color = '#f5f5f7';
            btnBlur.innerHTML = '<span style="color: #30D158; font-size: 12px;">🔒</span> Privacy Blur';
          }
        });
      }

      const btnClear = container.querySelector('#pixel-btn-clear');
      if (btnClear) {
        btnClear.addEventListener('click', () => {
          window.__pixel_trigger_clear = Date.now();
          document.querySelectorAll('.__pixel_screen_box__, .__pixel_readmode_highlight__, .__pixel_privacy_badge__').forEach(b => b.remove());
          document.querySelectorAll('.__pixel_privacy_blurred__').forEach(el => {
            el.style.filter = '';
            el.classList.remove('__pixel_privacy_blurred__');
          });
          isPrivacyBlurred = false;
          isReadModeActive = false;
          if (btnBlur) {
            btnBlur.style.background = 'rgba(255, 255, 255, 0.07)';
            btnBlur.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            btnBlur.innerHTML = '<span style="color: #30D158; font-size: 12px;">🔒</span> Privacy Blur';
          }
          if (btnReadMode) {
            btnReadMode.style.background = 'rgba(255, 255, 255, 0.07)';
            btnReadMode.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            btnReadMode.innerHTML = '<span style="color: #bf5af2; font-size: 12px;">📖</span> Read Mode';
          }
          const badge = container.querySelector('#pixel-hud-status-badge');
          const dot = container.querySelector('#pixel-hud-sensor-dot');
          if (badge) {
            badge.textContent = 'READY';
            badge.style.color = '#30D158';
            badge.style.background = 'rgba(48, 209, 88, 0.15)';
            badge.style.borderColor = 'rgba(48, 209, 88, 0.35)';
          }
          if (dot) {
            dot.style.background = '#30D158';
            dot.style.color = '#30D158';
          }
          const nodes = container.querySelector('#pixel-nodes-count');
          if (nodes) nodes.textContent = '0 nodes';
          const pStatus = container.querySelector('#pixel-privacy-status');
          if (pStatus) {
            pStatus.textContent = '100% On-Device';
            pStatus.style.color = '#30D158';
          }
          const logMsg = container.querySelector('#pixel-log-msg');
          if (logMsg) logMsg.textContent = 'All overlays and filters cleared.';
        });
      }

      // Run autonomous task
      const taskInput = container.querySelector('#pixel-task-input');
      const btnRun = container.querySelector('#pixel-btn-run');

      function triggerRun(e) {
        if (e) {
          try { e.preventDefault(); e.stopPropagation(); } catch (_) {}
        }
        if (!taskInput) return;
        const val = taskInput.value.trim();
        if (val) {
          window.__pixel_pending_task = val;
          taskInput.blur();
          const badge = container.querySelector('#pixel-hud-status-badge');
          const dot = container.querySelector('#pixel-hud-sensor-dot');
          if (badge) {
            badge.textContent = 'EXECUTING';
            badge.style.color = '#BF5AF2';
            badge.style.background = 'rgba(191, 90, 242, 0.18)';
            badge.style.borderColor = 'rgba(191, 90, 242, 0.4)';
          }
          if (dot) {
            dot.style.background = '#BF5AF2';
            dot.style.color = '#BF5AF2';
          }
          const logMsg = container.querySelector('#pixel-log-msg');
          if (logMsg) logMsg.textContent = 'Task dispatched: ' + val;
        }
      }

      if (btnRun) {
        btnRun.addEventListener('click', (e) => {
          triggerRun(e);
        });
      }
      if (taskInput) {
        taskInput.addEventListener('keydown', (e) => {
          e.stopPropagation();
          if (e.key === 'Enter') {
            triggerRun(e);
          }
        });
        taskInput.addEventListener('keyup', (e) => e.stopPropagation());
        taskInput.addEventListener('keypress', (e) => e.stopPropagation());
      }
    }

    // Safe DOM mounting helper: handles document.readyState === 'loading'
    function mount() {
      if (document.getElementById('__pixel_live_hud_root__')) return;
      if (!document.body) {
        if (document.readyState === 'loading') {
          window.addEventListener('DOMContentLoaded', mount, { once: true });
        } else {
          setTimeout(mount, 20);
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

    // Persistence observer: ensure HUD is never wiped by SPA framework re-renders
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

function generateUpdateHudStatusScript({ status = 'READY', color = '#30D158', message = '', nodeCount = null } = {}) {
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

module.exports = {
  generateLiveHudScript,
  generateUpdateHudStatusScript,
  generateAnnotateBoxesScript,
  generatePrivacyBlurScript,
  generateReadModeScript,
};
