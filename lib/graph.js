'use strict';

/**
 * Screen Graph Builder & Schema (ODVPA - SIH 2026 PS 26171)
 *
 * Unifies Accessibility Tree (AXTree), DOM nodes, and Vision/OCR regions
 * into a single, typed, structured graph for downstream diffing, privacy filtering,
 * and confidence-routed perception.
 */

const ROLE_ENUM = [
  'button',
  'textbox',
  'checkbox',
  'link',
  'image',
  'password',
  'select',
  'heading',
  'canvas-region',
  'iframe-region',
  'unknown',
];

const SOURCE_ENUM = ['axtree', 'dom', 'vision', 'ocr'];
const STATE_ENUM = ['unchanged', 'moved', 'modified', 'new', 'removed'];

/**
 * Creates a normalized Screen Graph Node
 */
function createNode(opts = {}) {
  return {
    id: opts.id || `node_${Math.random().toString(36).substring(2, 9)}`,
    ref: opts.ref || null,
    bbox: Array.isArray(opts.bbox) && opts.bbox.length === 4 ? opts.bbox : [0, 0, 0, 0],
    role: ROLE_ENUM.includes(opts.role) ? opts.role : 'unknown',
    text: typeof opts.text === 'string' ? opts.text : '',
    source: SOURCE_ENUM.includes(opts.source) ? opts.source : 'dom',
    confidence: typeof opts.confidence === 'number' ? Math.max(0, Math.min(1, opts.confidence)) : 1.0,
    sensitive: Boolean(opts.sensitive),
    piiType: opts.piiType || null,
    parent: opts.parent || null,
    state: STATE_ENUM.includes(opts.state) ? opts.state : 'new',
    inViewport: opts.inViewport !== undefined ? Boolean(opts.inViewport) : true,
  };
}

/**
 * Builds a Screen Graph from a Browser-Agent Brief
 * @param {Object} brief - Extracted Brief object from extract.js
 * @returns {Object} ScreenGraph
 */
function buildScreenGraph(brief) {
  if (!brief) {
    return { kind: 'screen-graph', version: '1.0', nodes: [], timestamp: new Date().toISOString() };
  }

  const nodes = [];

  // 1. Process interactive elements (AXTree / DOM)
  if (Array.isArray(brief.elements)) {
    for (const el of brief.elements) {
      nodes.push(
        createNode({
          id: el.ref || `el_${el.backendNodeId || nodes.length}`,
          ref: el.ref,
          bbox: el.bbox,
          role: el.role === 'textbox' && el.isPassword ? 'password' : el.role || 'unknown',
          text: el.name || el.value || '',
          source: 'axtree',
          confidence: 1.0,
          sensitive: Boolean(el.isPassword),
          piiType: el.isPassword ? 'password' : null,
          inViewport: el.inViewport,
        })
      );
    }
  }

  // 2. Process text nodes
  if (Array.isArray(brief.text)) {
    for (const txt of brief.text) {
      nodes.push(
        createNode({
          id: txt.ref || `txt_${nodes.length}`,
          ref: txt.ref,
          bbox: txt.bbox,
          role: txt.role || 'heading',
          text: txt.name || '',
          source: 'dom',
          confidence: 1.0,
          inViewport: txt.inViewport,
        })
      );
    }
  }

  // 3. Process unreadable regions (Canvas, SVG, Cross-origin iframe)
  if (Array.isArray(brief.regions)) {
    for (const reg of brief.regions) {
      nodes.push(
        createNode({
          id: reg.ref || `reg_${nodes.length}`,
          ref: reg.ref,
          bbox: reg.bbox,
          role: reg.role === 'iframe' ? 'iframe-region' : 'canvas-region',
          text: `Unresolved ${reg.role || 'region'}`,
          source: 'vision',
          confidence: 0.5,
          inViewport: reg.inViewport,
        })
      );
    }
  }

  return {
    kind: 'screen-graph',
    version: '1.0',
    url: brief.url || '',
    title: brief.title || '',
    briefHash: brief.briefHash || '',
    timestamp: brief.timestamp || new Date().toISOString(),
    nodes,
  };
}

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'up', 'about', 'into', 'over', 'after',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'can', 'could', 'will', 'would', 'should', 'please',
]);

const NOISE_PATTERNS = [
  /\b(cookie|ad|advertisement|sponsor|banner|promo|social|facebook|twitter|instagram|footer|copyright)\b/i,
];

/**
 * Computes task-aware relevance score for a ScreenGraph node
 * @param {Object} node - ScreenGraph node or DOM/Brief element
 * @param {string} taskDescription - Current user task prompt
 * @returns {number} Relevance score in range [0, 1]
 */
function scoreNodeRelevance(node, taskDescription = '') {
  if (!node) return 0;
  if (!taskDescription || typeof taskDescription !== 'string' || !taskDescription.trim()) {
    return 1.0; // No task filter provided -> retain all nodes
  }

  const nodeText = `${node.text || ''} ${node.name || ''} ${node.role || ''} ${node.value || ''} ${node.url || ''}`.toLowerCase();
  
  // High penalty for obvious noise/ad elements unless explicitly asked in task
  const isNoise = NOISE_PATTERNS.some(pat => pat.test(nodeText));
  const taskMentionsNoise = NOISE_PATTERNS.some(pat => pat.test(taskDescription));
  if (isNoise && !taskMentionsNoise) {
    return 0.1;
  }

  // Tokenize task
  const taskTokens = taskDescription
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOPWORDS.has(t));

  if (taskTokens.length === 0) return 0.8;

  let matchCount = 0;
  for (const token of taskTokens) {
    if (nodeText.includes(token)) {
      matchCount++;
    }
  }

  // Keyword overlap ratio
  const overlapScore = matchCount / Math.max(1, taskTokens.length);

  // Bonus for interactive input elements and essential controls
  let roleBonus = 0.2;
  if (['button', 'textbox', 'password', 'select', 'checkbox'].includes(node.role)) {
    roleBonus = 0.35;
  }

  // Sensitive/critical nodes (passwords, auth forms) always get high retention
  if (node.sensitive || node.role === 'password') {
    return 0.95;
  }

  const score = Math.min(1.0, (overlapScore * 0.65) + roleBonus);
  return Number(score.toFixed(3));
}

/**
 * Minimises a ScreenGraph by pruning task-irrelevant nodes
 * @param {Object} screenGraph - ScreenGraph object
 * @param {string} taskDescription - Current task
 * @param {number} threshold - Relevance threshold (default 0.3)
 * @returns {Object} Minimised ScreenGraph with stats
 */
function minimiseScreenGraph(screenGraph, taskDescription, threshold = 0.3) {
  if (!screenGraph || !Array.isArray(screenGraph.nodes)) {
    return screenGraph;
  }

  const rawCount = screenGraph.nodes.length;
  const filteredNodes = screenGraph.nodes.filter(node => {
    const score = scoreNodeRelevance(node, taskDescription);
    node.relevanceScore = score;
    return score >= threshold;
  });

  return {
    ...screenGraph,
    nodes: filteredNodes,
    stats: {
      rawNodeCount: rawCount,
      minimisedNodeCount: filteredNodes.length,
      prunedNodeCount: rawCount - filteredNodes.length,
      reductionRatio: rawCount > 0 ? (rawCount - filteredNodes.length) / rawCount : 0.0,
    },
  };
}

module.exports = {
  createNode,
  buildScreenGraph,
  scoreNodeRelevance,
  minimiseScreenGraph,
  ROLE_ENUM,
  SOURCE_ENUM,
  STATE_ENUM,
};

