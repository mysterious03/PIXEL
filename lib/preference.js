'use strict';

/**
 * On-Device Personalization & Distillation Preference Logger (ODVPA § 4.1)
 *
 * Collects successful cloud/Tier-B escalated decisions as local preference distillation
 * training pairs: { input: <redacted local context>, correctedOutput: <cloud action> }.
 *
 * Enforces strict local privacy: all records are redacted through lib/privacy.js before
 * writing to the on-device training log. Never contains raw PII.
 */

const fs = require('fs');
const path = require('path');
const { redactText, verifyPayloadSafety } = require('./privacy');

const DEFAULT_LOG_DIR = path.join(__dirname, '../logs');
const DEFAULT_LOG_FILE = path.join(DEFAULT_LOG_DIR, 'training-log.jsonl');

/**
 * Formats and records a successful escalation as a distillation pair
 * @param {Object} entry - { inputContext, cloudAction, url, role }
 * @param {string} logFilePath - Optional destination path
 * @returns {Object} Appended record
 */
function recordEscalationSuccess(entry = {}, logFilePath = DEFAULT_LOG_FILE) {
  const dir = path.dirname(logFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // 1. Redact input and action payloads to guarantee zero PII leakage
  let rawInput = typeof entry.inputContext === 'object' ? JSON.stringify(entry.inputContext) : String(entry.inputContext || '');
  let rawOutput = typeof entry.cloudAction === 'object' ? JSON.stringify(entry.cloudAction) : String(entry.cloudAction || '');

  const sanitizedInput = redactText(rawInput);
  const sanitizedOutput = redactText(rawOutput);

  // 2. Validate payload safety gate
  const safetyCheck = verifyPayloadSafety({ text: `${sanitizedInput} ${sanitizedOutput}` });
  if (safetyCheck.blocked) {
    console.warn(`[ODVPA Preference Log] Blocked distillation entry due to safety violation: ${safetyCheck.reason}`);
    return null;
  }

  const record = {
    timestamp: new Date().toISOString(),
    role: entry.role || 'reasoning',
    url: entry.url ? redactText(entry.url) : '',
    input: sanitizedInput,
    correctedOutput: sanitizedOutput,
  };

  const line = JSON.stringify(record) + '\n';
  fs.appendFileSync(logFilePath, line, 'utf8');

  return record;
}

/**
 * Reads all distillation training pairs from the JSONL log
 * @param {string} logFilePath
 * @returns {Array<Object>}
 */
function readTrainingLog(logFilePath = DEFAULT_LOG_FILE) {
  if (!fs.existsSync(logFilePath)) return [];
  const content = fs.readFileSync(logFilePath, 'utf8');
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

/**
 * Clears or resets the local training log
 * @param {string} logFilePath
 */
function clearTrainingLog(logFilePath = DEFAULT_LOG_FILE) {
  if (fs.existsSync(logFilePath)) {
    fs.unlinkSync(logFilePath);
  }
}

module.exports = {
  recordEscalationSuccess,
  readTrainingLog,
  clearTrainingLog,
  DEFAULT_LOG_FILE,
};
