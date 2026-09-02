'use strict';

/**
 * Groq Provider Adapter (Ultra-fast Cloud LLM & Vision Inference)
 */

const {
  postJSON, buildCompletion, buildVisionResult,
  openaiStyleTool, openaiStyleMessages, parseOpenAIStyleToolCalls,
} = require('./_shared');

const DEFAULT_MODEL = 'openai/gpt-oss-20b';
const DEFAULT_VISION_MODEL = 'openai/gpt-oss-20b';
const DEFAULT_BASE_URL = 'https://api.groq.com/openai/v1';

function getConfig() {
  const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY (or OPENAI_API_KEY) not set');
  return { apiKey, baseURL: process.env.GROQ_BASE_URL || DEFAULT_BASE_URL };
}

async function callModel(req) {
  const start = Date.now();
  const { apiKey, baseURL } = getConfig();
  const model = req.model || DEFAULT_MODEL;

  const body = {
    model,
    stream: false,
    messages: openaiStyleMessages(req.system, req.messages || [], { argsAsString: true }),
    temperature: 0.1,
    max_tokens: req.maxTokens || 4096,
  };

  if (Array.isArray(req.tools) && req.tools.length > 0) {
    body.tools = req.tools.map(openaiStyleTool);
    body.tool_choice = 'auto';
  }

  const data = await postJSON(`${baseURL}/chat/completions`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body,
    timeoutMs: req.timeoutMs || 30000,
    signal: req.signal,
    label: 'Groq Chat API',
  });

  const choice = data.choices?.[0] || {};
  const message = choice.message || {};

  return buildCompletion({
    provider: 'groq',
    model: data.model || model,
    raw: data,
    start,
    actions: parseOpenAIStyleToolCalls(message.tool_calls, { argsAsString: true }),
    text: message.content || null,
    refusal: message.refusal || null,
    usage: {
      inputTokens: data.usage?.prompt_tokens ?? null,
      outputTokens: data.usage?.completion_tokens ?? null,
    },
  });
}

async function describe(req) {
  const start = Date.now();
  const { apiKey, baseURL } = getConfig();
  const model = req.model || DEFAULT_VISION_MODEL;

  const data = await postJSON(`${baseURL}/chat/completions`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: {
      model,
      stream: false,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: req.prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:${req.mimeType || 'image/png'};base64,${req.imageBase64}`,
              },
            },
          ],
        },
      ],
      max_tokens: req.maxTokens || 1024,
      temperature: 0.1,
    },
    timeoutMs: req.timeoutMs || 30000,
    signal: req.signal,
    label: 'Groq Vision API',
  });

  const choice = data.choices?.[0] || {};
  return buildVisionResult({
    provider: 'groq',
    model: data.model || model,
    raw: data,
    start,
    text: (choice.message?.content || '').trim(),
    usage: {
      inputTokens: data.usage?.prompt_tokens ?? null,
      outputTokens: data.usage?.completion_tokens ?? null,
    },
  });
}

const capabilities = {
  reasoningEffort: false,
  vision: true,
  toolUse: 'native',
  cache: 'none',
};

/** @type {import('./types').Adapter} */
module.exports = {
  name: 'groq',
  defaultModel: DEFAULT_MODEL,
  defaultVisionModel: DEFAULT_VISION_MODEL,
  capabilities,
  callModel,
  describe,
};
