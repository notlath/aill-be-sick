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
