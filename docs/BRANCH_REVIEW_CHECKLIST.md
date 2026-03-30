# AI Branch Review Checklist

A comprehensive checklist to verify that a branch is ready for merging into the `main` branch. This checklist covers code quality, CI/CD, architecture, documentation, and user-facing content requirements for the AI'll Be Sick project.

## CI/CD and Build Process

- [ ] Run `npm run build` successfully – ensures the Next.js app compiles without errors
- [ ] Run `npx prisma generate` successfully – regenerates Prisma client for any schema changes
- [ ] Run `npm run lint` – no linting errors or warnings
- [ ] Run `npx tsc --noEmit` – TypeScript type checking passes with no errors
- [ ] Run relevant backend tests (`pytest tests/backend/tests/...`) – all tests pass
- [ ] Run `npm audit` – no high‑severity security vulnerabilities introduced

## Code Quality and Safety

- [ ] No hardcoded threshold literals in Flask endpoints – use `config.py` and environment variables
- [ ] All user‑facing medical text follows plain‑language guidelines (calm, non‑absolute)
- [ ] Forbidden words ("cluster") are not used in any user‑facing strings
- [ ] No custom CSS gradients, shadows, or non‑DaisyUI styling added
- [ ] Only DaisyUI components and Lucide React icons are used for decorative elements
- [ ] No new custom Tailwind classes that bypass the design system
- [ ] All new UI components are mobile‑friendly at small breakpoints

## Architecture and Permissions

- [ ] If navigation links, redirects, or guards were modified, update `docs/SYSTEM_PAGE_NAVIGATION_FLOWCHART.md`
- [ ] If account creation or login flows were changed, update `docs/ACCOUNT_CREATION_FLOWCHART.md`
- [ ] Role‑hierarchy checks use `frontend/utils/role-hierarchy.ts` for consistency
- [ ] `revalidatePath` or `revalidateTag` are called after successful mutations
- [ ] No App Router page changes without corresponding updates to the navigation flowchart

## Clinician Approval Workflow

- [ ] Frontend: `admin-clinician-approvals.ts` implemented with proper role validation
- [ ] Backend: Approval status fields added to User model (approvalStatus, approvedBy, approvedAt, rejectedAt, approvalNotes)
- [ ] Database: Prisma schema updated with ApprovalStatus enum and approval fields
- [ ] Role hierarchy: `canApproveClinicians()` function correctly restricts to ADMIN/DEVELOPER
- [ ] Email workflow: Patient creation sends proper invite emails
- [ ] UI components: Pending clinicians page and approval actions implemented
- [ ] Error handling: Proper validation and error messages for approval/rejection

## Patient Creation Workflow

- [ ] Role validation: Only CLINICIAN/ADMIN/DEVELOPER can create patients
- [ ] Approval status: Clinicians require ACTIVE approval status to create patients
- [ ] Email verification: Supabase invite flow properly implemented with retry logic
- [ ] Data validation: Proper geocoding and structured name building
- [ ] Cache invalidation: Both `/users` and `/pending-clinicians` paths revalidated

## Documentation and Copywriting

- [ ] All changes to backend configuration or thresholds are documented in `config.py`
- [ ] User manuals, research notes, and flowcharts are updated as needed
- [ ] Copywriting follows project style: plain language, short sentences, actionable next steps
- [ ] No contradictory style guidance introduced in documentation

## Changelog Creation

- [ ] If branch contains major changes, create a detailed changelog
- [ ] Changelog should be very detailed and catered to AI agents and developers
- [ ] Include technical details, API changes, architectural changes, and breaking changes
- [ ] Follow conventional commit format for entries
- [ ] Ensure changelog is placed in appropriate documentation directory

## Miscellaneous Checks

- [ ] No `.env` or other secret files are exposed in the repository
- [ ] All new environment variables are documented in `.env.example` or equivalent
- [ ] No restricted file patterns were modified (enforced by current mode restrictions)
- [ ] All new files are placed in appropriate subdirectories (`frontend/`, `backend/`, `docs/`, etc.)

---

**When all checklist items are satisfied, the branch is ready for merging to `main`.**
