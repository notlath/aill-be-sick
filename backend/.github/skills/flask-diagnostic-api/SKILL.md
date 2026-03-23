---
name: flask-diagnostic-api
description: Implement and refactor Flask diagnosis API features using the app’s blueprint + service architecture, ML service boundaries, and configuration-driven thresholds.
---

# Flask Diagnostic API

## Scope

Use this skill for backend changes in:

- `backend/app/api/*.py`
- `backend/app/services/*.py`
- `backend/app/config.py`

## Canonical architecture

- App entrypoint: `backend/run.py`
- App factory + blueprint registration: `backend/app/__init__.py`
- Route modules (HTTP handling): `backend/app/api/`
- Business/ML logic modules: `backend/app/services/`
- Tunables and thresholds: `backend/app/config.py`

## Required implementation pattern

1. Keep request parsing/response shaping in API modules.
2. Keep reusable logic in service modules.
3. Read thresholds from config/env instead of hardcoded literals.
4. Preserve backward compatibility for existing API response keys unless explicitly requested.
5. Return clear error payloads for expected failures.

## Guardrails

- Avoid embedding heavy business logic directly in routes.
- Avoid direct threshold literals in route conditions when config already exists.
- Avoid changing response contract unexpectedly for diagnosis/follow-up endpoints.

## Validation

Run targeted tests for changed behavior, for example:

- `python -m pytest backend/tests/test_flask.py -v`
- `python -m pytest backend/tests/test_follow_up_questions_all_diseases.py -v`
- plus nearest tests for touched service logic

## Output expectations

When implementing with this skill, provide:

- changed files
- endpoint behavior impact summary
- executed tests and outcomes
