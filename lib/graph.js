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

module.exports = {
  createNode,
  buildScreenGraph,
  ROLE_ENUM,
  SOURCE_ENUM,
  STATE_ENUM,
};
