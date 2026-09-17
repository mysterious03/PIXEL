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

function getBaseURL() {
  // OLLAMA_HOST is the variable the ollama CLI itself uses.
  return (process.env.OLLAMA_HOST || process.env.OLLAMA_BASE_URL || DEFAULT_HOST).replace(/\/$/, '');
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

  // Pattern 6: Model concluding task
  if (/\b(?:task is complete|task completed|task is done|finished the task|have completed the task|found all the information|all information is found|here are the results|here is the information)\b/i.test(text)) {
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

  const body = {
    model,
    stream: false,
    messages: openaiStyleMessages(req.system, req.messages || [], { argsAsString: false }),
    tools: (req.tools || []).map(openaiStyleTool),
    // num_predict caps output tokens (Ollama's name for max_tokens). Unset →
    // the model's own default, matching the prior behavior.
    options: { temperature: 0, ...(req.maxTokens ? { num_predict: req.maxTokens } : {}) },
  };

  // Optional: keep the model (and its KV-cache prefix) loaded longer than the
  // 5m default. Passed through verbatim — Ollama accepts a duration ('30m'),
  // seconds, or a negative value for "stay loaded". Unset → server default.
  const keepAlive = process.env.OLLAMA_KEEP_ALIVE;
  if (keepAlive) body.keep_alive = keepAlive;

  const data = await postJSON(`${baseURL}/api/chat`, {
    body,
    timeoutMs: req.timeoutMs,
    signal: req.signal,
    label: 'Ollama API',
  });

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
};
