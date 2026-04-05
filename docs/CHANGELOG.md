# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] — Backend Diagnostics — 2026-04-05

### Added
- **Backend**: Introduced clinical red flag tracking via `WARNING_SIGN_GROUPS` in `question_groups.py` to prioritize high-risk symptoms (e.g., mucosal bleeding, blood in stool) over standard conversational symptom pathways.
- **Backend**: Added helper methods `is_warning_sign_detected` and `get_warning_sign_groups` to assist in routing emergency triage.
- **Backend Tests**: Created rigorous tests for `OntologyBuilder` and `VerificationLayer` regarding multi-lingual extraction of retroorbital pain specific to Dengue.

### Fixed
- **Backend**: Resolved false-positive `OUT_OF_SCOPE` warnings for Dengue by adding direct English and Tagalog keyword synonyms for "pain behind the eyes" mapping to `SX_RETROORBITAL_PAIN` in `config.py`.
- **Backend**: Excluded safely divergent questions (`influenza_q10`, `pneumonia_q10`) from shared conceptual question groups to prevent dangerous false-equivalences between English and Tagalog symptom banks.

## [Unreleased] — `feat/privacy-compliance` — 2026-04-05


> Full details: [`CHANGELOG-feat-privacy-compliance.md`](./CHANGELOG-feat-privacy-compliance.md)

### Added

- **Privacy Compliance** — User data export, consent withdrawal, account deletion, and scheduled patient deletion with grace period. New `DeletionSchedule` and `AuditLog` models.
- **Inconclusive Diagnosis Support** — New `INCONCLUSIVE` diagnosis status with dedicated clinician tab and patient-facing badges.
- **Rejected Diagnosis Revert** — Clinicians can revert rejected diagnoses back to their original status with full audit tracking.
- **Alert Pipeline Centralization** — Moved alert triggers from diagnosis creation to verification time; removed `LOW_CONFIDENCE` and `HIGH_UNCERTAINTY` alert types.
- **User Detail Page** — Clinician-facing user management with danger zone for account actions.
- **Supabase JWT Verification** — Backend now validates Supabase tokens instead of trusting `X-User-ID` headers.
- **Database Backup Utility** — New `backup-db.js` script and management scripts for patient data.
- **Surveillance PDF Export** — Professional epidemiological report export with formatting.

### Changed

- **Auto-Record All Diagnoses** — Removed confidence threshold; all diagnoses now auto-record without manual confirmation.
- **Diagnosis Verification Flow** — Alert pipeline runs at verification time, not creation time.
- **Clustering Themes** — Updated color palette and button styles.
- **Profile Forms** — Improved error handling, success notifications, and theme consistency.

### Removed

- Manual "Record" and "Discard" diagnosis buttons and actions.
- `LOW_CONFIDENCE` and `HIGH_UNCERTAINTY` alert types.
- Direct account deletion (replaced with scheduled deletion).

### Fixed

- Alert pipeline duplicate alerts during batch verification.
- Empty clustering prevention.
- TypeScript errors from Prisma schema updates.
- SHAP attention mask batch size handling in ML service.
- Data export CSV returning actual user data instead of just counts.

### Breaking Changes

- `DIRECT_URL` environment variable now required alongside `DATABASE_URL`.
- `LOW_CONFIDENCE` and `HIGH_UNCERTAINTY` alert types removed from schema.
- Manual diagnosis recording no longer available.
- Direct account deletion replaced with scheduled deletion flow.

---

## [Unreleased] — 2026-03-31

### Fixed

- **Frontend**: Fixed clinician redirect issue when using patient login page.
  - Updated `patientLogin` action to use role-based redirects instead of hardcoded `/diagnosis` redirect.
  - Clinicians logging in via patient portal now correctly redirect to `/map` instead of `/diagnosis`.
  - Added role validation and approval status checks for clinicians.
  - Updated `adminLogin` action to use centralized role-based landing page configuration.
  - Integrated with `getDefaultLandingPath` utility for consistent routing across all auth actions.
  - Maintains performance benefits of direct redirects while fixing cross-portal login UX.
- **Frontend**: Fixed dark mode styling inconsistencies in the profile pages.
  - Replaced hardcoded `bg-white/80` and `bg-white` with DaisyUI semantic token `bg-base-100` in profile forms.
  - Replaced `border-white` with `border-base-100` on avatar rings and skeleton loaders.
  - Corrected section backgrounds to use `bg-base-100/80` for backdrop-blur transparency that adapts to theme.
  - Applied fixes across both Patient and Clinician profile views and their respective form components.
- **Frontend**: Fixed profile skeleton loaders to properly respect dark mode by avoiding hardcoded white borders.

### Added

- New `tests/` directory at project root containing all test files
- New `tests/frontend/` directory with frontend test files:
  - `tests/frontend/__tests__/auth/auth-actions.test.ts`
  - `tests/frontend/__tests__/auth/auth-concurrency-gaps.test.ts`
  - `tests/frontend/__tests__/auth/role-hierarchy.test.ts`
  - `tests/frontend/__tests__/auth/schemas.test.ts`
  - `tests/frontend/__tests__/setup.ts`
