'use strict';

/**
 * PIXEL Real-Time Interactive On-Screen HUD (ODVPA Live Controller)
 *
 * Injects a floating, interactive control dock directly into Chrome:
 * - Real-time screen reading & bounding box visualization
 * - On-screen task prompt execution
 * - Live agent state indicators (Observing / Thinking / Acting)
 * - PII detection badges & privacy verification
 */

function generateLiveHudScript() {
  return `(() => {
    if (document.getElementById('__pixel_live_hud_root__')) return;

    const root = document.createElement('div');
    root.id = '__pixel_live_hud_root__';
    root.style.cssText = \`
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: rgba(15, 23, 42, 0.94);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(59, 130, 246, 0.4);
      border-radius: 16px;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(59, 130, 246, 0.2);
      color: #f8fafc;
      width: 360px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      transition: all 0.2s ease-in-out;
      user-select: none;
    \`;

    root.innerHTML = \`
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 10px; height: 10px; border-radius: 50%; background: #10b981; box-shadow: 0 0 8px #10b981; animation: pulse 2s infinite;"></div>
          <span style="font-weight: 700; font-size: 14px; letter-spacing: 0.5px; background: linear-gradient(135deg, #60a5fa, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">PIXEL ODVPA LIVE</span>
        </div>
        <span id="pixel-hud-status-badge" style="font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 12px; background: rgba(59, 130, 246, 0.2); color: #93c5fd; border: 1px solid rgba(59, 130, 246, 0.3);">READY</span>
      </div>

      <div id="pixel-hud-stats" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 11px;">
        <div style="background: rgba(255,255,255,0.05); padding: 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
          <div style="color: #94a3b8;">Perception</div>
          <div id="pixel-nodes-count" style="font-weight: 600; font-size: 13px; color: #38bdf8;">0 nodes</div>
        </div>
        <div style="background: rgba(255,255,255,0.05); padding: 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
          <div style="color: #94a3b8;">Privacy Gate</div>
          <div id="pixel-privacy-status" style="font-weight: 600; font-size: 13px; color: #4ade80;">100% On-Device</div>
        </div>
      </div>

      <div style="display: flex; gap: 8px;">
        <button id="pixel-btn-read" style="flex: 1; padding: 8px 12px; background: #2563eb; hover: #1d4ed8; color: white; border: none; border-radius: 8px; font-weight: 600; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 2px 8px rgba(37,99,235,0.4);">
          <span>👁️</span> Read Screen
        </button>
        <button id="pixel-btn-clear" style="padding: 8px 12px; background: rgba(255,255,255,0.1); color: #cbd5e1; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; font-weight: 600; font-size: 12px; cursor: pointer;">
          Clear
        </button>
      </div>

      <div style="display: flex; gap: 6px;">
        <input id="pixel-task-input" type="text" placeholder="Type autonomous task..." style="flex: 1; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; padding: 8px 10px; color: white; font-size: 12px; outline: none;" />
        <button id="pixel-btn-run" style="padding: 8px 14px; background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; border-radius: 8px; font-weight: 600; font-size: 12px; cursor: pointer;">
          Run
        </button>
      </div>

      <div id="pixel-log-msg" style="font-size: 11px; color: #94a3b8; max-height: 50px; overflow-y: auto; padding: 4px 6px; background: rgba(0,0,0,0.3); border-radius: 6px; font-family: monospace;">
        Connected to PIXEL Real-Time Agent.
      </div>
    \`;

    document.body.appendChild(root);

    // Event handlers inside browser tab
    document.getElementById('pixel-btn-read').addEventListener('click', () => {
      window.__pixel_trigger_read = Date.now();
      document.getElementById('pixel-hud-status-badge').textContent = 'READING...';
      document.getElementById('pixel-hud-status-badge').style.color = '#fbbf24';
    });

    document.getElementById('pixel-btn-clear').addEventListener('click', () => {
      window.__pixel_trigger_clear = Date.now();
      const boxes = document.querySelectorAll('.__pixel_screen_box__');
      boxes.forEach(b => b.remove());
      document.getElementById('pixel-hud-status-badge').textContent = 'READY';
      document.getElementById('pixel-nodes-count').textContent = '0 nodes';
    });

    document.getElementById('pixel-btn-run').addEventListener('click', () => {
      const val = document.getElementById('pixel-task-input').value.trim();
      if (val) {
        window.__pixel_pending_task = val;
        document.getElementById('pixel-hud-status-badge').textContent = 'EXECUTING';
        document.getElementById('pixel-hud-status-badge').style.color = '#a855f7';
        document.getElementById('pixel-log-msg').textContent = 'Task dispatched: ' + val;
      }
    });

    document.getElementById('pixel-task-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        document.getElementById('pixel-btn-run').click();
      }
    });
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
        border: 2px solid rgba(59, 130, 246, 0.7);
        background: rgba(59, 130, 246, 0.08);
        border-radius: 4px;
        pointer-events: none;
        z-index: 2147483640;
        transition: all 0.15s ease-in-out;
      \`;

      const label = document.createElement('div');
      label.style.cssText = \`
        position: absolute;
        top: -18px;
        left: 0;
        background: #1e293b;
        color: #38bdf8;
        font-size: 10px;
        font-weight: 600;
        padding: 1px 5px;
        border-radius: 3px;
        white-space: nowrap;
        border: 1px solid rgba(59, 130, 246, 0.5);
      \`;
      label.textContent = (el.ref || '') + ' ' + (el.role || '');
      box.appendChild(label);
      document.body.appendChild(box);
      count++;
    }

    // Update HUD count
    const nodeBadge = document.getElementById('pixel-nodes-count');
    if (nodeBadge) nodeBadge.textContent = count + ' elements';
    const statusBadge = document.getElementById('pixel-hud-status-badge');
    if (statusBadge) {
      statusBadge.textContent = 'PERCEIVED';
      statusBadge.style.color = '#38bdf8';
    }
  })()`;
}

module.exports = {
  generateLiveHudScript,
  generateAnnotateBoxesScript,
};
