'use strict';

// Validate Action[] against the registry and a Brief's lookup table.
//
// Returns { ok: Action[], errors: { action, error }[] } — never throws.
// The Loop is responsible for formatting errors back into the next turn's
// prompt so the LLM can correct.
//
// See DESIGN.md § Loop semantics § Failure handling.

const REF_RE = /^@[etrv]\d+$/;
const MAX_INTENT_WORDS = 14;
const { resolveDestinationUrl } = require('./resolver');

// The model occasionally emits a ref without its leading "@" (e.g. "e4" or
// "t2"), which is otherwise a well-formed ref. Coerce that one case to the
// canonical form so a missing "@" doesn't cost a wasted turn. Anything else is
// left untouched for REF_RE to reject.
function normalizeRef(ref) {
  if (typeof ref !== 'string') return ref;
  let clean = ref.trim().replace(/^[\[\(<]+|[\]\)>]+$/g, '').trim();
  if (/^[etrv]\d+$/.test(clean)) return '@' + clean;
  if (/^@[etrv]\d+$/.test(clean)) return clean;
  return clean;
}

function checkArgs(args, schema) {
  const provided = new Set(Object.keys(args || {}));
  for (const [key, type] of Object.entries(schema || {})) {
    const optional = type.endsWith('?');
    const baseType = optional ? type.slice(0, -1) : type;
    const value = args ? args[key] : undefined;
    if (value === undefined || value === null) {
      if (!optional) return `missing required arg "${key}" (${baseType})`;
      continue;
    }
    if (baseType === 'string' && typeof value !== 'string') return `arg "${key}" must be string, got ${typeof value}`;
    if (baseType === 'number' && typeof value !== 'number') return `arg "${key}" must be number, got ${typeof value}`;
    if (baseType === 'boolean' && typeof value !== 'boolean') return `arg "${key}" must be boolean, got ${typeof value}`;
    provided.delete(key);
  }
  // Extra args are tolerated — the LLM sometimes passes redundant fields.
  // The executor will ignore them. Strict mode could be added later.
  return null;
}

function wordCount(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length;
}

