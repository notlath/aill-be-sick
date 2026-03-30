# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] — 2026-03-30

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

### Removed

- Deleted `backend/tests/` directory (all test files moved to `tests/backend/tests/`)

### Infrastructure

- All test files are now centralized in a dedicated `tests/` folder at the project root
- Frontend tests use Vitest with configuration pointing to the new test directory
- Backend tests maintain their pytest-based structure in the new location
