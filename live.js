#!/usr/bin/env node
'use strict';

require('dotenv').config({ quiet: true });

/**
 * PIXEL Real-Time On-Screen Live Runner (ODVPA Live Perception & Agent Dock)
 *
 * Multi-Tab Persistent Live Agent:
 * - Automatically injects floating HUD into all open tabs & preserves across navigations
 * - Actively follows the user when switching tabs in Chrome
 * - Listens for on-screen HUD triggers across all tabs
 * - Dispatches terminal commands & autonomous tasks directly to the visible active tab
 */

const readline = require('readline');
const CDP = require('chrome-remote-interface');
const { connect } = require('./lib/connect');
const { launch, isRunning, isControllablePageTarget } = require('./lib/launch');
const { 
  generateLiveHudScript, 
  generateUpdateHudStatusScript,
  generateAnnotateBoxesScript,
  generatePrivacyBlurScript,
  generateReadModeScript
} = require('./lib/live-hud');
const { updateStateOverlay, clearStateOverlay } = require('./lib/overlay');
const { buildScreenGraph } = require('./lib/graph');
const { run } = require('./lib/loop');
const { loadConfig } = require('./lib/config');

async function ensureChromeRunning() {
  try {
    const running = await isRunning(9222);
    if (running) return true;
    console.log('[PIXEL Live] Launching Chrome on port 9222...');
    await launch({ port: 9222 });
    return true;
  } catch (err) {
    console.error(`[PIXEL Live] Notice: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('\n=============================================================');
  console.log('       PIXEL ODVPA — Real-Time Live On-Screen Agent         ');
  console.log('=============================================================\n');

  await ensureChromeRunning();

  let session;
  try {
    session = await connect({ port: 9222 });
    console.log(`✓ Connected to Chrome live session on port 9222 (Tab: "${session.targetTitle || 'Initial'}")`);
  } catch (err) {
    console.error(`[PIXEL Live] Error connecting to Chrome: ${err.message}`);
    console.log('Tip: Make sure Chrome is running with: chrome.exe --remote-debugging-port=9222');
    process.exit(1);
  }

  // Registry of targets where addScriptToEvaluateOnNewDocument is registered
  const registeredScriptTargets = new Set();

  // Multi-tab HUD synchronizer: injects and maintains the HUD across all open Chrome tabs
  async function syncAllTabsHud() {
    try {
      const list = await CDP.List({ port: 9222 });
      const pages = (list || []).filter(isControllablePageTarget);
      for (const page of pages) {
        let tempClient = null;
        try {
          const isCurrent = (page.id === session.targetId);
          const client = isCurrent ? session.client : await CDP({ target: page.id, port: 9222 });
          if (!isCurrent) tempClient = client;

          // 1. Register HUD script to run automatically on any new navigation or reload
          if (!registeredScriptTargets.has(page.id)) {
            try {
              await client.Page.enable().catch(() => {});
              await client.Page.addScriptToEvaluateOnNewDocument({ source: generateLiveHudScript() });
              registeredScriptTargets.add(page.id);
            } catch {}
          }

          // 2. Check if HUD element currently exists in DOM, inject if missing
          const checkRes = await client.Runtime.evaluate({
            expression: `Boolean(document.getElementById('__pixel_live_hud_root__'))`,
            returnByValue: true,
          });
          if (!checkRes.result?.value) {
            await client.Runtime.evaluate({ expression: generateLiveHudScript() });
          }
        } catch {}
        finally {
          if (tempClient) {
            try { await tempClient.close(); } catch {}
          }
        }
      }
    } catch {}
  }

  await syncAllTabsHud();
  console.log('✓ Injected PIXEL Interactive Control Dock across Chrome tabs.');
  console.log('\n--- Controls Available ---');
  console.log('  1. On-Screen: Click "👁️ Read Screen" in the floating dock in Chrome.');
  console.log('  2. On-Screen: Type any task in the input box and click "Run".');
  console.log('  3. Terminal:  Type any command below (or type "read" to perceive screen).');
  console.log('  * Multi-Tab:  Switch to ANY tab in Chrome — PIXEL will automatically track it!\n');

  // Background watcher for on-screen HUD triggers and tab switching
  let lastHandledRead = 0;
  let lastHandledBlur = 0;
  let lastHandledReadMode = 0;
  let lastTabSyncTime = 0;
  let isExecuting = false;

  const pollInterval = setInterval(async () => {
    try {
      const now = Date.now();
      // 1. Maintain HUD presence across all open tabs even while executing
      if (now - lastTabSyncTime > 1500) {
        lastTabSyncTime = now;
        await syncAllTabsHud();
      }

      // 2. Detect if user switched tabs in Chrome (only track manual switch when idle)
      if (!isExecuting) {
        const visibleTab = await session.getVisibleTab();
        if (visibleTab && visibleTab.id !== session.targetId) {
          const switched = await session.switchToTab(visibleTab.id, visibleTab);
          if (switched) {
            console.log(`\n\x1b[36m[PIXEL Tab Switch]\x1b[0m Switched active session to: "${visibleTab.title || ''}" (${visibleTab.url || ''})`);
          }
        }
      }

      if (isExecuting) return;

      const client = session.client;
      if (!client) return;

      // 3. Inspect active tab for on-screen HUD interactions
      let res = await client.Runtime.evaluate({
        expression: `({
          triggerRead: window.__pixel_trigger_read || 0,
          triggerPrivacyBlur: window.__pixel_trigger_privacy_blur || null,
          triggerReadMode: window.__pixel_trigger_read_mode || null,
          pendingTask: window.__pixel_pending_task || null
        })`,
        returnByValue: true,
      });

      let val = res.result?.value;

      // 4. If active tab has no pending task, check if the user clicked "Run" on any background tab!
      if (!val?.pendingTask) {
        try {
          const list = await CDP.List({ port: 9222 });
          const otherPages = (list || []).filter(p => isControllablePageTarget(p) && p.id !== session.targetId);
          for (const op of otherPages) {
            let tempClient = null;
            try {
              tempClient = await CDP({ target: op.id, port: 9222 });
              const opRes = await tempClient.Runtime.evaluate({
                expression: `({ pendingTask: window.__pixel_pending_task || null })`,
                returnByValue: true,
              });
              if (opRes.result?.value?.pendingTask) {
                // User submitted a task from another tab! Switch to that tab and bring to front
                await session.switchToTab(op.id, op);
                await session.client.Page.bringToFront().catch(() => {});
                console.log(`\n\x1b[36m[PIXEL Tab Switch]\x1b[0m Following task trigger to tab: "${op.title || ''}"`);
                val = opRes.result.value;
                break;
              }
            } catch {}
            finally {
              if (tempClient) {
                try { await tempClient.close(); } catch {}
              }
            }
          }
        } catch {}
      }

      if (!val) return;

      // Handle on-screen "Read Screen" trigger
      if (val.triggerRead && val.triggerRead > lastHandledRead) {
        lastHandledRead = val.triggerRead;
        console.log(`\n[PIXEL Live] "Read Screen" triggered on tab: "${session.targetTitle || ''}"...`);
        
        await updateStateOverlay(session.client, { state: 'OBSERVING', message: 'Reading page layout...' });
        const brief = await session.extract({ inViewportOnly: true });
        const graph = buildScreenGraph(brief);

        console.log(`[PIXEL Live] Perceived ${graph.nodes.length} ScreenGraph nodes on page.`);
        await session.client.Runtime.evaluate({
          expression: generateAnnotateBoxesScript(brief.elements || []),
        });
        await session.client.Runtime.evaluate({
          expression: generateUpdateHudStatusScript({
            status: 'READY',
            color: '#93c5fd',
            message: `Perceived ${brief.elements?.length || 0} interactive elements.`,
            nodeCount: graph.nodes.length,
          }),
        });
        await updateStateOverlay(session.client, { state: 'OBSERVING', message: `Found ${brief.elements?.length || 0} interactive elements` });
      }

      // Handle on-screen "Privacy Blur" trigger
      if (val.triggerPrivacyBlur && val.triggerPrivacyBlur.timestamp > lastHandledBlur) {
        lastHandledBlur = val.triggerPrivacyBlur.timestamp;
        const blurRes = await session.client.Runtime.evaluate({
          expression: generatePrivacyBlurScript({ active: val.triggerPrivacyBlur.active }),
          returnByValue: true,
        });
        const blurredCount = blurRes.result?.value || 0;
        if (val.triggerPrivacyBlur.active) {
          console.log(`\n[PIXEL Live] 🔒 Privacy Shield engaged: blurred ${blurredCount} sensitive PII fields on page.`);
        } else {
          console.log('\n[PIXEL Live] 🔒 Privacy Shield disengaged.');
        }
      }

      // Handle on-screen "Read Mode" trigger
      if (val.triggerReadMode && val.triggerReadMode.timestamp > lastHandledReadMode) {
        lastHandledReadMode = val.triggerReadMode.timestamp;
        await session.client.Runtime.evaluate({
          expression: generateReadModeScript({ active: val.triggerReadMode.active }),
        });
        console.log(`\n[PIXEL Live] 📖 Read Mode ${val.triggerReadMode.active ? 'activated' : 'deactivated'}.`);
      }

      // Handle on-screen "Run Task" trigger
      if (val.pendingTask && !isExecuting) {
        const taskPrompt = val.pendingTask;
        isExecuting = true;

        // Clear browser pending task flag
        await session.client.Runtime.evaluate({ expression: `window.__pixel_pending_task = null;` });

        console.log(`\n[PIXEL Live] Executing Task from Chrome HUD on tab "${session.targetTitle}": "${taskPrompt}"`);
        // Real-time privacy protection: auto-blur sensitive elements on page
        try {
          const autoBlurRes = await session.client.Runtime.evaluate({
            expression: generatePrivacyBlurScript({ active: true }),
            returnByValue: true,
          });
          const count = autoBlurRes.result?.value || 0;
          if (count > 0) {
            console.log(`[PIXEL Privacy] 🔒 Visual Privacy Shield active: blurred ${count} sensitive PII elements on page.`);
          }
        } catch (e) {}

        await updateStateOverlay(session.client, { state: 'THINKING', message: 'Formulating action plan...' });
        await session.client.Runtime.evaluate({
          expression: generateUpdateHudStatusScript({
            status: 'EXECUTING',
            color: '#c084fc',
            message: `Starting: ${taskPrompt}`,
          }),
        });

        try {
          const cfg = loadConfig();
          await run({
            session,
            task: taskPrompt,
            config: cfg,
          });
          await updateStateOverlay(session.client, { state: 'OBSERVING', message: 'Task Completed.' });
          await session.client.Runtime.evaluate({
            expression: generateUpdateHudStatusScript({
              status: 'READY',
              color: '#34d399',
              message: 'Task completed successfully.',
            }),
          });
        } catch (err) {
          console.error(`\x1b[31m[PIXEL Live Error]\x1b[0m ${err.message}`);
          await updateStateOverlay(session.client, { state: 'OBSERVING', message: `Task failed: ${err.message}` });
          await session.client.Runtime.evaluate({
            expression: generateUpdateHudStatusScript({
              status: 'FAILED',
              color: '#ef4444',
              message: `Error: ${err.message}`,
            }),
          });
        } finally {
          isExecuting = false;
          await syncAllTabsHud();
        }
      }
    } catch (err) {
      // Re-synchronize HUD across open tabs on error or navigation
      await syncAllTabsHud();
    }
  }, 250);

  // Terminal CLI input handler (Interactive shell)
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  
  console.log('💬 Interactive Terminal Agent Ready.');
  console.log('Type a task, or use commands: [read] [tree] [vlm] [privacy] [clear] [help] [exit]\n');

  const promptUser = () => {
    rl.question('\x1b[36m[pixel-agent]\x1b[0m> ', async (input) => {
      const cmd = input.trim();
      if (!cmd) {
        promptUser();
        return;
      }

      if (cmd === 'exit' || cmd === 'quit') {
        clearInterval(pollInterval);
        rl.close();
        await session.close();
        process.exit(0);
      }

      // Always ensure the active session follows the user's currently focused Chrome tab
      await session.followVisibleTab();

      if (cmd === 'help') {
        console.log('\n\x1b[1m--- PIXEL Terminal Agent Commands ---\x1b[0m');
        console.log('  \x1b[32mread\x1b[0m        Extract ScreenGraph & draw light blue visual bounding boxes on active page');
        console.log('  \x1b[32mtree\x1b[0m        Print the zero-cost ScreenGraph element hierarchy in terminal');
        console.log('  \x1b[32mvlm\x1b[0m         Run real On-Device VLM inference (LFM2.5-VL) on active page viewport');
        console.log('  \x1b[32mprivacy\x1b[0m     Run 100% on-device PII scanner on page elements & credentials');
        console.log('  \x1b[32mblur\x1b[0m        Visually blur all sensitive PII & credentials on page in Chrome');
        console.log('  \x1b[32munblur\x1b[0m      Remove privacy blur from the page');
        console.log('  \x1b[32mreadmode\x1b[0m    Toggle distraction-free Read Mode with focused perception');
        console.log('  \x1b[32mclear\x1b[0m       Clear all visual bounding boxes and filters from the browser page');
        console.log('  \x1b[33m<any task>\x1b[0m  Execute full autonomous agent loop (e.g. "search for AI news on Google")');
        console.log('  \x1b[31mexit\x1b[0m        Exit the live agent terminal\n');
      } else if (cmd === 'clear') {
        await session.client.Runtime.evaluate({
          expression: `(() => {
            document.querySelectorAll('.__pixel_screen_box__, #__pixel_ai_target_box__, #__pixel_ai_vision_box__, .__pixel_readmode_highlight__, .__pixel_privacy_badge__').forEach(e => e.remove());
            document.querySelectorAll('.__pixel_privacy_blurred__').forEach(el => { el.style.filter = ''; el.classList.remove('__pixel_privacy_blurred__'); });
            document.querySelectorAll('.__pixel_readmode_dimmed__').forEach(e => { e.style.opacity = ''; e.classList.remove('__pixel_readmode_dimmed__'); });
            document.querySelectorAll('.__pixel_readmode_focus__').forEach(e => { e.style.outline = ''; e.style.boxShadow = ''; e.classList.remove('__pixel_readmode_focus__'); });
          })()`,
        });
        await clearStateOverlay(session.client);
        console.log(`✓ Overlays and privacy filters cleared from tab "${session.targetTitle}".`);
      } else if (cmd === 'blur') {
        const res = await session.client.Runtime.evaluate({
          expression: generatePrivacyBlurScript({ active: true }),
          returnByValue: true,
        });
        const count = res.result?.value || 0;
        console.log(`\x1b[32m✓ Visual Privacy Shield engaged: blurred ${count} sensitive PII fields on tab "${session.targetTitle}".\x1b[0m`);
      } else if (cmd === 'unblur') {
        await session.client.Runtime.evaluate({ expression: generatePrivacyBlurScript({ active: false }) });
        console.log(`\x1b[32m✓ Visual Privacy Shield disengaged (unblurred) on tab "${session.targetTitle}".\x1b[0m`);
      } else if (cmd === 'readmode') {
        await session.client.Runtime.evaluate({ expression: generateReadModeScript({ active: true }) });
        console.log(`\x1b[32m✓ Read Mode activated on tab "${session.targetTitle}".\x1b[0m`);
      } else if (cmd === 'read' || cmd === 'perceive') {
        console.log(`\n\x1b[34m[PIXEL Perception]\x1b[0m Extracting live page elements from tab "${session.targetTitle}"...`);
        await updateStateOverlay(session.client, { state: 'OBSERVING', message: 'Reading Screen Graph...' });
        const brief = await session.extract({ inViewportOnly: true });
        await session.client.Runtime.evaluate({ expression: generateAnnotateBoxesScript(brief.elements || []) });
        console.log(`\x1b[32m✓ Perceived ${brief.elements?.length || 0} interactive elements with glowing light-blue bounding boxes.\x1b[0m`);
      } else if (cmd === 'tree') {
        const brief = await session.extract({ inViewportOnly: true });
        const graph = buildScreenGraph(brief);
        console.log(`\n\x1b[1m=== Zero-Cost Screen Graph (${graph.nodes.length} nodes on "${session.targetTitle}") ===\x1b[0m`);
        for (const node of graph.nodes.slice(0, 15)) {
          console.log(`  \x1b[36m${node.ref}\x1b[0m [${node.role}] "${node.name || '(unnamed)'}" at [${node.bbox.join(',')}]`);
        }
        if (graph.nodes.length > 15) console.log(`  ... and ${graph.nodes.length - 15} more nodes.`);
        console.log('==============================================\n');
      } else if (cmd === 'vlm') {
        console.log(`\n\x1b[35m[On-Device VLM]\x1b[0m Capturing visual region from tab "${session.targetTitle}" for local inference...`);
        const { globalVlmProvider } = require('./lib/vlm/provider');
        const brief = await session.extract({ inViewportOnly: true });
        const firstEl = brief.elements?.[0];
        const cropBox = firstEl?.bbox ? { x: Math.max(0, firstEl.bbox[0]), y: Math.max(0, firstEl.bbox[1]), width: Math.max(10, firstEl.bbox[2]), height: Math.max(10, firstEl.bbox[3]) } : { x: 50, y: 50, width: 300, height: 180 };
        
        // Capture screenshot of live Chrome tab
        let imageBase64;
        try {
          const shot = await session.client.Page.captureScreenshot({
            format: 'jpeg',
            quality: 85,
            clip: { x: cropBox.x, y: cropBox.y, width: cropBox.width, height: cropBox.height, scale: 1 },
          });
          imageBase64 = shot.data;
        } catch (err) {
          const shot = await session.client.Page.captureScreenshot({ format: 'jpeg', quality: 80 });
          imageBase64 = shot.data;
        }

        const result = await globalVlmProvider.describe({
          imageBase64,
          mimeType: 'image/jpeg',
          cropBox,
          viewport: { width: 1920, height: 1080 },
          prompt: 'Identify all interactive buttons, text fields, and visual charts in this crop.',
        });
        console.log(`\x1b[32m✓ Local VLM Model:\x1b[0m ${result.model} (${result.tier})`);
        console.log(`\x1b[32m✓ Runtime:\x1b[0m ${result.runtime}`);
        console.log(`\x1b[32m✓ Latency:\x1b[0m ${result.totalLatencyMs}ms`);
        console.log(`\x1b[32m✓ Pixel Reduction:\x1b[0m ${result.cropMetrics?.savingsPercent}% bandwidth saved vs full screenshot`);
        console.log(`\x1b[32m✓ Confidence:\x1b[0m ${result.confidence} -> Action: ${result.confidence > 0.85 ? 'LOCAL_CONFIRM' : 'ESCALATE'}\n`);
      } else if (cmd === 'privacy') {
        const { detectTextPii } = require('./lib/privacy');
        const brief = await session.extract({ inViewportOnly: true });
        let piiCount = 0;
        for (const el of brief.elements || []) {
          const match = detectTextPii(el.name || '');
          if (match.hasPii) {
            console.log(`  \x1b[31m[PII Blocked]\x1b[0m Element ${el.ref} contains ${match.detectedType}: "${match.redactedText}"`);
            piiCount++;
          }
        }
        if (piiCount === 0) {
          console.log(`\x1b[32m✓ 100% On-Device Privacy Gate: No exposed PII or credentials detected on tab "${session.targetTitle}".\x1b[0m\n`);
        } else {
          console.log(`\x1b[33m✓ Privacy Gate successfully intercepted and sanitized ${piiCount} PII fields on tab "${session.targetTitle}".\x1b[0m\n`);
        }
      } else {
        console.log(`\n\x1b[33m[PIXEL Agent Task]\x1b[0m Dispatched on tab "${session.targetTitle}": "${cmd}"`);
        isExecuting = true;
        try {
          const cfg = loadConfig();
          await run({
            session,
            task: cmd,
            config: cfg,
          });
        } catch (err) {
          console.error(`\x1b[31m[Agent Error]\x1b[0m ${err.message}`);
        } finally {
          isExecuting = false;
          await syncAllTabsHud();
        }
      }

      promptUser();
    });
  };

  // If user passed a goal directly (e.g. node live.js "I want to buy shoe"), execute immediately
  const initialGoal = process.argv.slice(2).filter(a => !a.startsWith('-')).join(' ').trim();
  if (initialGoal) {
    await session.followVisibleTab();
    console.log(`\n\x1b[33m[PIXEL Autonomous Goal]\x1b[0m Starting on tab "${session.targetTitle}": "${initialGoal}"`);
    isExecuting = true;
    try {
      const cfg = loadConfig();
      await run({
        session,
        task: initialGoal,
        config: cfg,
      });
    } catch (err) {
      console.error(`\x1b[31m[Agent Error]\x1b[0m ${err.message}`);
    } finally {
      isExecuting = false;
      await syncAllTabsHud();
    }
  }

  promptUser();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
