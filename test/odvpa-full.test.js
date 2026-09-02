'use strict';

/**
 * ODVPA Master Acceptance & Verification Test Suite (SIH 2026 PS 26171)
 *
 * Verifies:
 * 1. Section A: SLM Reasoning Tier & Confidence Routing (Zero-cloud local resolution vs Cloud escalation)
 * 2. Section C1: Graceful Degradation Ladder (Offline probe, capability tiers 1-5)
 * 3. Section C2: Task-Aware Context Minimisation (scoreNodeRelevance & node pruning)
 * 4. Section C3: Visible "AI Cursor" Transparency Overlay (generateOverlayScript)
 * 5. Section C4: Independent VLM Benchmark Comparator (Moondream vs SmolVLM evaluation)
 * 6. Section B: LoRA On-Device Personalization & Preference Distillation Loop
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Core Modules
const {
  temperatureScale,
  computeRoutingConfidence,
  computeReasoningConfidence,
  routeDecision,
  EscalationTracker,
} = require('../lib/router');
const { generatePlan } = require('../lib/planning');
const { LocalAuditTrail } = require('../lib/audit');
const { resolveCapabilityTier, CAPABILITY_TIERS } = require('../lib/degradation');
const { buildScreenGraph, scoreNodeRelevance, minimiseScreenGraph } = require('../lib/graph');
const { reduce } = require('../lib/reduce');
const { generateOverlayScript, STATE_COLORS } = require('../lib/overlay');
const { runVlmComparator } = require('../test/benchmark-comparator');
const {
  recordEscalationSuccess,
  readTrainingLog,
  clearTrainingLog,
  DEFAULT_LOG_FILE,
} = require('../lib/preference');
const { redactText } = require('../lib/privacy');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.stack || err.message}`);
    failed++;
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.stack || err.message}`);
    failed++;
  }
}

async function runAll() {
  console.log('\n===============================================================');
  console.log('   ODVPA Master Verification Suite (SLM, LoRA & Advanced)     ');
  console.log('===============================================================\n');

  // --- 1. Section A: SLM Reasoning Tier & Confidence Routing ---
  test('Section A [SLM Tier]: Unambiguous simple action achieves high confidence (>=0.85) -> LOCAL route (0 cloud calls)', () => {
    const action = { verb: 'click', ref: '@e2', intent: 'Click Submit button' };
    const targetNode = { ref: '@e2', role: 'button', text: 'Submit', source: 'axtree' };
    
    const conf = computeReasoningConfidence(action, targetNode, 1.0);
    const decision = routeDecision(conf);

    assert.ok(conf >= 0.85, `Confidence should be >= 0.85, got ${conf}`);
    assert.strictEqual(decision.route, 'LOCAL');
  });

  test('Section A [SLM Tier]: Ambiguous multi-step planning action drops below threshold (<0.55) -> CLOUD escalation', () => {
    const action = { verb: 'unknown_complex_action', intent: 'Multi-step ambiguous search' };
    const conf = computeReasoningConfidence(action, null, 0.2);
    const decision = routeDecision(conf);

    assert.ok(conf < 0.55, `Ambiguous action confidence should be < 0.55, got ${conf}`);
    assert.strictEqual(decision.route, 'CLOUD');
  });

  test('Section A [Audit Role Separation]: EscalationTracker separates reasoning vs vision roles', () => {
    const tracker = new EscalationTracker();
    tracker.recordFrame('LOCAL', 'reasoning');
    tracker.recordFrame('LOCAL', 'reasoning');
    tracker.recordFrame('CLOUD', 'reasoning');
    tracker.recordFrame('LOCAL', 'vision');
    tracker.recordFrame('CLOUD', 'vision');

    const metrics = tracker.getMetrics();
    assert.strictEqual(metrics.totalFrames, 5);
    assert.strictEqual(metrics.roles.reasoning.total, 3);
    assert.strictEqual(metrics.roles.vision.total, 2);
    assert.strictEqual(metrics.roles.reasoning.localRate, 2 / 3);
  });

  // --- 2. Section C1: Graceful Degradation Ladder ---
  await asyncTest('Section C1 [Degradation]: Probing offline Ollama resolves Tier 5 (Cloud Fallback) gracefully without crashing', async () => {
    const tier = await resolveCapabilityTier({ ollamaHost: 'http://localhost:99999' }); // unreachable port
    assert.strictEqual(tier.tier, 5);
    assert.strictEqual(tier.name, 'FULL_CLOUD');
    assert.strictEqual(tier.ollamaReachable, false);
    assert.ok(tier.reason.includes('offline'));
  });

  await asyncTest('Section C1 [Degradation]: Force capability tier override works as configured', async () => {
    const tier = await resolveCapabilityTier({ forceTier: 3 });
    assert.strictEqual(tier.tier, 3);
    assert.strictEqual(tier.name, 'OCR_ONLY');
  });

  // --- 3. Section C2: Task-Aware Context Minimisation ---
  test('Section C2 [Context Minimisation]: Irrelevant ad banners and social links are pruned while target actions are retained', () => {
    const brief = {
      elements: [
        { ref: '@e1', role: 'button', name: 'Submit Application' },
        { ref: '@e2', role: 'link', name: 'Promotional Ad 50% discount banner' },
        { ref: '@e3', role: 'textbox', name: 'Search ISRO Missions' },
      ],
      text: [
        { ref: '@t1', name: 'ISRO Chandrayaan Mission Data' },
        { ref: '@t2', name: 'Facebook Social Follow Page' },
      ],
    };

    const graph = buildScreenGraph(brief);
    const minGraph = minimiseScreenGraph(graph, 'Search ISRO Chandrayaan Missions');

    assert.strictEqual(minGraph.stats.rawNodeCount, 5);
    assert.strictEqual(minGraph.stats.minimisedNodeCount, 3);
    assert.ok(minGraph.stats.reductionRatio >= 0.40, 'Should reduce context by at least 40%');

    const retainedRefs = minGraph.nodes.map(n => n.ref);
    assert.ok(retainedRefs.includes('@e1'));
    assert.ok(retainedRefs.includes('@e3'));
    assert.ok(retainedRefs.includes('@t1'));
    assert.ok(!retainedRefs.includes('@e2'), 'Ad banner should be pruned');
    assert.ok(!retainedRefs.includes('@t2'), 'Social link should be pruned');
  });

  // --- 4. Section C3: Visible "AI Cursor" Transparency Overlay ---
  test('Section C3 [AI Cursor Overlay]: Generates transparency badge and bounding box highlighter script', () => {
    const script = generateOverlayScript({
      state: 'TARGET_FOUND',
      targetRef: '@e1',
      bbox: [120, 240, 150, 45],
      message: 'Clicking Submit',
    });

    assert.ok(script.includes('__pixel_ai_transparency_overlay__'));
    assert.ok(script.includes('TARGET_FOUND'));
    assert.ok(script.includes('Target: @e1'));
    assert.ok(script.includes('__pixel_ai_target_box__'));
    assert.ok(script.includes('#f59e0b')); // Amber highlight box
  });

  // --- 5. Section C4: Independent VLM Benchmark Comparator ---
  test('Section C4 [VLM Comparator]: Evaluates Moondream vs SmolVLM across test fixtures', () => {
    const report = runVlmComparator();
    assert.strictEqual(report.fixturesCount, 5);
    assert.ok(report.comparison.moondream.summary.avgOcrFidelityPercent > 90);
    assert.ok(report.comparison.smolvlm.summary.avgLatencyMs < report.comparison.moondream.summary.avgLatencyMs);
    assert.strictEqual(report.recommendation.tierASelected, 'Moondream2 / LFM2.5-VL');
  });

  // --- 6. Section B: LoRA Personalization & Distillation Loop ---
  test('Section B [Personalization]: Redacts and logs cloud-escalated successes to training log', () => {
    const testLog = path.join(__dirname, 'test-training-log.jsonl');
    if (fs.existsSync(testLog)) fs.unlinkSync(testLog);

    const record = recordEscalationSuccess(
      {
        inputContext: 'User email: scientist@isro.gov.in clicked Submit button',
        cloudAction: { verb: 'click', ref: '@e1', intent: 'Send form' },
        url: 'https://isro.gov.in/portal',
        role: 'reasoning',
      },
      testLog
    );

    assert.ok(record, 'Record should be created');
    assert.ok(!record.input.includes('scientist@isro.gov.in'), 'Input must not contain raw PII');
    assert.ok(record.input.includes('[REDACTED_EMAIL]'), 'Email must be redacted');

    const loaded = readTrainingLog(testLog);
    assert.strictEqual(loaded.length, 1);
    assert.strictEqual(loaded[0].role, 'reasoning');

    if (fs.existsSync(testLog)) fs.unlinkSync(testLog);
  });

  test('Section B [Modelfile & Adapter]: Verified Ollama Modelfile exists with ADAPTER directive', () => {
    const modelfilePath = path.join(__dirname, '../Modelfile');
    assert.ok(fs.existsSync(modelfilePath), 'Modelfile must exist');
    const content = fs.readFileSync(modelfilePath, 'utf8');
    assert.ok(content.includes('FROM qwen2.5:1.5b-instruct'));
    assert.ok(content.includes('ADAPTER ./lora-adapters/pixel-user-adapter.gguf'));
  });

  console.log(`\n===============================================================`);
  console.log(`  ODVPA Master Test Results: ${passed} passed, ${failed} failed.`);
  console.log(`===============================================================\n`);

  if (failed > 0) process.exit(1);
}

runAll();
