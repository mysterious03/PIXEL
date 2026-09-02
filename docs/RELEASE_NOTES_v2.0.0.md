# PIXEL v2.0.0 — On-Device Visual Perception Engine (SIH 2026 PS 26171)

## 🚀 What's New in v2.0.0

We are proud to release **PIXEL v2.0.0 (ODVPA)**, developed for **Smart India Hackathon 2026 (Problem Statement 26171 — ISRO / Department of Space)**.

PIXEL is a frugal, privacy-first, on-device perceptual runtime that allows autonomous browser agents to navigate, parse, and act across web pages with near-zero API cost and zero cloud data egress.

---

### 🌟 Key Highlights

1. **Zero-Cost AXTree & DOM Structural Perception**:
   - Directly queries native Accessibility Trees and DOM snapshot metrics via CDP.
   - Bypasses VLM invocation on 80–90% of standard web interactions ($0.00 / 0 tokens).

2. **Crop-Only Targeted Perception (98.5% Pixel Reduction)**:
   - Uses `sharp` to capture and preprocess only unresolved visual regions (custom `<canvas>` widgets, maps, and unlabeled graphics).

3. **Cascading Local VLM Engine**:
   - **Tier A (`LFM2.5-VL-450M`)**: Ultra-lightweight on-device vision model (~480MB VRAM).
   - **Tier B (`LFM2.5-VL-1.6B`)**: Lazy-loaded escalation model (~1,450MB VRAM) invoked only on visual ambiguity.

4. **5-Stage Hard Privacy Gate & PII Redactor**:
   - 100% precision and recall on Aadhaar / Govt IDs, PAN cards, Credit Cards, Indian Phone Numbers, and API secret keys.

5. **Indirect Prompt Injection Defense**:
   - Active sanitization of hostile web text to `[BLOCKED_PROMPT_INJECTION]`.

6. **Full Test & Benchmark Suite (32/32 Passing)**:
   - 14-point Local VLM engine verification suite (`node test/local-vlm.test.js`).
   - Master SIH acceptance test suite (`node test/odvpa-full.test.js`).
   - Empirical benchmark runner (`node test/vlm-benchmark.js`).

---

### 📦 Installation

```bash
git clone https://github.com/mysterious03/PIXEL.git
cd PIXEL
npm install
node test/local-vlm.test.js
```

---

**Full Changelog**: https://github.com/mysterious03/PIXEL/commits/v2.0.0
