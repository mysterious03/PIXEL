'use strict';

/**
 * Temporal Diff Engine (ODVPA - SIH 2026 PS 26171)
 *
 * Compares current ScreenGraph G_t against previous ScreenGraph G_(t-1).
 * Classifies nodes as: unchanged, moved, modified, new, or removed.
 * Applies a pixel tolerance (eps_pos) for rendering jitter and a stability window (dt_stable).
 */

const EPS_POS = 4; // 4px tolerance for sub-pixel jitter

/**
 * Computes L2 euclidean distance between two bounding box top-left positions
 */
function bboxPosDelta(bboxA, bboxB) {
  if (!bboxA || !bboxB) return Infinity;
  const dx = (bboxA[0] || 0) - (bboxB[0] || 0);
  const dy = (bboxA[1] || 0) - (bboxB[1] || 0);
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Diffs two Screen Graphs
 * @param {Object} prevGraph - Screen Graph at t-1
 * @param {Object} currGraph - Screen Graph at t
 * @param {Object} options - Options (epsPos, debounceMs)
 * @returns {Object} DiffResult { changedNodes, unchangedCount, dirtyRegions, isMeaningfulChange }
 */
function diffScreenGraphs(prevGraph, currGraph, options = {}) {
  const epsPos = options.epsPos || EPS_POS;

  if (!currGraph || !Array.isArray(currGraph.nodes)) {
    return { changedNodes: [], unchangedCount: 0, dirtyRegions: [], isMeaningfulChange: false };
  }

  if (!prevGraph || !Array.isArray(prevGraph.nodes) || prevGraph.nodes.length === 0) {
    // First frame: all nodes marked as new
    const changedNodes = currGraph.nodes.map(node => ({ ...node, state: 'new' }));
    return {
      changedNodes,
      unchangedCount: 0,
      dirtyRegions: changedNodes.map(n => n.bbox),
      isMeaningfulChange: changedNodes.length > 0,
    };
  }

  const prevNodeMap = new Map();
  for (const node of prevGraph.nodes) {
    const key = node.ref || node.id || `${node.role}_${node.text}`;
    prevNodeMap.set(key, node);
  }

  const changedNodes = [];
  const dirtyRegions = [];
  let unchangedCount = 0;

  for (const currNode of currGraph.nodes) {
    const key = currNode.ref || currNode.id || `${currNode.role}_${currNode.text}`;
    const prevNode = prevNodeMap.get(key);

    if (!prevNode) {
      // New node
      const updatedNode = { ...currNode, state: 'new' };
      changedNodes.push(updatedNode);
      dirtyRegions.push(currNode.bbox);
      prevNodeMap.delete(key);
    } else {
      prevNodeMap.delete(key); // Mark processed

      const posDelta = bboxPosDelta(currNode.bbox, prevNode.bbox);
      const textChanged = currNode.text !== prevNode.text;
      const roleChanged = currNode.role !== prevNode.role;

      if (posDelta > epsPos) {
        // Moved node
        const updatedNode = { ...currNode, state: 'moved' };
        changedNodes.push(updatedNode);
        dirtyRegions.push(currNode.bbox);
      } else if (textChanged || roleChanged) {
        // Content modified
        const updatedNode = { ...currNode, state: 'modified' };
        changedNodes.push(updatedNode);
        dirtyRegions.push(currNode.bbox);
      } else {
        // Unchanged
        unchangedCount++;
      }
    }
  }

  // Any remaining nodes in prevNodeMap were removed
  for (const [key, removedNode] of prevNodeMap.entries()) {
    changedNodes.push({ ...removedNode, state: 'removed' });
    dirtyRegions.push(removedNode.bbox);
  }

  const isMeaningfulChange = changedNodes.length > 0;

  return {
    changedNodes,
    unchangedCount,
    dirtyRegions,
    isMeaningfulChange,
  };
}

module.exports = {
  diffScreenGraphs,
  bboxPosDelta,
  EPS_POS,
};