function validate(actions, lookup, registry, brief = null) {
  const ok = [];
  const errors = [];

  if (!Array.isArray(actions)) {
    return { ok, errors: [{ action: actions, error: 'actions must be an array' }] };
  }

  for (const action of actions) {
    if (!action || typeof action !== 'object' || Array.isArray(action)) {
      errors.push({ action, error: 'action must be an object' });
      continue;
    }
    const verb = action.verb;
    const spec = registry[verb];

    if (!spec) {
      errors.push({ action, error: `unknown verb "${verb}"` });
      continue;
    }

    if (!action.args || typeof action.args !== 'object') action.args = {};
    if (typeof action.args.intent === 'object' && action.args.intent !== null) {
      action.args.intent = action.args.intent.intent || action.args.intent.description || action.args.intent.text || JSON.stringify(action.args.intent);
    }

    // Real-world SLM/LLM parameter recovery heuristics (run BEFORE ref checking)
    if (verb === 'navigate') {
      if (!action.args.url) {
        if (action.ref && (/^https?:\/\//i.test(action.ref) || /\.(com|org|gov|in|edu|net)\b/i.test(action.ref))) {
          action.args.url = action.ref.startsWith('http') ? action.ref : 'https://' + action.ref;
          delete action.ref;
        } else if (action.args.intent) {
          const uMatch = action.args.intent.match(/https?:\/\/[^\s"'<>]+/i) || action.args.intent.match(/\b[a-zA-Z0-9-]+\.(?:com|org|gov|in|edu|net|io|ai)(?:\/[^\s"'<>]*)?/i);
          if (uMatch) {
            let u = uMatch[0];
            action.args.url = u.startsWith('http') ? u : 'https://' + u;
          }
        }
      }
    } else if (verb === 'click' || verb === 'type') {
      if (!action.ref && action.args.intent) {
        const refMatch = action.args.intent.match(/@?[etrv]\d+/i);
        if (refMatch) {
          action.ref = normalizeRef(refMatch[0]);
        } else {
          // Check if intent expresses navigating/visiting a web service not currently open
          const currentUrl = brief?.url || '';
          const destUrl = resolveDestinationUrl(String(action.args.intent), currentUrl);
          if (destUrl) {
            try {
              const destHost = new URL(destUrl).hostname;
              if (currentUrl && !currentUrl.includes(destHost)) {
                action.verb = 'navigate';
                action.args = { url: destUrl, intent: `Navigate to ${destUrl}` };
                delete action.ref;
              }
            } catch (_) {}
          }
        }
        if (action.verb !== 'navigate' && !action.ref && brief?.elements) {
          const lowerIntent = String(action.args.intent).toLowerCase();
          let el = brief.elements.find(e => e.name && e.name.length >= 3 && (lowerIntent.includes(e.name.toLowerCase()) || e.name.toLowerCase().includes(lowerIntent)));
          if (!el) {
            const stopWords = new Set(['click', 'focus', 'enter', 'type', 'into', 'button', 'field', 'input', 'link', 'and', 'the', 'for', 'with', 'on', 'number']);
            const intentWords = lowerIntent.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length >= 3 && !stopWords.has(w));
            el = brief.elements.find(e => {
              if (!e.name) return false;
              const lowerName = e.name.toLowerCase();
              return intentWords.some(w => lowerName.includes(w));
            });
          }
          if (el) action.ref = el.ref;
        }
      }
      if (action.verb === 'type') {
        if (!action.ref && brief?.elements) {
          const lowerIntent = String(action.args.intent || '').toLowerCase();
          const stopWords = new Set(['click', 'focus', 'enter', 'type', 'into', 'button', 'field', 'input', 'link', 'and', 'the', 'for', 'with', 'on']);
          const intentWords = lowerIntent.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length >= 3 && !stopWords.has(w));
          let el = brief.elements.find(e => {
            if (e.role !== 'textbox' && e.role !== 'searchbox' && e.role !== 'combobox') return false;
            if (!e.name) return false;
            return intentWords.some(w => e.name.toLowerCase().includes(w));
          });
          if (!el) {
            el = brief.elements.find(e => e.role === 'textbox' || e.role === 'searchbox' || e.role === 'combobox');
          }
          if (el) action.ref = el.ref;
        }
        if (!action.args.text) {
          if (action.args.query || action.args.input || action.args.value) {
            action.args.text = String(action.args.query || action.args.input || action.args.value);
          } else if (action.args.intent) {
            const qMatch = action.args.intent.match(/["']([^"']+)["']/);
            if (qMatch) {
              action.args.text = qMatch[1];
            } else {
              const tMatch = action.args.intent.match(/(?:search for|look up|type|enter|search|input)\s+(.+?)(?:\s+\b(?:in|into|on|using|with|via)\b|$)/i);
              if (tMatch) action.args.text = tMatch[1].trim();
              else action.args.text = String(action.args.intent).replace(/^(?:search for|look up|type|enter|search|input)\s+/i, '').trim();
            }
          }
        }
        if (action.args.submit === undefined) {
          const el = brief?.elements?.find(e => e.ref === action.ref);
          if (el?.role === 'searchbox' || /search/i.test(el?.name || '') || /search/i.test(action.args.intent || '')) {
            action.args.submit = true;
          }
        }
      }
    } else if (verb === 'wait') {
      if (typeof action.args?.ms === 'string') action.args.ms = Number(action.args.ms);
      if (action.args?.ms === undefined || isNaN(action.args?.ms)) {
        const match = String(action.args?.time || action.args?.duration || action.args?.intent || '').match(/\d+/);
        if (match) {
          if (!action.args) action.args = {};
          action.args.ms = Math.min(30000, Number(match[0]));
        } else {
          if (!action.args) action.args = {};
          action.args.ms = 2000;
        }
      }
    }

    // Refresh verb spec in case verb was transformed (e.g. click -> navigate)
    const activeVerb = action.verb;
    const activeSpec = registry[activeVerb] || spec;

    // requiresRef: the ref is mandatory. optionalRef: the verb accepts a ref but
    // works without one (take_screenshot crops to the ref when given, captures
    // the whole viewport when not). In both cases, a ref that IS present must be
    // well-formed, of an allowed type, and resolvable in the snapshot.
    const refPresent = action.ref != null && action.ref !== '';
    if (activeSpec.requiresRef || (activeSpec.optionalRef && refPresent)) {
      let ref = normalizeRef(action.ref);
      if (ref !== action.ref) action.ref = ref;  // canonicalize for executor + lookup
      if (!ref) {
        if (activeSpec.requiresRef) { errors.push({ action, error: `verb "${activeVerb}" requires a ref` }); continue; }
      } else {
        if (!REF_RE.test(ref) && brief?.elements) {
          const lowerRef = String(ref).toLowerCase();
          let el = brief.elements.find(e => e.name && (lowerRef === e.name.toLowerCase() || e.name.toLowerCase().includes(lowerRef) || lowerRef.includes(e.name.toLowerCase())));
          if (!el) {
            const stopWords = new Set(['and', 'or', 'the', 'for', 'with', 'on', 'button', 'input', 'field']);
            const refWords = lowerRef.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length >= 3 && !stopWords.has(w));
            el = brief.elements.find(e => e.name && refWords.some(w => e.name.toLowerCase().includes(w)));
          }
          if (el) {
            ref = el.ref;
            action.ref = el.ref;
          }
        }
        if (!REF_RE.test(ref)) { errors.push({ action, error: `ref "${ref}" does not match /^@[etrv]\\d+$/` }); continue; }
        const refType = ref[1];
        if (!activeSpec.refType.includes(refType)) {
          errors.push({ action, error: `verb "${activeVerb}" requires ref type ${activeSpec.refType.map(t => '@' + t).join(' or ')}, got "${ref}"` });
          continue;
        }
        if (!(ref in lookup)) { errors.push({ action, error: `ref "${ref}" not present in current snapshot's lookup` }); continue; }
      }
    }

    const needsIntent = verb !== 'done';
    if (needsIntent) {
      if (!action.args.intent || typeof action.args.intent !== 'string' || !action.args.intent.trim()) {
        action.args.intent = `${verb} ${action.ref || action.args.url || ''}`.trim() || 'execute action';
      } else if (wordCount(action.args.intent) > MAX_INTENT_WORDS) {
        action.args.intent = action.args.intent.trim().split(/\s+/).slice(0, MAX_INTENT_WORDS).join(' ');
      }
    }

    const argErr = checkArgs(action.args, needsIntent ? { intent: 'string', ...(spec.args || {}) } : (spec.args || {}));
    if (argErr) { errors.push({ action, error: argErr }); continue; }

    ok.push(action);
  }

  return { ok, errors };
}

module.exports = { validate, REF_RE, wordCount, MAX_INTENT_WORDS };
