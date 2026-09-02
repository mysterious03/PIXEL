'use strict';

/**
 * Confidence Router & Temperature Scaling Calibration (ODVPA - SIH 2026 PS 26171)
 *
 * Implements post-hoc temperature scaling calibration and two-threshold policy routing
 * between Tier A local VLM (~450M), Tier B local VLM (~1.6B), and Cloud VLM fallback.
 */

const DEFAULT_ALPHA = 0.6; // Weight for model probability vs inter-source agreement
const DEFAULT_TAU_HIGH = 0.85; // Threshold for direct local execution
const DEFAULT_TAU_LOW = 0.55; // Threshold for cloud fallback

/**
 * Calibrates logits using Temperature Scaling
 * p_cal = softmax( z / T )
 * @param {Array<number>} logits - Raw pre-softmax model logits
 * @param {number} temperature - Scalar temperature T (T > 0)
 * @returns {Array<number>} Calibrated probabilities
 */
function temperatureScale(logits, temperature = 1.2) {
  if (!Array.isArray(logits) || logits.length === 0) return [1.0];
  const T = Math.max(0.1, temperature);

  const scaled = logits.map(z => z / T);
  const maxVal = Math.max(...scaled);
  const exps = scaled.map(v => Math.exp(v - maxVal));
  const sumExp = exps.reduce((a, b) => a + b, 0);

  return exps.map(v => v / sumExp);
}

/**
 * Computes inter-source agreement signal A(a, t)
 * @param {Object} action - Proposed action
 * @param {Object} node - ScreenGraph target node
 * @returns {number} Agreement score [0, 1]
 */
function computeSourceAgreement(action, node) {
  if (!node) return 0.5;
  // If node was confirmed by both AXTree and DOM
  if (node.source === 'axtree' && node.ref && node.text) return 1.0;
  if (node.source === 'dom') return 0.8;
  if (node.source === 'ocr') return 0.7;
  if (node.source === 'vision') return 0.6;
  return 0.5;
}

/**
 * Computes Routing Confidence Score C(a, t)
 * C(a, t) = alpha * p_cal(a, t) + (1 - alpha) * A(a, t)
 */
function computeRoutingConfidence(rawProb, sourceAgreement, alpha = DEFAULT_ALPHA) {
  const pCal = Math.max(0, Math.min(1, rawProb));
  const agreement = Math.max(0, Math.min(1, sourceAgreement));
  return alpha * pCal + (1 - alpha) * agreement;
}

/**
 * Route Decision Policy using Two-Threshold Policy
 * @param {number} confidence - Calibrated routing confidence score C(a, t)
 * @param {Object} options - Threshold options
 * @returns {Object} { route: 'LOCAL' | 'LOCAL_CONFIRM' | 'CLOUD', confidence }
 */
function routeDecision(confidence, options = {}) {
  const tauHigh = options.tauHigh || DEFAULT_TAU_HIGH;
  const tauLow = options.tauLow || DEFAULT_TAU_LOW;

  if (confidence >= tauHigh) {
    return { route: 'LOCAL', confidence, description: 'Direct local execution' };
  } else if (confidence < tauLow) {
    return { route: 'CLOUD', confidence, description: 'Escalate to cloud VLM with redacted minimal payload' };
  } else {
    return {
      route: 'LOCAL_CONFIRM',
      confidence,
      description: 'Local execution requiring one-tap user confirmation',
    };
  }
}

/**
 * Tracks escalation rates across a session
 */
class EscalationTracker {
  constructor() {
    this.totalFrames = 0;
    this.tierAFrames = 0;
    this.tierBFrames = 0;
    this.cloudFrames = 0;
  }

  recordFrame(routeTier) {
    this.totalFrames++;
    if (routeTier === 'LOCAL_TIER_A' || routeTier === 'LOCAL') {
      this.tierAFrames++;
    } else if (routeTier === 'LOCAL_TIER_B') {
      this.tierBFrames++;
    } else if (routeTier === 'CLOUD') {
      this.cloudFrames++;
    }
  }

  getMetrics() {
    const F = Math.max(1, this.totalFrames);
    return {
      totalFrames: this.totalFrames,
      visionInvocationRate: (this.tierAFrames + this.tierBFrames + this.cloudFrames) / F,
      tierAEscalationRate: this.tierAFrames / F,
      tierBEscalationRate: this.tierBFrames / F,
      cloudEscalationRate: this.cloudFrames / F,
    };
  }
}

module.exports = {
  temperatureScale,
  computeSourceAgreement,
  computeRoutingConfidence,
  routeDecision,
  EscalationTracker,
  DEFAULT_ALPHA,
  DEFAULT_TAU_HIGH,
  DEFAULT_TAU_LOW,
};
