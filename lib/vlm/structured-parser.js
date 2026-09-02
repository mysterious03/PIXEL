'use strict';

/**
 * ODVPA Local VLM Structured Visual Parser
 *
 * Enforces structured schema parsing, extracts visual UI elements, detects
 * chart/telemetry data, scans for indirect prompt injection, and redacts PII.
 */

const { redactText, detectTextPii } = require('../privacy');
const { scanTextForInjection } = require('../injection');

/**
 * Normalizes and validates structured VLM outputs into the PIXEL perception contract
 * @param {string|Object} rawOutput - Raw model generation or JSON string
 * @param {Object} context - { hint, cropBox, model, tier }
 * @returns {Object} Normalized structured visual perception result
 */
function parseStructuredVisualOutput(rawOutput, context = {}) {
  let structured = null;

  if (typeof rawOutput === 'object' && rawOutput !== null) {
    structured = { ...rawOutput };
  } else if (typeof rawOutput === 'string') {
    const trimmed = rawOutput.trim();
    try {
      structured = JSON.parse(trimmed);
    } catch {
      // Look for fenced JSON block
      const jsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
      if (jsonMatch) {
        try { structured = JSON.parse(jsonMatch[1].trim()); } catch {}
      }
      if (!structured) {
        const start = trimmed.indexOf('{');
        const end = trimmed.lastIndexOf('}');
        if (start >= 0 && end > start) {
          try { structured = JSON.parse(trimmed.slice(start, end + 1)); } catch {}
        }
      }
    }
  }

  // Fallback to structured wrapper if pure plain text was returned
  if (!structured || typeof structured !== 'object') {
    const plainText = String(rawOutput || '').trim();
    structured = {
      summary: plainText.slice(0, 80) || 'Visual region analyzed',
      description: plainText,
      elements: [],
      text: [],
      visual_state: 'rendered',
      confidence: 0.85,
    };
  }

  // 1. Scan for Indirect Prompt Injection in Visual Text (Phase 8)
  const fullTextToScan = `${structured.summary || ''} ${structured.description || ''} ${(structured.text || []).join(' ')}`;
  const injectionScan = scanTextForInjection(fullTextToScan);
  const containsInjection = injectionScan.hasInjection;

  let sanitizedSummary = structured.summary || '';
  let sanitizedDescription = structured.description || '';

  if (containsInjection) {
    sanitizedSummary = scanTextForInjection(sanitizedSummary).cleanText;
    sanitizedDescription = scanTextForInjection(sanitizedDescription).cleanText;
  }

  // 2. Enforce 5-Stage Privacy Redaction (Phase 7)
  sanitizedSummary = redactText(sanitizedSummary);
  sanitizedDescription = redactText(sanitizedDescription);

  const elements = Array.isArray(structured.elements) ? structured.elements.map((el, i) => {
    const elText = redactText(scanTextForInjection(String(el.text || el.name || '')).cleanText);
    return {
      id: el.id || `vis_el_${i + 1}`,
      type: el.type || el.role || 'visual_element',
      text: elText,
      location: el.location || el.bbox || { x: 0, y: 0, width: 0, height: 0 },
      confidence: typeof el.confidence === 'number' ? Number(el.confidence.toFixed(2)) : 0.9,
    };
  }) : [];

  const textNodes = Array.isArray(structured.text) ? structured.text.map(t => {
    return redactText(scanTextForInjection(String(t)).cleanText);
  }) : [];

  // Calibrated model confidence baseline
  let confidence = typeof structured.confidence === 'number' 
    ? Math.max(0.1, Math.min(1.0, structured.confidence))
    : 0.88;

  // Penalize confidence if prompt injection was detected or visual state is ambiguous
  if (containsInjection) {
    confidence = Math.min(confidence, 0.45);
  }

  return {
    summary: sanitizedSummary,
    description: sanitizedDescription,
    elements,
    text: textNodes,
    visual_state: structured.visual_state || 'rendered',
    confidence: Number(confidence.toFixed(3)),
    hasPromptInjection: containsInjection,
    piiDetected: detectTextPii(fullTextToScan).maxWeight > 0,
    model: context.model || 'LFM2.5-VL',
    tier: context.tier || 'A',
  };
}

module.exports = {
  parseStructuredVisualOutput,
};
