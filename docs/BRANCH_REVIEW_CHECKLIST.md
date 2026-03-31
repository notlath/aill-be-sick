# AI Branch Review Checklist

> **Instructions for AI agents:** Before running checks, first determine which files were changed in this branch. Then select only the relevant tiers from this checklist. Do not run all items blindly — skip sections marked "context-dependent" if they don't apply to your changes.

A tiered checklist to verify that a branch is ready for merging into the `main` branch.

## How to Use

1. **First**, run `git diff --name-only main` (or `git diff main --name-only`) to see which files changed
2. **Then**, reference the "Quick Reference" table at the bottom to determine which tiers to run
3. **Finally**, check off only the relevant items — don't blindly check everything

---

## Tier 1: Always Required (Automated Commands)

Run these commands for every PR — they are fast and catch critical issues.

### CI/CD and Build Process

- [ ] `npm run build` in `frontend/` — Next.js app compiles without errors
- [ ] `npx prisma generate` — Prisma client regenerated (if schema changed)
- [ ] `npm run lint` — No linting errors or warnings
- [ ] `npx tsc --noEmit` — TypeScript type checking passes
- [ ] Backend tests pass (`pytest tests/backend/tests/...` or `python test_flask.py` if smoke test available)

### Code Quality (Automated Checks)

- [ ] No hardcoded threshold literals in Flask endpoints (search `backend/app/api/` for numeric literals > 0.5 in conditionals)
- [ ] No forbidden word "cluster" in user-facing strings (search `frontend/app/` for "cluster")
- [ ] No custom CSS gradients or shadows added (check `frontend/app/globals.css` for non-DaisyUI classes)

---

## Tier 2: Context-Dependent (Only If Files Changed)

Only complete these sections if you modified relevant files. Skip if not applicable.

### If App Router pages, navigation, or auth flows changed

- [ ] Update `docs/SYSTEM_PAGE_NAVIGATION_FLOWCHART.md` to reflect any route changes, guards, or redirects
- [ ] Verify role-hierarchy checks use `frontend/utils/role-hierarchy.ts` consistently

### If account creation or login flows changed

- [ ] Update `docs/ACCOUNT_CREATION_FLOWCHART.md` to reflect changes

### If backend configuration or thresholds changed

- [ ] Document new thresholds in `backend/app/config.py` with clear comments
- [ ] Update relevant changelog or documentation

### If frontend mutations added

- [ ] `revalidatePath` or `revalidateTag` called after successful mutations
- [ ] Zod schema defined in `frontend/schemas/` for the action
- [ ] Server action uses `actionClient` from `frontend/actions/client.ts`

### If clinician approval or patient creation workflow changed

- [ ] Backend: Approval status fields on User model (approvalStatus, approvedBy, approvedAt, rejectedAt, approvalNotes)
- [ ] Database: Prisma schema updated with ApprovalStatus enum if needed
- [ ] Role validation: Only CLINICIAN/ADMIN/DEVELOPER can create patients; clinicians require ACTIVE status

---

## Tier 3: Optional (For Major Changes Only)

Only complete for significant features or breaking changes.

### Changelog Creation

- [ ] Create `docs/CHANGELOG-<branch-name>.md` following [Changelog Standards](AGENTS.md#changelog-standards)
- [ ] Include: technical details, API changes, architectural changes, breaking changes
- [ ] Reference in main `docs/CHANGELOG.md` upon merge

### Security and Misc

- [ ] No `.env` or secret files exposed in repository
- [ ] New environment variables documented in `.env.example` or equivalent

---

## Quick Reference: Commands by File Type

| If you changed...                            | Run these extra checks...               |
| -------------------------------------------- | --------------------------------------- |
| `frontend/app/` pages                        | Tier 1 + navigation flowchart update    |
| `frontend/actions/`                          | Tier 1 + revalidation check             |
| `backend/app/api/`                           | Tier 1 + config docs + backend tests    |
| `frontend/prisma/schema.prisma`              | Tier 1 + prisma generate                |
| Workflow files (approvals, patient creation) | Tier 2 clinician/patient workflow items |

---

**When Tier 1 passes and relevant Tier 2 items are satisfied, the branch is ready for merging to `main`.**
