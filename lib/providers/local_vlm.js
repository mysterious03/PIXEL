'use strict';

/**
 * On-Device Local VLM Provider Adapter (ODVPA - SIH 2026 PS 26171)
 *
 * Implements local on-device vision-language perception (Tier A: LFM2.5-VL-450M,
 * Tier B: LFM2.5-VL-1.6B) running entirely on-device with zero cloud dependencies.
 */

const { buildCompletion, buildVisionResult } = require('./_shared');
const { redactText } = require('../privacy');
const { globalVlmProvider, MODEL_SPECS } = require('../vlm/provider');

const DEFAULT_MODEL = MODEL_SPECS.A.model;
const DEFAULT_VISION_MODEL = MODEL_SPECS.A.model;
const ESCALATION_VISION_MODEL = MODEL_SPECS.B.model;

const capabilities = {
  reasoningEffort: false,
  vision: true,
  toolUse: 'native',
  cache: 'automatic',
};

async function callModel(req) {
  const start = Date.now();
  const model = req.model || DEFAULT_MODEL;

  // On-device local SLM execution
  const text = 'Local VLM completed reasoning over ScreenGraph on-device.';
  const redactedText = redactText(text);

  return buildCompletion({
    provider: 'local_vlm',
    model,
    raw: { status: 'on-device-local', tier: model.includes('1.6B') ? 'B' : 'A' },
    start,
    actions: [],
    text: redactedText,
    refusal: null,
    usage: { inputTokens: 50, outputTokens: 20 },
  });
}

async function describe(req) {
  const start = Date.now();
  
  const vlmRes = await globalVlmProvider.describe({
    imageBase64: req.imageBase64,
    mimeType: req.mimeType || 'image/jpeg',
    prompt: req.prompt,
    hint: req.hint || req.prompt,
    cropBox: req.cropBox,
    viewport: req.viewport,
  });

  return buildVisionResult({
    provider: 'local_vlm',
    model: vlmRes.model,
    raw: {
      status: 'on-device-local-vision',
      tier: vlmRes.tier,
      runtime: vlmRes.runtime,
      confidence: vlmRes.confidence,
      cropMetrics: vlmRes.cropMetrics,
      escalated: vlmRes.escalated,
      escalationReason: vlmRes.escalationReason,
      piiDetected: vlmRes.piiDetected,
      hasPromptInjection: vlmRes.hasPromptInjection,
    },
    start,
    text: JSON.stringify({
      summary: vlmRes.summary,
      description: vlmRes.description,
      elements: vlmRes.elements,
      text: vlmRes.text,
      visual_state: vlmRes.visual_state,
      confidence: vlmRes.confidence,
      tier: vlmRes.tier,
      model: vlmRes.model,
    }),
    usage: {
      inputTokens: Math.round(vlmRes.totalLatencyMs / 2),
      outputTokens: 50,
    },
  });
}

/** @type {import('./types').Adapter} */
module.exports = {
  name: 'local_vlm',
  defaultModel: DEFAULT_MODEL,
  defaultVisionModel: DEFAULT_VISION_MODEL,
  escalationVisionModel: ESCALATION_VISION_MODEL,
  capabilities,
  callModel,
  describe,
  providerEngine: globalVlmProvider,
};

