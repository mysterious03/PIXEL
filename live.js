#!/usr/bin/env node
'use strict';

require('dotenv').config({ quiet: true });

/**
 * PIXEL Real-Time On-Screen Live Runner (ODVPA Live Perception & Agent Dock)
 *
 * Connects to Chrome, injects the on-screen live control dock directly onto the page,
 * and enables real-time visual reading, bounding-box annotation, and task execution.
 */

const readline = require('readline');
const { connect } = require('./lib/connect');
const { launch, isRunning } = require('./lib/launch');
const { generateLiveHudScript, generateAnnotateBoxesScript } = require('./lib/live-hud');
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
    console.log('✓ Connected to Chrome live session on port 9222');
  } catch (err) {
    console.error(`[PIXEL Live] Error connecting to Chrome: ${err.message}`);
    console.log('Tip: Make sure Chrome is running with: chrome.exe --remote-debugging-port=9222');
    process.exit(1);
  }

  const client = session.client;

  // Injects HUD into current page
  async function injectHud() {
    try {
      await client.Runtime.evaluate({ expression: generateLiveHudScript() });
    } catch (err) {}
  }

  await injectHud();
  console.log('✓ Injected PIXEL Interactive Control Dock onto Chrome page.');
  console.log('\n--- Controls Available ---');
  console.log('  1. On-Screen: Click "👁️ Read Screen" in the floating dock in Chrome.');
  console.log('  2. On-Screen: Type any task in the input box and click "Run".');
  console.log('  3. Terminal:  Type any command below (or type "read" to perceive screen).\n');

  // Background watcher for on-screen HUD triggers
  let lastHandledRead = 0;
  let isExecuting = false;

  const pollInterval = setInterval(async () => {
    if (isExecuting) return;
    try {
      const res = await client.Runtime.evaluate({
        expression: `({
          triggerRead: window.__pixel_trigger_read || 0,
          pendingTask: window.__pixel_pending_task || null
        })`,
        returnByValue: true,
      });

      const val = res.result?.value;
      if (!val) return;

      // Handle on-screen "Read Screen" trigger
      if (val.triggerRead && val.triggerRead > lastHandledRead) {
        lastHandledRead = val.triggerRead;
        console.log('\n[PIXEL Live] "Read Screen" triggered from Chrome HUD...');
        
        await updateStateOverlay(client, { state: 'OBSERVING', message: 'Reading page layout...' });
        const brief = await session.extract({ inViewportOnly: true });
        const graph = buildScreenGraph(brief);

        console.log(`[PIXEL Live] Perceived ${graph.nodes.length} ScreenGraph nodes on page.`);
        await client.Runtime.evaluate({
          expression: generateAnnotateBoxesScript(brief.elements || []),
        });
        await updateStateOverlay(client, { state: 'OBSERVING', message: `Found ${brief.elements?.length || 0} interactive elements` });
      }

      // Handle on-screen "Run Task" trigger
      if (val.pendingTask && !isExecuting) {
        const taskPrompt = val.pendingTask;
        isExecuting = true;

        // Clear browser pending task flag
        await client.Runtime.evaluate({ expression: `window.__pixel_pending_task = null;` });

        console.log(`\n[PIXEL Live] Executing Task from Chrome HUD: "${taskPrompt}"`);
        await updateStateOverlay(client, { state: 'THINKING', message: 'Formulating action plan...' });

        const cfg = loadConfig();
        await run(taskPrompt, {
          config: cfg,
          interactive: false,
        });

        await updateStateOverlay(client, { state: 'OBSERVING', message: 'Task Completed.' });
        isExecuting = false;
        await injectHud();
      }
    } catch (err) {
      // If tab navigated or refreshed, re-inject HUD
      await injectHud();
    }
  }, 400);

  // Terminal CLI input handler
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  
  const promptUser = () => {
    rl.question('pixel> ', async (input) => {
      const cmd = input.trim();
      if (!cmd || cmd === 'exit' || cmd === 'quit') {
        clearInterval(pollInterval);
        rl.close();
        await session.close();
        process.exit(0);
      }

      if (cmd === 'read' || cmd === 'perceive') {
        console.log('[PIXEL Live] Reading live screen...');
        await updateStateOverlay(client, { state: 'OBSERVING', message: 'Reading Screen Graph...' });
        const brief = await session.extract({ inViewportOnly: true });
        await client.Runtime.evaluate({ expression: generateAnnotateBoxesScript(brief.elements || []) });
        console.log(`✓ Detected ${brief.elements?.length || 0} interactive elements with bounding boxes.`);
      } else {
        console.log(`[PIXEL Live] Running task: "${cmd}"`);
        isExecuting = true;
        const cfg = loadConfig();
        await run(cmd, { config: cfg });
        isExecuting = false;
        await injectHud();
      }

      promptUser();
    });
  };

  promptUser();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
