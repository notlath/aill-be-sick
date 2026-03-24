## Summary

- What changed
- Why this change was needed

## User Impact

- What users/clinicians/admins will notice
- Any behavior changes they should expect

## Scope

- In scope:
- Out of scope:

## Linked Work

- Closes/Fixes:
- Related:

## Files Changed

- Frontend:
- Backend:
- Database/Prisma:
- Docs:

## Testing Done

- Commands run:
- Scenarios validated:
- Result:

## Risks & Rollback

- Risks:
- Rollback plan:

## Screenshots (if UI changes)

- Before:
- After:

## AI Checklist

- [ ] Architecture references are accurate (Flask backend on port 10000)
- [ ] Frontend mutation changes use Zod schema + `next-safe-action`
- [ ] Cache revalidation added where mutation behavior affects UI state
- [ ] Backend/Frontend contracts are unchanged or documented
- [ ] Migration or seed steps are documented if schema/data shape changed
- [ ] No secrets or sensitive data were introduced
- [ ] User-facing medical copy avoids absolute diagnosis claims
- [ ] User-facing text avoids the word "cluster" and uses "group" where applicable

## Fool-Proof + Clinical Rigor Checklist

**Readability & Plain Language:**

- [ ] Patient-facing copy targets Grade 6–8 reading level (no stacked medical jargon)
- [ ] Urgent warnings target Grade ≤6 (one directive per message)
- [ ] Medical jargon introduced has inline help/tooltip or glossary link
- [ ] No absolute diagnosis claims; use probabilistic language ("may," "suggests," "consider")

**Error Recovery & Resilience:**

- [ ] Forms preserve user input on error; errors show plain-language message + one clear action
- [ ] Transient failures (network, timeout) offer automatic retry with visible status
- [ ] Duplicate submissions prevented via UI (disabled button) + server-side idempotency
- [ ] Risky actions (delete, clear) require explicit confirmation with two-button modal
- [ ] Field-level validation errors show inline next to fields with specific fixes
- [ ] Offline/backend-unavailable fallback state preserves user work locally

**Novice Usability Validation (if patient-facing UX changed):**

- [ ] If diagnosis flow, warning copy, or safety messaging changed: **Novice validation testing completed** (5–8 non-technical users, ≥90% task completion, 0 safety misunderstandings)
- [ ] Test results documented in PR comments (or link to notes if extensive)
- [ ] Any edge cases/user confusion discovered and addressed
- [ ] If not tested yet, explain why (e.g., backend-only, internal tools) and schedule testing for follow-up PR
