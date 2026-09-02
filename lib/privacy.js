'use strict';

/**
 * 5-Stage Privacy Layer, Structural-Leak Filter & Hard Validator Gate
 * (ODVPA - SIH 2026 PS 26171 for ISRO / Department of Space)
 */

// PII Regex Patterns & Severity Weights
const PII_PATTERNS = [
  {
    type: 'email',
    weight: 0.8,
    regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  },
  {
    type: 'phone',
    weight: 0.7,
    regex: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
  },
  {
    type: 'credit_card',
    weight: 1.0,
    regex: /\b(?:\d[ -]*?){13,16}\b/g,
  },
  {
    type: 'aadhaar_govt_id',
    weight: 1.0,
    regex: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b|\b[A-Z]{5}\d{4}[A-Z]{1}\b/g, // Aadhaar & PAN ID formats
  },
  {
    type: 'ssn',
    weight: 1.0,
    regex: /\b\d{3}-\d{2}-\d{4}\b/g,
  },
  {
    type: 'secret_key',
    weight: 1.0,
    regex: /\b(?:sk_live|api_key|secret_key|private_key|token)[a-zA-Z0-9_\-=]{16,}\b/gi,
  },
];

// Structural Leak Patterns (Internal admin schema names)
const STRUCTURAL_LEAK_PATTERNS = [
  /internal_admin/i,
  /classified_department/i,
  /isro_internal/i,
  /space_payload_config/i,
  /salary_grade/i,
  /auth_token_vault/i,
];

const DEFAULT_TAU_PRIVACY = 0.6;

/**
 * Stage 1: DOM Attribute check
 */
function checkDomAttributes(node) {
  if (!node) return { isSensitive: false, piiType: null, confidence: 0 };

  if (node.role === 'password' || node.type === 'password' || node.isPassword) {
    return { isSensitive: true, piiType: 'password', confidence: 1.0, weight: 1.0 };
  }
  if (node.type === 'email' || node.autocomplete === 'email') {
    return { isSensitive: true, piiType: 'email', confidence: 0.9, weight: 0.8 };
  }
  if (node.type === 'tel' || node.autocomplete === 'tel') {
    return { isSensitive: true, piiType: 'phone', confidence: 0.9, weight: 0.7 };
  }
  return { isSensitive: false, piiType: null, confidence: 0 };
}

/**
 * Stage 2: Pattern / Regex + Lightweight Text Matching
 */
function detectTextPii(text) {
  if (typeof text !== 'string' || !text.trim()) {
    return { matches: [], maxWeight: 0, piiTypes: [] };
  }

  const matches = [];
  const piiTypes = new Set();
  let maxWeight = 0;

  for (const pattern of PII_PATTERNS) {
    pattern.regex.lastIndex = 0; // reset regex state
    const found = text.match(pattern.regex);
    if (found && found.length > 0) {
      matches.push({ type: pattern.type, count: found.length, weight: pattern.weight });
      piiTypes.add(pattern.type);
      if (pattern.weight > maxWeight) {
        maxWeight = pattern.weight;
      }
    }
  }

  return {
    matches,
    maxWeight,
    piiTypes: Array.from(piiTypes),
  };
}

/**
 * Stage 5: Structural-Leak Filter
 */
function checkStructuralLeak(nodes) {
  if (!Array.isArray(nodes)) return { leaked: false, pattern: null };

  for (const node of nodes) {
    const textToCheck = `${node.id || ''} ${node.role || ''} ${node.text || ''}`;
    for (const leakPattern of STRUCTURAL_LEAK_PATTERNS) {
      if (leakPattern.test(textToCheck)) {
        return { leaked: true, pattern: leakPattern.source, nodeId: node.id };
      }
    }
  }

  return { leaked: false, pattern: null };
}

/**
 * Redacts PII in text strings using replacement tokens
 */
function redactText(text) {
  if (typeof text !== 'string') return text;
  let redacted = text;
  for (const pattern of PII_PATTERNS) {
    pattern.regex.lastIndex = 0;
    redacted = redacted.replace(pattern.regex, `[REDACTED_${pattern.type.toUpperCase()}]`);
  }
  return redacted;
}

/**
 * Evaluates Privacy Risk Score over a set of nodes
 * Risk(N) = max_{n in N} ( w(n) * P_PII(n) )
 */
function calculatePrivacyRisk(nodes) {
  if (!Array.isArray(nodes) || nodes.length === 0) return 0.0;

  let maxRisk = 0.0;

  for (const node of nodes) {
    // Stage 1: DOM
    const domRes = checkDomAttributes(node);
    if (domRes.isSensitive) {
      const risk = domRes.weight * domRes.confidence;
      if (risk > maxRisk) maxRisk = risk;
    }

    // Stage 2: Text regex / PII
    if (node.text) {
      const textRes = detectTextPii(node.text);
      if (textRes.maxWeight > 0) {
        const risk = textRes.maxWeight * 0.95; // High confidence for regex matches
        if (risk > maxRisk) maxRisk = risk;
      }
    }
  }

  return maxRisk;
}

/**
 * Hard Privacy Validator Gate
 * Blocks outbound payload if Risk(N) > tau_privacy or structural leak is detected.
 */
function verifyPayloadSafety(payload, tauPrivacy = DEFAULT_TAU_PRIVACY) {
  const nodes = payload?.nodes || (Array.isArray(payload) ? payload : []);

  // 1. Structural leak check
  const leakRes = checkStructuralLeak(nodes);
  if (leakRes.leaked) {
    return {
      safe: false,
      blocked: true,
      reason: `Blocked by Hard Privacy Gate: Structural schema leak detected (${leakRes.pattern})`,
      riskScore: 1.0,
    };
  }

  // 2. Risk score check
  const riskScore = calculatePrivacyRisk(nodes);
  if (riskScore > tauPrivacy) {
    return {
      safe: false,
      blocked: true,
      reason: `Blocked by Hard Privacy Gate: Privacy Risk Score ${riskScore.toFixed(2)} exceeds threshold ${tauPrivacy}`,
      riskScore,
    };
  }

  return {
    safe: true,
    blocked: false,
    reason: 'Verified safe for remote cloud payload transmission',
    riskScore,
  };
}

module.exports = {
  checkDomAttributes,
  detectTextPii,
  checkStructuralLeak,
  redactText,
  calculatePrivacyRisk,
  verifyPayloadSafety,
  DEFAULT_TAU_PRIVACY,
  PII_PATTERNS,
};
