# Changelog — `feat/privacy-compliance`

All notable changes in this branch relative to `main`.

**Branch:** `feat/privacy-compliance`  
**Date:** 2026-04-05  
**Version target:** TBD (next minor or major release)

---

## Added

### Privacy Compliance

- **User Data Export** — Patients and clinicians can export their personal data.
  - New server action: `frontend/actions/data-export.ts`.
  - New Zod schema: `frontend/schemas/DataExportSchema.ts`.
  - New export utility: `frontend/utils/report-export.ts`.
  - New privacy rights page: `frontend/app/privacy-rights/page.tsx`.
  - New content component: `frontend/components/privacy-rights/privacy-rights-content.tsx`.
- **Consent Withdrawal** — Users can withdraw consent for data processing.
  - New server action: `frontend/actions/withdraw-consent.ts`.
  - New flowchart documentation: `docs/CONSENT_WITHDRAWAL_FLOW.md`.
  - New legality compliance doc: `docs/LEGALITY_COMPLIANCE.md`.
- **Account Deletion** — Full account deletion with anonymization support.
  - New server action: `frontend/actions/delete-account.ts`.
  - New Zod schema: `frontend/schemas/DeleteAccountSchema.ts`.
  - New utility: `frontend/utils/is-anonymized.ts`.
  - Updated session handling to check anonymization status.
- **Scheduled Patient Deletion** — Clinicians can schedule patient account deletion with a grace period.
  - New server actions: `frontend/actions/schedule-patient-deletion.ts`, `frontend/actions/patient-choose-deletion-outcome.ts`, `frontend/actions/restore-patient-deletion.ts`.
  - New schemas: `frontend/schemas/ScheduleDeletionSchema.ts`, `frontend/schemas/PatientDeletionOutcomeSchema.ts`, `frontend/schemas/RestoreDeletionSchema.ts`.
  - New component: `frontend/components/layout/scheduled-deletion-modal.tsx`.
  - New clinician UI: `frontend/components/clinicians/users-page/pending-deletions-tab.tsx`.
  - New utilities: `frontend/utils/deletion-schedule.ts`, `frontend/utils/deletion-impact.ts`, `frontend/utils/check-deletion-schedule.ts`.
  - Deletion schedule processor: `frontend/scripts/process-deletion-schedules.ts`.
  - New `DeletionSchedule` model and `DeletionScheduleStatus` enum in Prisma schema.
  - New flowchart: `docs/SURVEILLANCE_PDF_EXPORT_FLOWCHART.md`.
- **Audit Logging** — New `AuditLog` model in Prisma schema for tracking user actions.

### Diagnosis Enhancements

- **Inconclusive Diagnosis Support** — New diagnosis status for cases where the model cannot determine a confident prediction.
  - New `INCONCLUSIVE` status in `DiagnosisStatus` enum.
  - New healthcare reports UI: `inconclusive-content.tsx`, `inconclusive-data-table.tsx`, `inconclusive-columns.tsx`, `inconclusive-detail-modal.tsx`.
  - Updated auto-record diagnosis action to handle inconclusive cases.
  - Updated chat history view to display inconclusive diagnoses.
- **Rejected Diagnosis Revert** — Clinicians can revert rejected diagnoses back to pending.
  - New server action: `frontend/actions/revert-diagnosis.ts`.
  - New rejected diagnoses UI: `rejected-content.tsx`, `rejected-data-table.tsx`, `rejected-columns.tsx`.
  - Updated `Diagnosis` model with `originalStatus` field for tracking status transitions.
- **Diagnosis Verification Types** — Enhanced verification flow with Supabase JWT verification.
  - Updated `frontend/actions/verify-diagnosis.ts` with JWT checks.
  - New flowchart: `docs/DIAGNOSIS-VERIFICATION-FLOWCHART.md`.

### Surveillance & Alerts

- **PDF Export** — Professional epidemiological report export for surveillance data.
  - Updated `frontend/utils/pdf-export.ts`.
  - New export button component updates.
- **Alert Pipeline** — Centralized alert pipeline logic with verification-triggered alerts.
  - New utility: `frontend/utils/alert-pipeline.ts`.
  - Updated `frontend/scripts/sync-anomalies-to-alerts.ts`.
  - Removed `LOW_CONFIDENCE` and `HIGH_UNCERTAINTY` alert types from schema and UI.
  - Updated `AlertType` enum to only include `ANOMALY` and `OUTBREAK`.
