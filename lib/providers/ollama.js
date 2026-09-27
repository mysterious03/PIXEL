'use strict';

// Ollama provider. Local /api/chat + tool calling over native fetch. No API
// key — just a reachable local server and a tool-capable model (llama3.1,
// qwen2.5, mistral-nemo, …) pulled via `ollama pull <model>`.
//
// Shares request/response shaping with openai.js via _shared.js. Ollama's two
// quirks vs OpenAI: tool-call args are objects (not JSON strings), and tool
// calls carry no id (we synthesize one for the loop's history).
//
// Prompt caching: Ollama reuses the KV cache for a byte-identical prompt prefix
// while the model stays loaded — automatic, like OpenAI's, but local and with
// no API key or usage field for it (there's no prompt_cache_key equivalent, so
// the loop's cacheKey is ignored here). The engine already puts static content
// (tools, then system) first and the dynamic turn message last, which is the
// exact byte-stable prefix Ollama needs. The catch is lifetime: Ollama unloads
// the model — and dumps its KV cache — after `keep_alive` of inactivity
// (default 5m). Per-turn requests refresh that timer, so a run stays warm; set
// OLLAMA_KEEP_ALIVE (e.g. '30m' or '-1' for forever) to also keep the cache
// across back-to-back runs.
//
// See DESIGN.md § Providers.

const {
  postJSON, buildCompletion, buildVisionResult,
  openaiStyleTool, openaiStyleMessages, parseOpenAIStyleToolCalls,
} = require('./_shared');

const DEFAULT_MODEL = 'llama3.1';
const DEFAULT_VISION_MODEL = 'llama3.2-vision';
const DEFAULT_HOST = 'http://localhost:11434';

// Cache reachability for 30s so we don't hammer the health endpoint every turn,
// but also re-check periodically in case Ollama starts up mid-run.
let _reachableCache = null;   // { value: bool, at: timestamp }
const REACHABLE_TTL_MS = 30000;

function getBaseURL() {
  // OLLAMA_HOST is the variable the ollama CLI itself uses.
  return (process.env.OLLAMA_HOST || process.env.OLLAMA_BASE_URL || DEFAULT_HOST).replace(/\/$/, '');
}

/**
 * Fast Ollama health check. Resolves true if the local server is reachable.
 * Uses Node's built-in http module (not fetch) so it respects a short 2s timeout.
 */
