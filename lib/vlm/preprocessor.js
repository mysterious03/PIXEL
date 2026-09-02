'use strict';

/**
 * ODVPA Local VLM Image Preprocessor
 * 
 * Handles on-device image preprocessing, bounding box cropping, normalization,
 * aspect-ratio preservation, metadata extraction, and crop-ratio instrumentation.
 */

const sharp = require('sharp');

/**
 * Extracts image metadata and dimensions from a base64 or buffer input
 * @param {Buffer|string} input - Image buffer or base64 string
 * @returns {Promise<Object>} { width, height, format, channels, area, sizeBytes }
 */
async function getImageMetadata(input) {
  const buffer = typeof input === 'string' ? Buffer.from(input, 'base64') : input;
  if (!buffer || buffer.length === 0) {
    throw new Error('Invalid image input: buffer is empty');
  }

  const metadata = await sharp(buffer).metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;
  return {
    width,
    height,
    format: metadata.format || 'unknown',
    channels: metadata.channels || 3,
    area: width * height,
    sizeBytes: buffer.length,
    hasAlpha: metadata.hasAlpha || false,
  };
}

/**
 * Calculates crop metrics comparing crop box against viewport dimensions
 * @param {Object} cropBox - { x, y, width, height }
 * @param {Object} viewport - { width, height }
 * @returns {Object} Crop instrumentation metrics
 */
function calculateCropMetrics(cropBox, viewport = {}) {
  const vw = viewport.width || 1920;
  const vh = viewport.height || 1080;
  const viewportArea = vw * vh;

  const cw = Math.max(0, cropBox?.width || 0);
  const ch = Math.max(0, cropBox?.height || 0);
  const cropArea = cw * ch;

  const cropRatio = viewportArea > 0 ? Number((cropArea / viewportArea).toFixed(5)) : 1.0;
  const pixelSavingsPercent = Number(((1 - cropRatio) * 100).toFixed(2));

  return {
    viewportDimensions: { width: vw, height: vh, area: viewportArea },
    cropDimensions: { width: cw, height: ch, area: cropArea },
    cropRatio,
    pixelSavingsPercent,
  };
}

/**
 * Preprocesses an image crop for Local VLM inference (e.g. LFM2.5-VL-450M / 1.6B)
 * - Validates buffer
 * - Resizes with aspect ratio preservation (standard vision token grid)
 * - Normalizes color channels
 * - Formats to optimal tensor/JPEG/PNG buffer
 * 
 * @param {Buffer|string} input - Base64 string or image buffer
 * @param {Object} options - Preprocessing options
 * @returns {Promise<Object>} Preprocessed result with tensor metadata and timing
 */
async function preprocessForVLM(input, options = {}) {
  const startTime = Date.now();
  const buffer = typeof input === 'string' ? Buffer.from(input, 'base64') : input;
  
  if (!buffer || buffer.length === 0) {
    throw new Error('Image preprocessing failed: input buffer is empty or invalid');
  }

  const targetWidth = options.targetWidth || 448; // Standard vision patch resolution
  const targetHeight = options.targetHeight || 448;
  const format = options.format || 'jpeg';

  let pipeline = sharp(buffer);
  const meta = await pipeline.metadata();

  if (!meta.width || !meta.height) {
    throw new Error('Image preprocessing failed: unable to decode image dimensions');
  }

  // Optional sub-region crop if requested
  if (options.crop && options.crop.width > 0 && options.crop.height > 0) {
    const left = Math.max(0, Math.min(meta.width - 1, Math.round(options.crop.x || 0)));
    const top = Math.max(0, Math.min(meta.height - 1, Math.round(options.crop.y || 0)));
    const width = Math.min(meta.width - left, Math.round(options.crop.width));
    const height = Math.min(meta.height - top, Math.round(options.crop.height));

    if (width > 0 && height > 0) {
      pipeline = pipeline.extract({ left, top, width, height });
    }
  }

  // Resize with fit 'inside' to preserve aspect ratio without distortion
  pipeline = pipeline.resize(targetWidth, targetHeight, {
    fit: 'inside',
    withoutEnlargement: true,
  });

  let processedBuffer;
  if (format === 'png') {
    processedBuffer = await pipeline.png({ compressionLevel: 6 }).toBuffer();
  } else {
    processedBuffer = await pipeline.jpeg({ quality: options.quality || 90 }).toBuffer();
  }

  const processedMeta = await sharp(processedBuffer).metadata();
  const preprocessLatencyMs = Date.now() - startTime;

  return {
    buffer: processedBuffer,
    base64: processedBuffer.toString('base64'),
    mimeType: format === 'png' ? 'image/png' : 'image/jpeg',
    originalDimensions: { width: meta.width, height: meta.height },
    processedDimensions: { width: processedMeta.width, height: processedMeta.height },
    preprocessLatencyMs,
  };
}

module.exports = {
  getImageMetadata,
  calculateCropMetrics,
  preprocessForVLM,
};
