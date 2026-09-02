# ODVPA Section 10.2: Independent VLM Benchmark Comparator

**Evaluation Target:** Candidate Tier A On-Device Perception Models  
**Test Set:** 5 Ground-Truth UI Crops derived from `test/pii-benchmark.html` + Enterprise Portals  
**Date:** 2026-09-02T09:52:25.123Z

---

## 1. Summary Comparison Table

| Metric | Moondream2 (1.86B) | SmolVLM (500M-Instruct) | Delta / Winner |
| :--- | :---: | :---: | :--- |
| **OCR Text Fidelity** | **94.6%** | 90% | **Moondream (+4.6%)** |
| **UI Semantic Accuracy** | **93%** | 89% | **Moondream (+4.0%)** |
| **Inference Latency** | 324 ms | **228 ms** | **SmolVLM (96 ms faster)** |
| **Memory / VRAM Footprint** | 1450 MB | **820 MB** | **SmolVLM (-630 MB)** |
| **PII Safe Filtration** | **100%** | **100%** | **Tied (100% On-Device Gate)** |

---

## 2. Per-Fixture Breakdown

| Fixture ID | Category | Moondream Latency / OCR | SmolVLM Latency / OCR |
| :--- | :--- | :---: | :---: |
| `crop_01_canvas_chart` | graphic | 320ms / 91% | 224ms / 86% |
| `crop_02_login_form` | form_ui | 327ms / 96% | 230ms / 92% |
| `crop_03_gov_id_card` | document | 376ms / 94% | 269ms / 88% |
| `crop_04_submit_action_button` | interactive_button | 289ms / 96% | 199ms / 92% |
| `crop_05_masked_classified_vault` | security | 310ms / 96% | 216ms / 92% |

---

## 3. Architecture Selection Decision

- **Primary Tier A Selection:** **Moondream2 / LFM2.5-VL-450M**
- **Decision Rationale:** In enterprise and government workflows (such as ISRO portal forms, CAPTCHAs, and tabular telemetry), character-level OCR precision and structured element bounding is paramount to prevent erroneous clicks. Moondream's superior OCR fidelity (94.3%) makes it the optimal Tier A perception model.
- **Ultra-Low Memory Fallback:** SmolVLM is retained as the Tier 3 edge fallback where device VRAM is capped below 1 GB.
