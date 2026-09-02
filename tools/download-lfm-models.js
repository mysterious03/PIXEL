#!/usr/bin/env node
'use strict';

/**
 * ODVPA LFM2.5-VL Model Management & Verification Tool
 * 
 * Verifies and configures local on-device weights for:
 * - Tier A: LFM2.5-VL-450M (Liquid Foundation Models 450M ONNX/GGUF)
 * - Tier B: LFM2.5-VL-1.6B (Liquid Foundation Models 1.6B ONNX/GGUF)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MODELS_DIR = path.resolve(__dirname, '../models');

const MODEL_REGISTRY = {
  'LFM2.5-VL-450M': {
    tier: 'A',
    filename: 'lfm-2.5-vl-450m-q4_k_m.gguf',
    onnxDir: 'lfm-2.5-vl-450m-onnx',
    sizeBytes: 312 * 1024 * 1024, // ~312 MB
    parameters: '450M',
    family: 'Liquid-LFM2.5',
    huggingfaceRepo: 'liquid-ai/LFM2.5-VL-450M',
    description: 'Tier A Ultra-lightweight On-Device Vision-Language Model',
  },
  'LFM2.5-VL-1.6B': {
    tier: 'B',
    filename: 'lfm-2.5-vl-1.6b-q4_k_m.gguf',
    onnxDir: 'lfm-2.5-vl-1.6b-onnx',
    sizeBytes: 1050 * 1024 * 1024, // ~1.05 GB
    parameters: '1.6B',
    family: 'Liquid-LFM2.5',
    huggingfaceRepo: 'liquid-ai/LFM2.5-VL-1.6B',
    description: 'Tier B High-Fidelity On-Device Vision-Language Model',
  },
};

function checkModelStatus() {
  console.log('\n===============================================================');
  console.log('       ODVPA LFM2.5-VL Local Model Artifact Verification      ');
  console.log('===============================================================\n');

  if (!fs.existsSync(MODELS_DIR)) {
    fs.mkdirSync(MODELS_DIR, { recursive: true });
  }

  const results = {};

  for (const [name, spec] of Object.entries(MODEL_REGISTRY)) {
    const ggufPath = path.join(MODELS_DIR, spec.filename);
    const onnxPath = path.join(MODELS_DIR, spec.onnxDir);

    const hasGguf = fs.existsSync(ggufPath);
    const hasOnnx = fs.existsSync(onnxPath);

    results[name] = {
      spec,
      isInstalled: hasGguf || hasOnnx,
      ggufPath: hasGguf ? ggufPath : null,
      onnxPath: hasOnnx ? onnxPath : null,
    };

    console.log(`Model: ${name} [Tier ${spec.tier} - ${spec.parameters}]`);
    console.log(`  Description : ${spec.description}`);
    console.log(`  Target Repo : ${spec.huggingfaceRepo}`);
    if (hasGguf) {
      console.log(`  Status      : INSTALLED (GGUF: ${ggufPath})`);
    } else if (hasOnnx) {
      console.log(`  Status      : INSTALLED (ONNX: ${onnxPath})`);
    } else {
      console.log(`  Status      : NOT FOUND IN ${MODELS_DIR}`);
      console.log(`  To Download : Use command below or pull via Ollama / Hugging Face`);
    }
    console.log('---------------------------------------------------------------');
  }

  console.log('\nCommands to install / link models locally:\n');
  console.log('  1. Via Ollama (Local GGUF Runtime):');
  console.log('     ollama run moondream  # (or custom liquid LFM model)');
  console.log('     ollama run qwen2.5-coder:1.5b');
  console.log('\n  2. Via Hugging Face Hub (ONNX / WebGPU):');
  console.log('     huggingface-cli download liquid-ai/LFM2.5-VL-450M --local-dir models/lfm-2.5-vl-450m-onnx');
  console.log('     huggingface-cli download liquid-ai/LFM2.5-VL-1.6B --local-dir models/lfm-2.5-vl-1.6b-onnx\n');

  return results;
}

if (require.main === module) {
  checkModelStatus();
}

module.exports = {
  checkModelStatus,
  MODEL_REGISTRY,
  MODELS_DIR,
};
