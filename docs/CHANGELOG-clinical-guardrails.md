# Changelog: Clinical Guardrails & Diagnosis Redesign

All notable changes to the diagnosis logic and UX to comply with DOH/WHO guidelines will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Phase 0: Structured Clinical Ontology (Completed)
#### Added
- `backend/app/services/clinical_matrix.py`: Created a structured clinical ontology dictionary (`CLINICAL_MATRIX`).
- Defined `mandatory_criteria`, `duration_constraints`, `major_symptoms`, `minor_symptoms`, `red_flags`, and `contradictory_signals` for all 6 target diseases based on DOH, PSMID, and WHO IMCI guidelines.
- Created `SYMPTOM_MAP` to translate Tagalog and English lay-terms into unified clinical concepts (e.g., "lagnat" -> "fever", "itim na dumi" -> "melena").

### Phase 1: Database Schema Updates (Completed)
#### Added
- `DiagnosticQuestion` model to `frontend/prisma/schema.prisma` to support disease-specific follow-up questions.
- Enums for `DiseaseCategory` and `ResponseType` in Prisma schema.
- Added `diagnosticQuestion` to the `MODELS` array in `frontend/scripts/backup-db.js` to ensure it is included in database backups.

### Phase 2: Backend Guardrail Logic (Completed)
#### Added
- `backend/app/services/clinical_guardrails.py`: Implemented the three-pillar rules engine.
- Implemented `apply_clinical_guardrails()` which contains the "Overlap Flattener", "Contradiction Penalizer", and "WHO Criteria Checker".
#### Changed
- `backend/app/api/diagnosis.py`: Injected `apply_clinical_guardrails()` into the `new_case` endpoint immediately after `classifier(symptoms)` prediction. This intercepts and overrides raw NLP logits with clinical rule-based penalties before saving state to the database session.

### Phase 3: Frontend Intake Redesign (Completed)
#### Added
- Structured determinism upfront to handle critical WHO criteria.
- `daysOfIllness` and `feverPresence` inputs to `CreateChatSchema` in `frontend/schemas/CreateChatSchema.ts`.
#### Changed
- `DiagnosisForm` in `frontend/app/(app)/(patient)/diagnosis/page.tsx` to include "Days of Illness" (DaisyUI select) and "Fever Toggle" (DaisyUI segmented control).
- Concatenated structured inputs to the `symptoms` string before passing it to `createChat` and `runDiagnosis` to securely anchor backend guardrails against model bias.

### Phase 4: Dynamic Follow-Up Funnel (Completed)
#### Added
- `DiagnosticInterview` component in `frontend/components/patient/diagnosis-page/diagnostic-interview.tsx` that replaces standard chat questions with a focused, progressive disclosure "card" UI aligned with DaisyUI.
#### Changed
- `ChatContainer` to render `DiagnosticInterview` when a follow-up question is active, taking the user out of the standard chat flow and focusing them on the dynamic interview.
- Deleted legacy `QuestionBubble` component.

### Phase 5: Results Display Redesign (Completed)
#### Changed
- `run-diagnosis.ts`: Removed raw NLP percentage numbers (confidence and uncertainty) from the patient-facing diagnosis message text. Replaced them with qualitative wording (e.g. "closely match standard clinical criteria", "share some common signs").
- `chat-bubble.tsx`: Updated `getConfidenceTier` to use the new qualitative Match Tiers (High Match, Moderate Match, Inconclusive) based on `confidence` and `isValid` flags. Used DaisyUI badges (`badge-success`, `badge-warning`, `badge-neutral`).
- `chat-bubble.tsx`: Maintained the raw percentage details in a collapsible "Clinician details" block, strictly guarded by `shouldShowToggle` which only permits `CLINICIAN` and `DEVELOPER` roles to view them.
- `cdss-summary.tsx`: Ensured the actionable Triage Alert section is presented prominently at the top of the summary UI.

### Phase 6: Pre-Merge Validation & Testing (Completed)
#### Added
- `test_clinical_guardrails.py`: Wrote `pytest` assertions simulating the panel's defense traps.
  - "Fever Only": Verifies that non-specific symptoms result in roughly equal probabilities for Dengue, Typhoid, Flu and trigger `NEEDS_DIFFERENTIATION`.
  - Contradictory inputs: Verifies that contradictory inputs (e.g., Dengue + "good appetite") severely penalize the disease score and trigger `CONTRADICTION_PENALTY`.
  - Missing WHO criteria: Verifies that missing WHO criteria (e.g., Dengue without rash/nausea) caps confidence at 40% and triggers follow-up (`NEEDS_DIFFERENTIATION`).
  - Met Criteria: Ensures that patients correctly meeting the matrix trigger an `OK` status without penalties.