- New `tests/backend/tests/` directory with backend test files:
  - `tests/backend/tests/test_common_confounders.py`
  - `tests/backend/tests/test_diabetes_out_of_scope.py`
  - `tests/backend/tests/test_explain_confusion.py`
  - `tests/backend/tests/test_flask.py`
  - `tests/backend/tests/test_follow_up_questions_all_diseases.py`
  - `tests/backend/tests/test_follow_up_triage.py`
  - `tests/backend/tests/test_fuzzy_matching.py`
  - `tests/backend/tests/test_hybrid_scoring.py`
  - `tests/backend/tests/test_integration_followup.py`
  - `tests/backend/tests/test_out_of_scope.py`
  - `tests/backend/tests/test_pneumonia_exhaustion.py`
  - `tests/backend/tests/test_pneumonia_rigors.py`
  - `tests/backend/tests/test_reproduce_issue.py`
  - `tests/backend/tests/test_surveillance.py`
  - `tests/backend/tests/test_symptom_gate.py`
  - `tests/backend/tests/test_verification.py`
- New `frontend/vitest.config.ts` - Vitest configuration for frontend tests
- New `frontend/debug.ts` - Debug utility file
- Added `vitest` as a devDependency in `frontend/package.json`

### Changed

- Updated test file references in `AGENTS.md` from `backend/tests/` to `tests/backend/tests/`
- Updated test file references in `docs/BRANCH_REVIEW_CHECKLIST.md` from `backend/tests/` to `tests/backend/tests/`
- Updated test file references in `backend/.instructions.md` from `backend/tests/` to `tests/backend/tests/`
- Updated test file references in `backend/.github/skills/flask-diagnostic-api/SKILL.md` from `backend/tests/` to `tests/backend/tests/`
- Updated `frontend/vitest.config.ts` to point to new test locations:
  - Test file pattern: `../tests/frontend/__tests__/**/*.test.ts`
  - Setup file: `../tests/frontend/__tests__/setup.ts`
- **Frontend**: Unified authentication UI across Patient, Admin, and Clinician login pages.
  - Applied consistent DaisyUI/Tailwind design system with staggered entrance animations.
  - Added hero panels with contextual overlays and text shadows for readability.
  - Updated brand headers with role-specific icons (Stethoscope for patients/clinicians, Shield for admin).
  - Added footer navigation with role-specific links.
- **Frontend**: Improved OAuth error handling flow.
  - Modified auth callback to redirect to login with error parameter instead of `/need-account`.
  - Added warning alert display for unauthorized Google sign-in attempts.
  - Added support link on need-account page for account recovery.
- **Frontend**: Added clinician approval workflow with admin oversight.
  - New pending-clinicians page for admin management.
  - Server actions for approve/reject functionality.
  - Updated `docs/ACCOUNT_CREATION_FLOWCHART.md` with new approval steps.
- **Frontend**: Implemented role hierarchy system (PATIENT < CLINICIAN < ADMIN < DEVELOPER).
  - Created `frontend/utils/role-hierarchy.ts` for centralized permission checks.
  - Updated all server actions to use hierarchical permission checks.
- **Frontend**: Added patient invite resend and expired invite handling.
  - New action: `frontend/actions/resend-invite.ts`.
- **Frontend**: Replaced temp passwords with invite-based account creation.
- **Frontend**: Added Mapbox geocoding for patient creation.
- **Frontend**: Removed patient onboarding flow (patients now created directly by clinicians).
- **Frontend**: Restricted Google sign-in to pre-registered patients only.
- **Frontend**: Added dark mode support to profile forms.
- **Frontend**: Enhanced navigation for admin users.
- **Backend**: Implemented three-tier concept classification system.
  - Categorizes concepts into medical, non-medical, and out-of-scope.
  - Added `docs/out-of-scope-diseases.md` documentation.
- **Backend**: Updated tokenizer to use PreTrainedTokenizerFast.
- **Backend**: Improved handling of existing Supabase auth users during patient creation.
- **Docs**: Added `docs/BRANCH_REVIEW_CHECKLIST.md`.
- **Docs**: Updated navigation flowchart requirements.

### Removed

- Deleted `backend/tests/` directory (all test files moved to `tests/backend/tests/`)

### Infrastructure

- All test files are now centralized in a dedicated `tests/` folder at the project root
- Frontend tests use Vitest with configuration pointing to the new test directory
- Backend tests maintain their pytest-based structure in the new location

### Breaking Changes

- Removed patient onboarding flow - patients are now created directly by clinicians
- Restricted Google sign-in to pre-registered patients only
- Removed toggle mode functionality from authentication

### Architectural Changes

- Implemented role hierarchy system with centralized permission checks
- Introduced clinician approval workflow with admin oversight
- Switched to invite-based patient account creation
