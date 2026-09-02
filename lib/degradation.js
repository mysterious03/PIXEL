'use strict';

/**
 * Graceful Degradation Ladder (ODVPA - SIH 2026 PS 26171 § 15.1)
 *
 * Implements a 5-tier capability ladder to guarantee resilient agent execution
 * regardless of local hardware or service availability:
 *
 * Tier 1: Full Local Vision + SLM (Local VLM & SLM both running via Ollama/local backend)
 * Tier 2: Structure-Only (Local SLM available, local VLM offline -> ScreenGraph/AXTree only)
 * Tier 3: OCR-Only (Local OCR available, VLMs offline -> DOM + bounding box OCR)
 * Tier 4: DOM-Only (Basic DOM / Accessibility Tree extraction only)
 * Tier 5: Full Cloud Fallback (Local models unavailable -> Cloud fallback with Privacy Gate)
 */

const http = require('http');

const CAPABILITY_TIERS = {
  1: { tier: 1, name: 'FULL_LOCAL_VISION_SLM', description: 'Full local Vision + SLM on-device' },
  2: { tier: 2, name: 'STRUCTURE_ONLY', description: 'Local SLM with Accessibility/ScreenGraph structure (no local VLM)' },
  3: { tier: 3, name: 'OCR_ONLY', description: 'Local OCR and DOM bounding boxes only' },
  4: { tier: 4, name: 'DOM_ONLY', description: 'Accessibility tree and DOM extraction only' },
  5: { tier: 5, name: 'FULL_CLOUD', description: 'Cloud fallback with strict 5-stage Privacy Gate' },
};

/**
 * Probes if an HTTP endpoint is reachable within a timeout
 * @param {string} url - Target URL e.g. http://localhost:11434/api/tags
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<boolean>}
 */
function probeEndpoint(url, timeoutMs = 1500) {
  return new Promise(resolve => {
    try {
      const u = new URL(url);
      const req = http.request(
        {
          hostname: u.hostname,
          port: u.port || 80,
          path: u.pathname,
          method: 'GET',
          timeout: timeoutMs,
        },
        res => {
          resolve(res.statusCode >= 200 && res.statusCode < 400);
        }
      );
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
      req.on('error', () => {
        resolve(false);
      });
      req.end();
    } catch {
      resolve(false);
    }
  });
}

/**
 * Resolves the operational capability tier at agent startup
 * @param {Object} options - Configuration and override options
 * @returns {Promise<Object>} Resolved capability tier descriptor
 */
async function resolveCapabilityTier(options = {}) {
  const host = options.ollamaHost || process.env.OLLAMA_HOST || 'http://localhost:11434';
  const forceTier = options.forceTier || process.env.ODVPA_CAPABILITY_TIER;

  if (forceTier && CAPABILITY_TIERS[Number(forceTier)]) {
    return CAPABILITY_TIERS[Number(forceTier)];
  }

  // Probe Ollama server reachability
  const isOllamaReachable = await probeEndpoint(`${host}/api/tags`, 1200);

  if (!isOllamaReachable) {
    // If local Ollama is offline, check if local OCR/DOM or Cloud is enabled
    if (options.hasCloudFallback !== false) {
      return {
        ...CAPABILITY_TIERS[5],
        reason: 'Local Ollama backend is offline; operating in Tier 5 (Cloud Fallback with Privacy Gate)',
        ollamaReachable: false,
      };
    }
    return {
      ...CAPABILITY_TIERS[4],
      reason: 'Local Ollama offline and cloud disabled; operating in Tier 4 (DOM-Only)',
      ollamaReachable: false,
    };
  }

  // Ollama is reachable; check if Vision/SLM models are available or default to Tier 1
  return {
    ...CAPABILITY_TIERS[1],
    reason: 'Local Ollama backend reachable; running full on-device Vision + SLM perception',
    ollamaReachable: true,
  };
}

module.exports = {
  CAPABILITY_TIERS,
  probeEndpoint,
  resolveCapabilityTier,
};