async function isReachable() {
  const now = Date.now();
  if (_reachableCache && (now - _reachableCache.at) < REACHABLE_TTL_MS) {
    return _reachableCache.value;
  }
  const baseURL = getBaseURL();
  const value = await new Promise(resolve => {
    try {
      const http = require(baseURL.startsWith('https') ? 'https' : 'http');
      const url = new URL('/api/tags', baseURL);
      const req = http.get({ hostname: url.hostname, port: url.port || (url.protocol === 'https:' ? 443 : 80), path: url.pathname, timeout: 2000 }, res => {
        resolve(res.statusCode >= 200 && res.statusCode < 300);
        res.resume();
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => { req.destroy(); resolve(false); });
    } catch {
      resolve(false);
    }
  });
  _reachableCache = { value, at: now };
  return value;
}

/**
 * Clears the reachability cache, forcing a fresh check next call.
 * Call this after a failed request so the next turn retries.
 */
function invalidateReachabilityCache() {
  _reachableCache = null;
}

function parseActionsFromText(content) {
  if (!content || typeof content !== 'string') return [];
  const text = content.trim();
  const actions = [];
  
  // Try extracting from markdown code block or raw JSON
  const jsonBlocks = [];
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch) {
    jsonBlocks.push(codeBlockMatch[1].trim());
  }
  
  const rawJsonMatch = text.match(/\{[\s\S]*\}/);
  if (rawJsonMatch) {
    jsonBlocks.push(rawJsonMatch[0].trim());
  }

  for (const block of jsonBlocks) {
    try {
      const parsed = JSON.parse(block);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item || typeof item !== 'object') continue;
        const verb = item.verb || item.action || item.name;
        if (!verb || typeof verb !== 'string') continue;
        
        let args = item.args || item.arguments || item.parameters || {};
        if (typeof args === 'string') {
          try { args = JSON.parse(args); } catch {}
        }
        if (typeof args !== 'object' || args === null) args = {};

        // Merge any top-level properties not already in args
        for (const [k, v] of Object.entries(item)) {
          if (!['verb', 'action', 'name', 'args', 'arguments', 'parameters', 'ref'].includes(k)) {
            if (!(k in args)) args[k] = v;
          }
        }

        const action = { kind: 'action', verb: verb.toLowerCase(), args };
        const ref = item.ref || args.ref;
        if (ref !== undefined) action.ref = ref;
        delete args.ref;
        action.toolUseId = `ollama_text_${Date.now()}_${i}`;
        actions.push(action);
      }
      if (actions.length > 0) return actions;
    } catch {}
  }

  // Pattern 2: Model outputting a ref line directly, e.g. "[@e3] link 'Instagram'" or "Click @e3"
  const refMatch = text.match(/(?:click|select|press|open|follow)?\s*\[?(@[etrv]\d+)\]?/i);
  if (refMatch) {
    const ref = refMatch[1];
    return [{
      kind: 'action',
      verb: 'click',
      ref,
      args: { intent: `Click ${ref}` },
      toolUseId: `ollama_text_ref_${Date.now()}`,
    }];
  }

  // Pattern 2a: Model outputting a click on a quoted element name, e.g. 'Click on the "See more" button'
  const quotedClickMatch = text.match(/(?:click|select|press|tap|open|follow|choose)\s+(?:on\s+)?(?:the\s+)?["'“]([^"'“”\n]{2,60})["'”]/i);
  if (quotedClickMatch) {
    const targetName = quotedClickMatch[1].trim();
    return [{
      kind: 'action',
      verb: 'click',
      args: { intent: `Click on "${targetName}"` },
      toolUseId: `ollama_text_quoted_click_${Date.now()}`,
    }];
  }

  // Pattern 2b: Step-by-step or numbered click, e.g. '1. Click on the "See more, Sustainability Features" button...'
  const stepClickMatch = text.match(/(?:^\s*\d+[\.\)]\s*|\b(?:first|next|then)\s*,?\s*)(?:click|press|tap|select|open|follow)\s+(?:on\s+)?(?:the\s+)?["'“]?([^"'“”\n,]+?)["'”]?(?:\s+button|\s+link|\s+tab|\s+to|\.|$)/im);
  if (stepClickMatch) {
    const targetName = stepClickMatch[1].trim();
    if (targetName.length >= 2 && !['a', 'the', 'this', 'that', 'it', 'here'].includes(targetName.toLowerCase())) {
      return [{
        kind: 'action',
        verb: 'click',
        args: { intent: `Click on "${targetName}"` },
        toolUseId: `ollama_text_step_click_${Date.now()}`,
      }];
    }
  }

  // Pattern 2c: Named button/link without quotes, e.g. 'click the Search button'
  const namedButtonMatch = text.match(/(?:click|select|press|tap|open|follow)\s+(?:on\s+)?(?:the\s+)?([a-zA-Z0-9\s_-]{2,30})\s+(?:button|link|tab|option)\b/i);
  if (namedButtonMatch) {
    const targetName = namedButtonMatch[1].trim();
    if (!['a', 'the', 'this', 'that', 'it', 'any', 'next', 'following', 'more'].includes(targetName.toLowerCase())) {
      return [{
        kind: 'action',
        verb: 'click',
        args: { intent: `Click on ${targetName}` },
        toolUseId: `ollama_text_named_click_${Date.now()}`,
      }];
    }
  }

  // Pattern 3: Model outputting scroll direction, e.g. "scroll down", "scrolling down", "scroll further down"
  const scrollMatch = text.match(/\b(?:scroll(?:ing)?(?:\s+further|\s+downward|\s+upward)?|page)\s+(up|down|left|right)\b/i);
  if (scrollMatch) {
    return [{
      kind: 'action',
      verb: 'scroll',
      args: { direction: scrollMatch[1].toLowerCase(), intent: `Scroll ${scrollMatch[1].toLowerCase()}` },
      toolUseId: `ollama_text_scroll_${Date.now()}`,
    }];
  }

  // Pattern 4: Model outputting type command, e.g. 'type "hello" into [@e1]'
  const typeMatch = text.match(/(?:type|enter|write|input)\s+["'“]([^"'“”]+)["'”]\s*(?:into|in|on)?\s*(?:the\s+)?(?:search\s+)?(?:box|bar|field|input)?(?:\s*\[?(@[etrv]\d+)\]?)?/i);
  if (typeMatch) {
    return [{
      kind: 'action',
      verb: 'type',
      ref: typeMatch[2] || undefined,
      args: { text: typeMatch[1], submit: true, intent: `Type "${typeMatch[1]}"` },
      toolUseId: `ollama_text_type_${Date.now()}`,
    }];
  }

  // Pattern 5: Model outputting navigate command, e.g. 'navigate to https://...'
  const navMatch = text.match(/navigate(?:\s+to)?\s+(https?:\/\/[^\s"'<>]+)/i);
  if (navMatch) {
    return [{
      kind: 'action',
      verb: 'navigate',
      args: { url: navMatch[1], intent: `Navigate to ${navMatch[1]}` },
      toolUseId: `ollama_text_nav_${Date.now()}`,
    }];
  }

  // Pattern 6: Model concluding task — only fire when there's actual result content,
  // not generic conversational phrases. qwen/llama models frequently say "task completed"
  // or "I have completed the task" as a prefix before explaining what they're about to do.
  // Require the text to be SHORT (< 250 chars) AND match a strong completion signal,
  // OR contain actual extracted result data (numbers, URLs, lists of facts).
  const strongDonePattern = /\b(?:task(?:\s+has\s+been|\s+is)\s+(?:complete|completed|done|finished)|I(?:'ve|\s+have)\s+successfully\s+(?:completed|finished|accomplished)|the\s+task\s+is\s+now\s+complete)\b/i;
  const hasResultData = /(?:\d{4}|https?:\/\/|(?:^|\n)[-•]\s|result:|found:|answer:)/i.test(text);
  if (strongDonePattern.test(text) && (text.length < 200 || hasResultData)) {
    return [{
      kind: 'action',
      verb: 'done',
      args: { result: text.slice(0, 300) },
      toolUseId: `ollama_text_done_${Date.now()}`,
    }];
  }

  // Pattern 7: Model stating a search intent in prose, e.g. 'searched for "buy a dumbel 5kg"' or 'search for shoes'
  const proseSearch = text.match(/(?:search for|searched for|looking for|find|buy)\s+["'“]?([^"'“”\n\.\,]+)["'”]?/i);
  if (proseSearch) {
    const q = proseSearch[1].trim();
    if (q.length > 1 && !['a', 'the', 'it', 'more', 'items', 'this', 'that'].includes(q.toLowerCase())) {
      return [{
        kind: 'action',
        verb: 'type',
        args: { text: q, submit: true, intent: `Search for ${q}` },
        toolUseId: `ollama_text_search_${Date.now()}`,
      }];
    }
  }

  return actions;
}

async function callModel(req) {
  const start = Date.now();
  const model = req.model || DEFAULT_MODEL;
  const baseURL = getBaseURL();

  // Fast-fail if Ollama isn't running — avoids hanging 10-30s per turn.
  // On failure we invalidate cache so the next turn retries the health check.
  const reachable = await isReachable();
  if (!reachable) {
    invalidateReachabilityCache();
    const err = new Error(
      `Ollama server not reachable at ${baseURL}. ` +
      `Please start Ollama: run "ollama serve" in a terminal, ` +
      `then pull a model with "ollama pull llama3.1" and retry.`
    );
    err.type = 'network';
    err.retriable = false;
    err.provider = 'ollama';
    throw err;
  }

  const body = {
    model,
    stream: false,
    messages: openaiStyleMessages(req.system, req.messages || [], { argsAsString: false }),
    tools: (req.tools || []).map(openaiStyleTool),
    // num_predict caps output tokens (Ollama's name for max_tokens). Unset →
    // the model's own default, matching the prior behavior.
    options: { temperature: 0, ...(req.maxTokens ? { num_predict: req.maxTokens } : {}) },
  };

  // Keep the model and its KV-cache loaded for the duration of a run.
  // Default to 30 minutes so back-to-back tasks don't need to reload.
  // Override with OLLAMA_KEEP_ALIVE env var (e.g. '-1' for forever).
  const keepAlive = process.env.OLLAMA_KEEP_ALIVE || '30m';
  body.keep_alive = keepAlive;

  let data;
  try {
    data = await postJSON(`${baseURL}/api/chat`, {
      body,
      timeoutMs: req.timeoutMs,
      signal: req.signal,
      label: 'Ollama API',
    });
  } catch (err) {
    // If the request fails (model not found, connection reset, etc.),
    // invalidate the reachability cache so the next turn re-checks.
    if (err.type === 'network' || err.type === 'server' || err.code === 'ECONNRESET') {
      invalidateReachabilityCache();
    }
    throw err;
  }

  const message = data.message || {};
  let parsedActions = parseOpenAIStyleToolCalls(message.tool_calls, {
    argsAsString: false,
    synthId: (i) => `ollama_${Date.now()}_${i}`,
  });

  // If tool_calls was empty, try parsing action from model's content text
  if (parsedActions.length === 0 && message.content) {
    const textActions = parseActionsFromText(message.content);
    if (textActions.length > 0) {
      parsedActions = textActions;
    }
  }

  return buildCompletion({
    provider: 'ollama',
    model,
    raw: data,
    start,
    actions: parsedActions,
    // Ollama puts the model's prose in message.content; it has no separate
    // refusal field, so `refusal` stays null (a refusal just shows up as text).
    text: message.content || null,
    refusal: null,
    usage: {
      inputTokens: data.prompt_eval_count ?? null,
      outputTokens: data.eval_count ?? null,
    },
  });
}

// Single-shot image description. Ollama's native /api/chat takes raw base64 in
// an `images` array on the message (not OpenAI-style content parts). No tools,
// no history — see lib/vision.js for the orchestration around it.
async function describe(req) {
  const start = Date.now();
  const model = req.model || DEFAULT_VISION_MODEL;
  const baseURL = getBaseURL();

  const data = await postJSON(`${baseURL}/api/chat`, {
    body: {
      model,
      stream: false,
      messages: [{ role: 'user', content: req.prompt, images: [req.imageBase64] }],
      options: { temperature: 0, ...(req.maxTokens ? { num_predict: req.maxTokens } : {}) },
    },
    signal: req.signal,
    label: 'Vision (Ollama)',
  });

  return buildVisionResult({
    provider: 'ollama',
    model,
    raw: data,
    start,
    text: (data.message?.content || '').trim(),
    usage: { inputTokens: data.prompt_eval_count ?? null, outputTokens: data.eval_count ?? null },
  });
}

const capabilities = {
  reasoningEffort: false,   // ignored today; surfaced so dispatch won't silently drop it
  vision: true,
  toolUse: 'native',        // tool-capable models only; emulation is a separate concern
  cache: 'automatic',       // local KV-cache reuse while the model stays loaded
};

/** @type {import('./types').Adapter} */
module.exports = {
  name: 'ollama',
  defaultModel: DEFAULT_MODEL,
  defaultVisionModel: DEFAULT_VISION_MODEL,
  capabilities,
  callModel,
  describe,
  parseActionsFromText,
  isReachable,
  invalidateReachabilityCache,
};
