'use strict';

// The `screenshot` verb. Backend-agnostic: it captures via the CDP client that
// every Session holds (so it works the same whether the os or cdp executor is
// driving input), then hands the image to the configured vision model. The
// returned summary/description ride back as the Observation's `detail`: the loop
// keeps the short summary in prompt history and saves the full description with
// the image artifact.
//
// Captures the whole viewport by default. When the action carries a ref, it
// crops to that element's DOM rectangle — the geometry comes straight from the
// snapshot, so the crop is exact and needs no model-supplied coordinates.

const vision = require('./vision');
const { loadConfig } = require('./config');

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// Pick the capture encoding from config, keyed on whether this is a cropped
// read. `cropped` shots are usually OCR (small text / CAPTCHA), so they get the
// higher quality; full-viewport describes take the cheaper one. Returns the
// captureScreenshot params plus the matching mime/ext for vision + disk.
function imageEncoding(cropped) {
  const cfg = loadConfig().screenshot || {};
  if (cfg.format === 'png') return { params: { format: 'png' }, mimeType: 'image/png', ext: 'png' };
  const raw = cropped
    ? (Number.isFinite(cfg.croppedQuality) ? cfg.croppedQuality : 92)
    : (Number.isFinite(cfg.quality) ? cfg.quality : 55);
  return { params: { format: 'jpeg', quality: clamp(Math.round(raw), 1, 100) }, mimeType: 'image/jpeg', ext: 'jpg' };
}

// Normalize a brief bbox (array [x,y,w,h] in tree mode, object in flat mode).
function toBox(bbox) {
  if (!bbox) return null;
  return Array.isArray(bbox)
    ? { x: bbox[0], y: bbox[1], width: bbox[2], height: bbox[3] }
    : bbox;
}

// Resolve a ref to a captureScreenshot clip, using the brief the ref was taken
// against. bbox is in page coordinates / CSS px (the same space the clip wants),
// so it maps directly; scale:1 means "no extra zoom". Returns null — i.e. fall
// back to a full-viewport capture — when the ref is absent, unknown, or boxless,
// so a stale or odd ref degrades gracefully instead of failing the action.
function clipForRef(brief, ref) {
  if (!ref || !brief) return null;
  const node = [...(brief.elements || []), ...(brief.text || []), ...(brief.regions || [])]
    .find(n => n.ref === ref);
  const b = toBox(node?.bbox);
  if (!b || b.width <= 0 || b.height <= 0) return null;
  return { x: b.x, y: b.y, width: b.width, height: b.height, scale: 1 };
}

async function captureImage({ session, ref, brief } = {}) {
  if (!session?.client) throw new Error('screenshot requires a CDP session');

  // captureScreenshot is a one-shot command (no Page.enable needed) and reads
  // composited pixels — including cross-origin iframe content like CAPTCHAs.
  // captureBeyondViewport lets a clip reach content scrolled off-screen, so a
  // cropped read works without scrolling the element into view first.
  const clip = clipForRef(brief, ref);
  const enc = imageEncoding(!!clip);
  const params = { ...enc.params };
  if (clip) { params.clip = clip; params.captureBeyondViewport = true; }

  const { data } = await session.client.Page.captureScreenshot(params);
  if (!data) throw new Error('screenshot: Chrome returned no image data');
  return {
    image: data,
    mimeType: enc.mimeType,
    ext: enc.ext,
    cropped: !!clip,
    ref: ref || null,
  };
}

async function screenshot({ session, hint, ref, brief, signal } = {}) {
  const captured = await captureImage({ session, ref, brief });

  const clip = clipForRef(brief, ref);
  const vp = brief?.viewport || { width: 1920, height: 1080 };
  const fullScreenPixels = (vp.width || 1920) * (vp.height || 1080);
  const cropPixels = clip ? Math.round(clip.width * clip.height) : fullScreenPixels;
  const pixelSavingsPercent = Number(((1 - (cropPixels / fullScreenPixels)) * 100).toFixed(2));
  const cropMetrics = {
    full_screen_pixels: fullScreenPixels,
    crop_pixels: cropPixels,
    pixel_reduction_percentage: Math.max(0, pixelSavingsPercent),
    crop_dimensions: clip ? { width: Math.round(clip.width), height: Math.round(clip.height) } : { width: vp.width, height: vp.height },
    viewport_dimensions: { width: vp.width, height: vp.height },
  };

  const described = vision.normalizeVisionResult(
    await vision.describe({ imageBase64: captured.image, mimeType: captured.mimeType, hint, signal }),
  );

  // Always save latest VLM inspection photo to runs/latest-vlm-crop.<ext> for instant user viewing
  try {
    const fs = require('fs');
    const path = require('path');
    const runsDir = path.join(__dirname, '..', 'runs');
    fs.mkdirSync(runsDir, { recursive: true });
    const latestFile = path.join(runsDir, `latest-vlm-crop.${captured.ext || 'jpg'}`);
    fs.writeFileSync(latestFile, Buffer.from(captured.image, 'base64'));
  } catch {}

  // Push visual preview directly into Chrome Dynamic Island HUD if running in active session
  if (session?.client?.Runtime) {
    try {
      const { generateShowVlmPhotoScript } = require('./live-hud');
      await session.client.Runtime.evaluate({
        expression: generateShowVlmPhotoScript({
          imageBase64: captured.image,
          mimeType: captured.mimeType,
          model: 'On-Device VLM',
          savingsPercent: pixelSavingsPercent,
          cropDimensions: `${cropMetrics.crop_dimensions.width}×${cropMetrics.crop_dimensions.height}px`,
          description: described.summary || described.description || 'Vision element analyzed',
          badge: captured.cropped ? 'CROP' : 'FULL VIEWPORT',
        }),
      }).catch(() => {});
    } catch {}
  }

  // `image` is the raw base64 bytes. The loop persists it to the run dir (using
  // `ext`) and then strips it, so the payload never lands in the JSONL log or
  // re-enters the model's context.
  return {
    summary: described.summary || '(vision model returned no summary)',
    description: described.description || '(vision model returned no description)',
    hint: hint || null,
    ref: captured.ref,
    cropped: captured.cropped,
    cropMetrics,
    image: captured.image,
    mimeType: captured.mimeType,
    ext: captured.ext,
  };
}

module.exports = { screenshot, captureImage, clipForRef };