- **Anomaly Enrichment** — Anomalies now include patient age and gender data in sync process.

### User Management

- **User Detail Page** — New clinician-facing user detail page with danger zone for account management.
  - New page: `frontend/app/(app)/(clinician)/users/[id]/page.tsx`.
  - New components: `user-detail-danger-zone.tsx`, `restore-deletion-button.tsx`.
  - Updated users page columns and data table.

### Backend

- **New User API** — New Flask blueprint for user management endpoints.
  - New file: `backend/app/api/user.py`.
  - Registered in `backend/app/__init__.py`.
- **SHAP Attention Mask Fix** — Updated ML service forward function to dynamically expand attention mask for varying batch sizes.
  - Documentation: `backend/documentations/CHANGELOG-shap-attention-mask-batch-fix.md`.

### Database & Scripts

- **Backup Utility** — New database backup script: `frontend/scripts/backup-db.js`.
- **Backfill Consent** — Script to update existing users with privacy consent: `frontend/scripts/backfill-consent.js`.
- **Patient Management Scripts** — New utilities: `check-map-data.js`, `clear-patients.js`, `db-check.js`, `fix-patient-ages.js`, `set-verified-status.js`.
- **Seeding Updates** — Updated `seed-realistic.js` for realistic patient data generation.

### Documentation

- New `docs/SEEDING_AND_BACKUP.md` — Guide for database seeding and backup procedures.
- Updated `docs/SYSTEM_PAGE_NAVIGATION_FLOWCHART.md` — Reflects new privacy and diagnosis flows.
- Updated `docs/BRANCH_REVIEW_CHECKLIST.md` — Removed linting check, updated test paths.
- Updated `AGENTS.md` and `frontend/AGENTS.md` — Added backup/reminders and code duplication guard sections.

### UI/UX

- **Back Button Component** — New reusable `frontend/components/shared/back-button.tsx` component.
- **Profile Form Improvements** — Enhanced error handling and success notifications for profile and avatar updates.
- **Grace Period Banner** — Simplified deletion grace period banner with improved date display.
- **Clustering Theme Updates** — Updated color palette and button styles for clustering components.
- **Diagnosis Status Badge** — New status badge display on patient-side history and diagnosis pages.
- **Chat Window Updates** — Improved chat container and history view for inconclusive diagnosis display.

---

## Changed

### Diagnosis Flow

- **Auto-Record All Diagnoses** — Replaced manual "Record" and "Discard" diagnosis buttons with automatic recording.
  - Removed `frontend/actions/create-diagnosis.ts`, `frontend/actions/discard-diagnosis.ts`.
  - Removed `frontend/schemas/CreateDiagnosisSchema.ts`, `frontend/schemas/DiscardDiagnosisSchema.ts`.
  - Removed `frontend/components/patient/diagnosis-page/record-diagnosis-btn.tsx`, `discard-diagnosis-btn.tsx`.
  - Updated `frontend/actions/auto-record-diagnosis.ts` to handle all diagnosis statuses.
- **Diagnosis Utilities** — Updated `frontend/utils/diagnosis.ts` with new status handling logic.
- **Override Diagnosis** — Updated `frontend/actions/override-diagnosis.ts` with improved validation.

### Alert System

- Removed confidence/uncertainty-based alert types from all UI components.
- Updated `frontend/utils/alert-severity.ts` and `frontend/utils/anomaly-reasons.ts`.
- Updated alerts list and map page components to reflect new alert types.

### Clustering

- Updated `frontend/constants/cluster-themes.ts` with new color themes.
- Updated clustering control panel, details table, and overview cards.
- Fixed empty clustering prevention logic.

### Profile & Authentication

- Updated `frontend/actions/update-profile.ts` and `frontend/actions/update-credentials.ts` with better error handling.
- Updated `frontend/actions/onboarding.ts` for privacy compliance.
- Updated Supabase proxy utility: `frontend/utils/supabase/proxy.ts`.

### Surveillance

- Updated `backend/app/api/surveillance.py` and `backend/app/services/surveillance_service.py`.
- Updated `backend/app/api/cluster.py`.

