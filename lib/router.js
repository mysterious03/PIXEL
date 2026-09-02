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
 * Computes reasoning confidence for SLM action proposals
 * Evaluates semantic clarity, target node agreement, and self-consistency
 * @param {Object} action - Proposed action from local SLM
 * @param {Object} targetNode - Target node in ScreenGraph/Brief
 * @param {number} consistencyScore - Self-consistency agreement score [0, 1]
 * @returns {number} Calibrated confidence score [0, 1]
 */
function computeReasoningConfidence(action, targetNode, consistencyScore = 1.0) {
  if (!action) return 0.2;
  
  // Terminal actions or simple navigation with clear target
  let baseScore = 0.85;
  if (targetNode) {
    if (targetNode.role === 'button' || targetNode.role === 'link' || targetNode.role === 'textbox') {
      baseScore = 0.92;
    }
  } else if (action.verb === 'done' || action.verb === 'scroll') {
    baseScore = 0.88;
  } else if (!action.ref && !action.url && action.verb !== 'wait') {
    // Action missing required target -> ambiguous
    baseScore = 0.45;
  }

  const agreement = targetNode ? computeSourceAgreement(action, targetNode) : 0.6;
  const rawConfidence = (baseScore * 0.5) + (agreement * 0.25) + (consistencyScore * 0.25);
  return Math.max(0.0, Math.min(1.0, rawConfidence));
}

/**
 * Tracks escalation rates across a session for both vision and reasoning roles
 */
class EscalationTracker {
  constructor() {
    this.totalFrames = 0;
    this.tierAFrames = 0;
    this.tierBFrames = 0;
    this.cloudFrames = 0;

    // Separate tracking by role: vision vs reasoning
    this.roles = {
      vision: { total: 0, local: 0, localConfirm: 0, cloud: 0 },
      reasoning: { total: 0, local: 0, localConfirm: 0, cloud: 0 },
    };
  }

  recordFrame(routeTier, role = 'vision', details = {}) {
    this.totalFrames++;
    if (routeTier === 'LOCAL_TIER_A' || routeTier === 'LOCAL') {
      this.tierAFrames++;
    } else if (routeTier === 'LOCAL_TIER_B') {
      this.tierBFrames++;
    } else if (routeTier === 'CLOUD') {
      this.cloudFrames++;
    }

    const r = this.roles[role] || (this.roles[role] = { total: 0, local: 0, localConfirm: 0, cloud: 0 });
    r.total++;
    if (routeTier === 'LOCAL' || routeTier === 'LOCAL_TIER_A' || routeTier === 'LOCAL_TIER_B') {
      r.local++;
    } else if (routeTier === 'LOCAL_CONFIRM') {
      r.localConfirm++;
    } else if (routeTier === 'CLOUD') {
      r.cloud++;
    }
  }

  getMetrics() {
    const F = Math.max(1, this.totalFrames);
    const vTotal = Math.max(1, this.roles.vision.total);
    const rTotal = Math.max(1, this.roles.reasoning.total);

    return {
      totalFrames: this.totalFrames,
      visionInvocationRate: (this.tierAFrames + this.tierBFrames + this.cloudFrames) / F,
      tierAEscalationRate: this.tierAFrames / F,
      tierBEscalationRate: this.tierBFrames / F,
      cloudEscalationRate: this.cloudFrames / F,
      roles: {
        vision: {
          total: this.roles.vision.total,
          localRate: this.roles.vision.local / vTotal,
          cloudEscalationRate: this.roles.vision.cloud / vTotal,
        },
        reasoning: {
          total: this.roles.reasoning.total,
          localRate: this.roles.reasoning.local / rTotal,
          cloudEscalationRate: this.roles.reasoning.cloud / rTotal,
        },
      },
    };
  }
}

module.exports = {
  temperatureScale,
  computeSourceAgreement,
  computeRoutingConfidence,
  computeReasoningConfidence,
  routeDecision,
  EscalationTracker,
  DEFAULT_ALPHA,
  DEFAULT_TAU_HIGH,
  DEFAULT_TAU_LOW,
};

