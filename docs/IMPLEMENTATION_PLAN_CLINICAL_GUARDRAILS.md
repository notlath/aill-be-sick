# Implementation Plan: Clinical Guardrail Layer & UX Redesign

## 1. Overview and Goals

This document outlines the end-to-end implementation plan for overhauling the diagnostic system's logic and user experience. Based on clinical panel feedback, the raw output of the NLP models (BioClinicalBERT / RoBERTa-Tagalog) cannot be used directly as a deterministic diagnosis due to:
1.  **Symptom Threshold Evasion:** Neural networks can output high confidence without meeting strict WHO/DOH minimum symptom criteria.
2.  **Shared Symptom Bias:** Non-specific symptoms (e.g., "Fever") result in biased, disproportionately high confidence for statistically common diseases (like Dengue) rather than an even distribution.
3.  **Contradictory Symptom Ignorance:** Models sometimes ignore strong negative signals (e.g., normal appetite in Dengue).

**Solution:** A **Neuro-Symbolic Hybrid Architecture**. We will retain the NLP models as probabilistic base layers, but introduce a **Clinical Guardrail Layer** (Rules Engine) that forces the NLP outputs to comply with DOH/WHO guidelines. This will trigger a dynamic, disease-specific **Collaborative Clinical Interview** UX to resolve ambiguities safely.

---

## 2. Architecture: The Clinical Guardrail Layer

### 2.1. Structured Clinical Ontology (Symptom Dictionary)

Before logic can be applied, we must transition from flat symptom lists to a **Structured Clinical Ontology**. This dictionary will live in the backend (e.g., `backend/app/evidence_keywords.py` or a new `clinical_matrix.py`) and act as the single source of truth for the Rules Engine.

**Key Components of the Ontology:**
*   **Sources:** DOH Philippines Clinical Practice Guidelines (CPGs), PSMID Guidelines, WHO Standard Case Definitions, and WHO IMCI (for pediatric thresholds).
*   **Standardization:** Tagalog lay-terms must map to a unified English clinical concept (e.g., "Lagnat" -> "fever").
*   **Demographics:** Include age-dependent thresholds (e.g., pediatric vs. adult respiratory rates).
*   **Structure per Disease:**
    *   `mandatory_criteria`: Must be present to consider the disease (e.g., fever for Dengue).
    *   `duration_constraints`: Min/max days typical for the disease.
    *   `major_symptoms`: Pathognomonic or highly indicative signs.
    *   `minor_symptoms`: Supporting signs.
    *   `red_flags`: Signs requiring immediate escalation.
    *   `contradictory_signals`: Signs that heavily rule out the disease.
    *   `who_threshold`: The mathematical logic to satisfy clinical criteria (e.g., `mandatory_criteria + 2 minor_or_major`).

### 2.2. Backend Updates (Python / Flask)

We will modify the backend diagnosis pipeline, specifically within `backend/app/api/diagnosis.py` and a new/updated `backend/app/services/clinical_guardrails.py` (which extends existing `evidence_keywords.py` and `scoring.py`).

**Step 1: Keyword Extraction & Pre-Processing**
*   Before running the NLP model inference, parse the input string against structured arrays of `Positive Signals` and `Negative/Contradictory Signals` mapped in `evidence_keywords.py`.

**Step 2: The Three-Pillar Rules Engine**
Implement a post-processing algorithm that intercepts the raw NLP logits/probabilities before returning them to the frontend:

1.  **The Overlap Flattener (Shared Symptoms):**
    *   *Logic:* If the extracted keywords only contain non-specific symptoms (e.g., `['fever', 'headache', 'fatigue']`) and lack distinguishing pathognomonic symptoms (e.g., `['rash', 'diarrhea']`), the engine will apply a mathematical smoothing function (Temperature Scaling) or flat-cap to the top 3-4 predictions.
    *   *Result:* Instead of `[Dengue 90%, Flu 5%, Typhoid 5%]`, it returns `[Dengue 35%, Flu 35%, Typhoid 30%]`.
2.  **The Contradiction Penalizer:**
    *   *Logic:* If a contradiction is detected for the top predicted disease (e.g., Dengue predicted, but `fever_duration > 10_days` or `appetite == 'good'`), apply a severe logit penalty (e.g., $-2.0$ to raw logits).
3.  **The WHO Minimum Criteria Checker:**
    *   *Logic:* Evaluate the extracted keywords against the WHO matrix. For Dengue, does the input contain `fever` + 2 minor symptoms?
    *   *Action:* If criteria are *not* met, cap the maximum confidence of that disease to `40%` and append a flag: `"status": "NEEDS_DIFFERENTIATION"`.

### 2.2. Database Updates (Supabase / Prisma)

Extend the schema to support the DOH-aligned questionnaire structure:

```prisma
// frontend/prisma/schema.prisma (Additions)

enum DiseaseCategory {
  DENGUE
  PNEUMONIA
  TYPHOID
  DIARRHEA
  MEASLES
  INFLUENZA
  RED_FLAG
  DIFFERENTIAL
}

enum ResponseType {
  BOOLEAN
  CATEGORICAL
  NUMERIC
}

model DiagnosticQuestion {
  id               String          @id @default(uuid())
  diseaseCategory  DiseaseCategory
  textEn           String
  textTl           String
  responseType     ResponseType
  isRedFlag        Boolean         @default(false)
  options          Json?           // For categorical options
  orderIndex       Int             // Determines flow sequence
}
```

---

## 3. Frontend Implementation: UX Redesign

The frontend must transition from a "one-shot calculator" to a "collaborative interview".

### 3.1. Phase 1: The "Front Door" (Symptom Intake)

Modify the initial `DiagnosisForm` component. The NLP free-text box remains, but we add structured determinism upfront to handle the most critical WHO criteria safely.

*   **UI Additions (Mandatory before submission):**
    1.  *Days of Illness Select:* `Today`, `1-2 days`, `3-6 days`, `7-10 days`, `10+ days`.
    2.  *Fever Toggle:* `Yes` / `No`.
*   **Rationale:** Capturing fever and duration deterministically anchors the backend Guardrail Layer instantly, preventing the model from guessing.

### 3.2. Phase 2: The Dynamic "Funnel" (Follow-up)

When the backend returns `"status": "NEEDS_DIFFERENTIATION"`, the UX intercepts the response and triggers the `DiagnosticInterview` component.

*   **Progressive Disclosure:** Use DaisyUI cards (`card`, `card-body`) to present questions one at a time, avoiding a massive checklist.
*   **Question Logic Mapping (DOH Aligned):**
    *   **Dengue:** Ask about rashes, joint/eye pain, nausea, and bleeding warnings.
    *   **Typhoid:** Ask about onset speed (sudden vs. slow) and abdominal/GI changes.
    *   **Flu:** Ask about abruptness of onset, severe muscle aches, and sore throat.
    *   **Measles:** Ask about the 3 Cs (cough, coryza, conjunctivitis) and rash progression.
    *   **Pneumonia:** Ask about breathing speed, chest pain on deep breath, and phlegm color.
    *   **Diarrhea:** Ask about stool frequency (>3/day), blood/mucus presence, and hydration capability.

### 3.3. Phase 3: The Results Display

Rewrite the presentation logic to prioritize clinical safety and address the panel's concerns regarding absolute certainty.

1.  **Remove Raw Percentages:** Hide the `85%` or `92%` numbers from the Patient view. (Retain them only for `CLINICIAN` roles in the dashboard).
2.  **Introduce Match Tiers:** Group predictions into qualitative categories using DaisyUI alerts/badges.
    *   *High Match (Green/Success):* All WHO criteria met. *"Your symptoms closely match standard clinical criteria for..."*
    *   *Moderate Match (Yellow/Warning):* Partial criteria met, or shared symptoms. *"Your symptoms share some common signs with..."*
    *   *Inconclusive (Gray/Neutral):* If the user skipped questions or gave conflicting data.
3.  **Explainability Box:** Add a collapsible section detailing *Why*:
    *   *Example:* "Matched signs: Fever, Body Aches. Missing typical signs: Rash, Nausea."
4.  **Triage Action:** The top of the screen must be the actionable step:
    *   *Emergent (`alert-error`):* Triggered immediately if a Red Flag question is answered "Yes".
    *   *Urgent (`alert-warning`):* See a doctor within 24 hours.
    *   *Routine (`alert-info`):* Monitor at home with specific warning signs listed.

---

## 4. Phased Execution Plan

| Phase | Task | Assignee/Agent Focus | Status |
| :--- | :--- | :--- | :--- |
| **0** | Use `tavily-research` to build the Structured Clinical Ontology for all 6 diseases (DOH/WHO guidelines). | Backend/Data | Pending |
| **1** | Update `schema.prisma` with Question entities and seed DOH logic. | Full-Stack | Pending |
| **2** | Modify `backend/app/api/diagnosis.py` to include the Guardrail Layer (Overlap Flattener & Contradiction Penalizer). | Backend | Pending |
| **3** | Update frontend `DiagnosisForm` to require `Days of Illness` and `Fever Presence`. | Frontend | Pending |
| **4** | Build the `DiagnosticInterview` React component for step-by-step questioning. | Frontend | Pending |
| **5** | Redesign the Results UI (Match Tiers, Explainability Box, Triage Alerts, hide percentages). | Frontend | Pending |
| **6** | Write `pytest` assertions simulating the panel's defense traps (e.g., fever only, contradictory symptoms). | Backend (Tests) | Pending |

## 5. Pre-Merge Validation Checklist

- [x] "Fever Only" test case results in roughly equal probabilities for Dengue, Typhoid, Flu.
- [x] Contradictory inputs (e.g., Dengue + "fever for 15 days") severely penalize the disease score.
- [x] Missing WHO criteria (e.g., Dengue without rash/nausea) caps confidence and triggers follow-up.
- [x] UI successfully hides raw percentages from Patient users.
- [x] `docs/SYSTEM_PAGE_NAVIGATION_FLOWCHART.md` updated with the new interview sequence.