### Notebooks

- Updated model training notebooks with revised symptom-disease datasets:
  - `BioBERT_Symptom2Disease_dataset.ipynb`
  - `BioClinical_ModernBERT_base_Symptom2Disease_dataset_WITHOUT_DROPOUT_42.ipynb`
  - `BioClinical_ModernBERT_base_Symptom2Disease_dataset_WITH_DROPOUT_42.ipynb`
  - `ClinicalBERT_Symptom2Disease_dataset.ipynb`
  - `model_comparison_clean.ipynb`
  - `model_comparison_page_showcase.ipynb`
  - `model_metrics_BioClinical_ModernBERT_MCD.ipynb`

---

## Removed

- **Manual Diagnosis Recording** — Removed "Record Diagnosis" and "Discard Diagnosis" buttons and associated actions.
- **Low Confidence & High Uncertainty Alerts** — Removed `LOW_CONFIDENCE` and `HIGH_UNCERTAINTY` from `AlertType` enum and all related UI.
- **Account Deletion Action (Clinician)** — Removed direct account deletion; replaced with scheduled deletion flow.
- `frontend/utils/anomaly-reasons.ts` — Removed unused utility.

---

## Fixed

- **Alert Pipeline Verification Trigger** — Centralized alert pipeline logic to prevent duplicate alerts.
- **Empty Clustering Prevention** — Fixed clustering components to handle empty data gracefully.
- **TypeScript Errors** — Resolved type errors related to Prisma generation and schema updates.
- **Profile Form Controls** — Updated form controls for better layout and accessibility.
- **SHAP Attention Mask** — Fixed batch size handling in ML service forward function.
- **Data Export Format** — Fixed request body parsing for data export requests.
- **UI Consistency** — Addressed styling inconsistencies across diagnosis pages, history views, and profile forms.

---

## Database Schema Changes

### New Models

- `AuditLog` — Tracks user actions with timestamp and details.
- `DeletionSchedule` — Manages scheduled patient deletions with grace period and restoration.

### New Enums

- `DeletionScheduleStatus` — `SCHEDULED`, `RESTORED`, `ANONYMIZED`.

### Modified Models

- `User` — Added relations for `auditLogs`, `restoredDeletions`, `scheduledDeletions`, `patientDeletionSchedules`, `rejectedDiagnoses`.
- `Diagnosis` — Added `rejectedAt`, `rejectedBy`, `originalStatus` fields; reorganized relations.
- `TempDiagnosis` — Added `isValid` field.
- `DiagnosisNote` — Reordered relation definitions.

### Modified Enums

- `DiagnosisStatus` — Added `INCONCLUSIVE`.
- `AlertType` — Removed `LOW_CONFIDENCE` and `HIGH_UNCERTAINTY`.

### Connection Config

- Changed `directUrl` from `DATABASE_URL` to `DIRECT_URL` environment variable.

---

## Breaking Changes

- **`DIRECT_URL` Required** — Database configuration now requires `DIRECT_URL` environment variable in addition to `DATABASE_URL`.
- **Alert Type Removal** — Any integrations relying on `LOW_CONFIDENCE` or `HIGH_UNCERTAINTY` alert types will break.
- **Diagnosis Recording** — Manual diagnosis recording is no longer available; all diagnoses are auto-recorded.
- **Account Deletion** — Direct account deletion replaced with scheduled deletion; existing deletion UI/components removed.

---

## Files Summary

| Category       | Added | Modified | Removed |
| -------------- | ----- | -------- | ------- |
| Backend API    | 1     | 4        | 0       |
| Frontend Actions | 9   | 11       | 3       |
| Frontend Components | 15 | 25     | 3       |
| Frontend Pages | 2     | 8        | 0       |
| Frontend Schemas | 5   | 2        | 2       |
| Frontend Utils | 5     | 5        | 1       |
| Frontend Scripts | 7   | 2        | 0       |
| Prisma Schema  | 2 models, 1 enum | 4 models, 2 enums | 0 |
| Documentation  | 8     | 5        | 0       |
| Notebooks      | 0     | 8        | 0       |

**Total:** 151 files changed, ~19,714 insertions, ~12,737 deletions.
