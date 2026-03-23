# Copilot Configuration Guide

This file explains how to use Copilot guidance assets in this repository.

## Guidance hierarchy (Hybrid model)

1. `.instructions.md` (operational defaults for day-to-day requests)
2. Skill files in `.github/skills/**/SKILL.md` (task-specific deep guidance)
3. `AGENTS.md` files (full project and subsystem reference)

If guidance conflicts, follow this order unless a task explicitly states otherwise.

## Recommended task routing

- Frontend mutation/diagnosis flow work:
  - `frontend/.github/skills/medical-diagnosis-actions/SKILL.md`
- User-facing medical content edits:
  - `frontend/.github/skills/clinical-copywriting/SKILL.md`
- Backend Flask diagnosis/service work:
  - `backend/.github/skills/flask-diagnostic-api/SKILL.md`
- D3 or custom visualizations:
  - `frontend/.github/skills/d3-viz/SKILL.md`

## Duplicate skill policy (Document-only strategy)

This repo currently contains duplicated `d3-viz` skill copies across multiple tool folders for compatibility.

- Canonical source: `frontend/.github/skills/d3-viz/SKILL.md`
- Compatibility copies may exist under:
  - `.gemini/`
  - `.opencode/`
  - `.agent/`
  - `.agents/`
  - `.qwen/`

### Sync rule

When updating the canonical skill, mirror the exact content to compatibility copies in the same PR.
Do not change compatibility copy wording independently.

## Validation checklist for AI-generated changes

- Architecture facts remain accurate (Flask backend, port 10000).
- Frontend mutations follow schema + server-action pattern.
- Revalidation is applied after mutations where needed.
- User-facing medical text is plain-language and non-absolute.
- No contradictory style guidance introduced in docs.

## Change sync checklist

Use this checklist whenever AI guidance files are updated:

1. If `.instructions.md` changes, confirm scoped overlays (`frontend/.instructions.md`, `backend/.instructions.md`) still align.
2. If a skill in `.github/skills/` changes, confirm task routing in this file still points to the right skill.
3. If architecture/runtime facts change (ports, backend type, entrypoints), update:

- `.instructions.md`
- `AGENTS.md`, `frontend/AGENTS.md`, `backend/AGENTS.md`
- onboarding notes in `README.md`, `frontend/README.md`, and `backend/README.md`

4. If prompt templates change, verify `.prompt.md` examples still match current code patterns.
5. Keep the duplicate-skill policy enforced: canonical skill change + mirrored compatibility copies in same PR.
6. Include the AI checklist section in PR descriptions for guidance-only changes.

## Lightweight change log

- 2026-03-23: Added hybrid Copilot operating model, prompt library, and domain skill routing.
