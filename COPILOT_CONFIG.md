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
- Skill discovery or skill installation requests:
  - `find-skills`
- Frontend UI implementation tasks requiring polished visual design (when available in local skills):
  - `frontend-design`
- Frontend UI/UX tasks (mobile-first):
  - `accessibility-compliance` (first)
  - `vercel-react-best-practices` (second)
  - `vercel-composition-patterns` when component API/composition refactors are involved

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
- Frontend UI changes preserve mobile usability at small breakpoints.
- If routes/navigation/role-guard behavior changes, `docs/SYSTEM_PAGE_NAVIGATION_FLOWCHART.md` is updated in the same PR.
- No contradictory style guidance introduced in docs.

**NEW — Fool-Proof + Clinical Rigor Framework:**

- Patient-facing copy targets Grade 6–8 reading level (Grade ≤6 for urgent warnings).
- All patient-facing forms implement error recovery: input preservation, plain-language errors, retry logic.
- Diagnosis/warning flows include confirmation modals for risky actions (delete, clear).
- Diagnosis flows scheduled for or completed novice usability testing (5–8 non-tech users, ≥90% task completion).
- All result messaging includes confidence/uncertainty and next-action guidance.
- No absolute diagnosis claims; use probabilistic language only.

## Change sync checklist

Use this checklist whenever AI guidance files are updated:

1. If `.instructions.md` changes, confirm scoped overlays (`frontend/.instructions.md`, `backend/.instructions.md`) still align.
2. If a skill in `.github/skills/` changes, confirm task routing in this file still points to the right skill.
3. If architecture/runtime facts change (ports, backend type, entrypoints), update:
   - `.instructions.md`
   - `AGENTS.md`, `frontend/AGENTS.md`, `backend/AGENTS.md`
   - onboarding notes in `README.md`, `frontend/README.md`, and `backend/README.md`
4. If validation defaults change (TypeScript check, pytest commands, linting tools):
   - Update `.instructions.md` "Validation defaults" section
   - Update corresponding CI/CD workflows:
     - `.github/workflows/frontend-checks.yml` (for frontend validation)
     - `.github/workflows/backend-checks.yml` (for backend validation)
5. If prompt templates change, verify `.prompt.md` examples still match current code patterns.
6. Keep the duplicate-skill policy enforced: canonical skill change + mirrored compatibility copies in same PR.
7. Include the AI checklist section in PR descriptions for guidance-only changes.
8. If App Router pages, redirects, role access rules, or nav link structure changes, update `docs/SYSTEM_PAGE_NAVIGATION_FLOWCHART.md` and ensure Mermaid still renders.

## Lightweight change log

- 2026-03-23: Added hybrid Copilot operating model, prompt library, and domain skill routing.
- 2026-03-23: Added skill discovery routing (`find-skills`) and mobile-first UI/UX default routing notes.
- 2026-03-24: Added comprehensive Fool-Proof + Clinical Rigor framework with readability targets (Grade 6–8 for patients), error recovery safeguards, and novice usability validation gate before merge.
