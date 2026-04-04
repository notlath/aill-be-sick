# AI'll Be Sick — Agent Guide

This file is the single source of truth for AI-assisted development on this project. It covers architecture, conventions, commands, skill routing, and guardrails.

> Sub-directories have their own scoped `AGENTS.md` files (`frontend/AGENTS.md`, `backend/AGENTS.md`). Always prefer those for in-directory work; use this file for cross-repo context.

---

## ⚠️ MANDATORY PRE-COMPLETION CHECKLIST

**BEFORE calling `attempt_completion`, you MUST verify ALL items below. Failure to complete this checklist means the task is NOT done.**

### Documentation Sync (CRITICAL)

- [ ] **If you created/modified/deleted ANY App Router page** → Update `docs/SYSTEM_PAGE_NAVIGATION_FLOWCHART.md`
- [ ] **If you changed navigation links, redirects, or guards** → Update `docs/SYSTEM_PAGE_NAVIGATION_FLOWCHART.md`
- [ ] **If you modified auth flows or role access** → Update `docs/SYSTEM_PAGE_NAVIGATION_FLOWCHART.md` AND `docs/ACCOUNT_CREATION_FLOWCHART.md`
- [ ] **If you changed account creation/login flows** → Update `docs/ACCOUNT_CREATION_FLOWCHART.md`

### Code Quality

- [ ] `npx tsc --noEmit` passes in `frontend/` (TypeScript check)
- [ ] Relevant `pytest` tests pass in `tests/backend/tests/`
- [ ] No hardcoded threshold literals in Flask endpoints (use `config.py`)
- [ ] Frontend mutations follow schema + server-action pattern
- [ ] `revalidatePath`/`revalidateTag` applied after mutations
- [ ] No duplicated code blocks — search for repeated logic that should be extracted into shared utilities

### User-Facing Content

- [ ] Medical text is plain-language, calm, and non-absolute
- [ ] UI changes are mobile-usable at small breakpoints
- [ ] No contradictory style guidance introduced

**These checks are NOT optional. Complete them before every task completion.**

---

## Project Overview

AI'll Be Sick is a full-stack disease detection application. Users submit symptoms and receive AI-powered disease predictions. The system supports both English and Tagalog, serves patient and clinician roles, and includes epidemiological surveillance features.

- **`backend/`** — Flask REST API. Processes symptoms, runs ML inference, and returns predictions.
- **`frontend/`** — Next.js App Router UI. Patient diagnosis flow, clinician dashboard, maps, alerts.
- **`notebooks/`** — Jupyter notebooks for data analysis and model experimentation.
- **`docs/`** — User manuals, technical reports, and research notes.

### Architecture

| Layer       | Technology                                                    |
| ----------- | ------------------------------------------------------------- |
| Backend API | Python, Flask (port `10000`)                                  |
| ML Models   | BioClinical-ModernBERT (EN), RoBERTa-Tagalog (FIL)            |
| Frontend    | TypeScript, Next.js 16 App Router, React 19                   |
| Database    | PostgreSQL (Supabase) + Prisma ORM v6.19.2                    |
| Auth        | Supabase Auth                                                 |
| Styling     | Tailwind CSS v4 + DaisyUI v5                                  |
| Icons       | Lucide React                                                  |
| State       | Zustand                                                       |
| Charts      | D3 v7, Recharts v3                                            |
| Maps        | Leaflet + Mapbox                                              |
| AI          | Google Generative AI SDK                                      |
| Testing     | Vitest (frontend), pytest (backend)                           |

### Project Structure

```
aill-be-sick/
├── AGENTS.md                     # This file — single source of truth
├── README.md                     # Project overview and setup guide
├── backend/                      # Flask REST API
│   ├── AGENTS.md                 # Backend-specific agent guide
│   ├── README.md                 # Backend setup and API docs
│   ├── app/
│   │   ├── __init__.py           # Flask app factory
│   │   ├── config.py             # All thresholds and tunables
│   │   ├── evidence_keywords.py  # Medical keyword definitions
│   │   ├── question_groups.py    # Follow-up question banks
│   │   ├── api/
│   │   │   ├── diagnosis.py      # Diagnosis endpoints
│   │   │   ├── cluster.py        # Clustering endpoints
│   │   │   ├── outbreak.py       # Outbreak detection
│   │   │   ├── surveillance.py   # Surveillance endpoints
│   │   │   ├── user.py           # User management endpoints
│   │   │   └── main.py           # Main routes
│   │   ├── models/
│   │   │   └── diagnosis_session.py
│   │   ├── services/
│   │   │   ├── ml_service.py           # ML model inference
│   │   │   ├── cluster_service.py      # Clustering logic
│   │   │   ├── illness_cluster_service.py
│   │   │   ├── information_gain.py     # EIG calculations
│   │   │   ├── outbreak_service.py     # Outbreak detection
│   │   │   ├── surveillance_service.py
│   │   │   └── verification.py         # Diagnosis verification
│   │   └── utils/
│   │       ├── database.py
│   │       └── scoring.py
│   ├── requirements.txt
│   ├── run.py                    # Entry point
│   └── Dockerfile
├── frontend/                     # Next.js App Router UI
│   ├── AGENTS.md                 # Frontend-specific agent guide
│   ├── README.md                 # Frontend setup guide
│   ├── actions/                  # Server actions (mutations)
│   ├── app/
│   │   ├── (app)/
│   │   │   ├── (clinician)/      # Clinician route group
│   │   │   │   ├── alerts/
│   │   │   │   ├── clinician-profile/
│   │   │   │   ├── create-patient/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── healthcare-reports/
│   │   │   │   ├── map/
│   │   │   │   ├── pending-clinicians/
│   │   │   │   └── users/
│   │   │   └── (patient)/        # Patient route group
│   │   │       ├── diagnosis/
│   │   │       ├── history/
│   │   │       └── profile/
│   │   ├── (auth)/               # Auth route group
│   │   │   ├── login/
│   │   │   ├── clinician-login/
│   │   │   ├── admin-login/
│   │   │   ├── onboarding/
│   │   │   ├── privacy/
│   │   │   ├── terms/
│   │   │   └── ...
│   │   ├── comparison/
│   │   ├── privacy-rights/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/               # Reusable React components
│   ├── constants/                # Constant values
│   ├── hooks/                    # Custom React hooks
│   ├── lib/                      # Library utilities (including generated Prisma)
│   ├── schemas/                  # Zod validation schemas
│   ├── stores/                   # Zustand state stores
│   ├── types/                    # TypeScript type definitions
│   ├── utils/                    # Utility functions
│   ├── prisma/
│   │   └── schema.prisma         # Database schema
│   ├── middleware.ts             # Supabase session middleware
│   └── package.json
├── tests/                        # Test suites
│   └── backend/tests/            # Backend pytest tests
├── docs/                         # Documentation
└── notebooks/                    # Jupyter notebooks
```

### Environment Variables

#### Frontend (`.env.local`)

| Variable                        | Description                                              |
| ------------------------------- | -------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL                                     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous client key                            |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase service role key (SECRET — never commit)        |
| `DATABASE_URL`                  | PostgreSQL connection string (pgBouncer mode)            |
| `DIRECT_DATABASE_URL`           | Direct PostgreSQL connection (for migrations)            |
| `DIRECT_URL`                    | Direct connection to database (for migrations)           |
| `NEXT_PUBLIC_BACKEND_URL`       | Flask backend URL (default: `http://localhost:10000`)    |
| `NEXT_PUBLIC_DIAGNOSIS_MODE`    | Diagnosis mode: `adaptive` or other modes                |
| `NEXT_PUBLIC_MAPBOX_TOKEN`      | Mapbox access token for map features                     |
| `NODE_ENV`                      | Environment: `development` or `production`               |

#### Backend

| Variable                  | Description                                    |
| ------------------------- | ---------------------------------------------- |
| `FLASK_ENV`               | Flask environment mode                         |
| `FRONTEND_URL`            | Frontend URL for CORS                          |
| `DATABASE_URL`            | PostgreSQL connection string for SQLAlchemy    |
| Model-related env vars    | See `backend/app/config.py` for all thresholds |

---

## Role Hierarchy

The application enforces a strict role hierarchy where higher roles inherit permissions of lower roles:

### Hierarchy (Highest to Lowest)

| Level | Role      | Description                                     |
| ----- | --------- | ----------------------------------------------- |
| 3     | DEVELOPER | Full system access, all admin capabilities      |
| 2     | ADMIN     | Clinician management, approval workflows        |
| 1     | CLINICIAN | Patient management, diagnosis override          |
| 0     | PATIENT   | Self-service symptom checker, diagnosis history |

### Permission Inheritance Rules

- **DEVELOPER**: Can perform ALL actions (ADMIN + CLINICIAN + PATIENT permissions)
- **ADMIN**: Can perform ADMIN + CLINICIAN + PATIENT actions
- **CLINICIAN**: Can perform CLINICIAN + PATIENT actions
- **PATIENT**: Can only perform PATIENT actions

### Permission Mapping by Action

| Action                     | PATIENT | CLINICIAN | ADMIN | DEVELOPER |
| -------------------------- | ------- | --------- | ----- | --------- |
| Submit symptoms            | ✅      | ✅        | ✅    | ✅        |
| View own diagnosis history | ✅      | ✅        | ✅    | ✅        |
| Create patient accounts    | ❌      | ✅        | ✅    | ✅        |
| Override diagnoses         | ❌      | ✅        | ✅    | ✅        |
| Approve clinicians         | ❌      | ❌        | ✅    | ✅        |
| Manage clinicians          | ❌      | ❌        | ✅    | ✅        |
| System administration      | ❌      | ❌        | ❌    | ✅        |

### Implementation Reference

When implementing permission checks in server actions:

```typescript
// ✅ CORRECT: Hierarchical role check
const allowedRoles = ["CLINICIAN", "ADMIN", "DEVELOPER"];
if (!allowedRoles.includes(currentUser.role)) {
  return { error: "Permission denied" };
}

// ✅ CORRECT: Conditional approval check (only CLINICIAN needs ACTIVE status)
if (
  currentUser.role === "CLINICIAN" &&
  currentUser.approvalStatus !== "ACTIVE"
) {
  return { error: "Your clinician account is not active" };
}

// ❌ WRONG: Strict equality (excludes ADMIN and DEVELOPER)
if (currentUser.role !== "CLINICIAN") {
  return { error: "Only clinicians can create patient accounts" };
}
```

**Use the shared utility**: `frontend/utils/role-hierarchy.ts` for consistent permission checks.

---

## Database Schema

The application uses PostgreSQL with Prisma ORM. Key models:

### Core Models

| Model                 | Description                                                    |
| --------------------- | -------------------------------------------------------------- |
| `User`                | User accounts with role, demographics, location, consent       |
| `Chat`                | Conversational sessions linked to users                        |
| `Message`             | Individual chat messages with role and type                    |
| `TempDiagnosis`       | Temporary diagnosis suggestions during conversations           |
| `Diagnosis`           | Confirmed diagnoses with confidence, uncertainty, verification |
| `Explanation`         | SHAP-based token importance scores                             |

### Clinical & Surveillance Models

| Model                 | Description                                                    |
| --------------------- | -------------------------------------------------------------- |
| `DiagnosisOverride`   | Clinician overrides of AI diagnoses with audit trail           |
| `Alert`               | Clinician alerts for outbreak/anomaly surveillance             |
| `AlertNote`           | Notes attached to alerts                                       |
| `DiagnosisNote`       | Notes attached to diagnoses                                    |
| `AuditLog`            | System-wide audit trail                                        |
| `diagnosis_sessions`  | Raw session data from backend                                  |

### Privacy & Access Control Models

| Model                      | Description                                      |
| -------------------------- | ------------------------------------------------ |
| `DeletionSchedule`         | Privacy-compliant deletion scheduling            |
| `AllowedClinicianEmail`    | Allowlist for clinician signup                   |

### Key Enums

| Enum                    | Values                                                        |
| ----------------------- | ------------------------------------------------------------- |
| `Role`                  | PATIENT, CLINICIAN, ADMIN, DEVELOPER                          |
| `DiagnosisStatus`       | PENDING, VERIFIED, REJECTED, INCONCLUSIVE                     |
| `ApprovalStatus`        | PENDING_ADMIN_APPROVAL, ACTIVE, REJECTED                      |
| `Disease`               | DENGUE, PNEUMONIA, TYPHOID, DIARRHEA, MEASLES, INFLUENZA      |
| `Model`                 | BIOCLINICAL_MODERNBERT, ROBERTA_TAGALOG                       |
| `AlertType`             | ANOMALY, OUTBREAK                                             |
| `AlertSeverity`         | LOW, MEDIUM, HIGH, CRITICAL                                   |
| `AlertStatus`           | NEW, ACKNOWLEDGED, DISMISSED, RESOLVED                        |
| `MessageType`           | SYMPTOMS, ANSWER, QUESTION, DIAGNOSIS, URGENT_WARNING, ERROR, INFO |
| `DeletionScheduleStatus`| SCHEDULED, RESTORED, ANONYMIZED                               |

---

## Commands

### Backend (Flask)

```bash
# From /backend — create and activate virtualenv
python3 -m venv venv && source venv/bin/activate   # macOS/Linux
# python -m venv venv && venv\Scripts\activate      # Windows

pip install -r requirements.txt
python run.py                                        # Runs on http://localhost:10000
```

**Testing:**

```bash
# Run targeted test files relevant to your change
pytest tests/backend/tests/<test_file>.py
python test_flask.py   # Integration smoke test (requires server running)
```

### Frontend (Next.js)

```bash
# From /frontend
bun install

# Configure .env.local (see Environment Variables section above)

npx prisma generate && npx prisma db push
bun dev                                              # Runs on http://localhost:3000
```

**Available scripts:**

| Script                     | Description                                                |
| -------------------------- | ---------------------------------------------------------- |
| `bun run dev`              | Start development server with Turbopack                    |
| `bun run build`            | Production build                                           |
| `bun run start`            | Production server                                          |
| `bun run lint`             | Next.js linting                                            |
| `npx tsc --noEmit`         | TypeScript type check (run before committing)              |
| `bun run seed:diagnoses`   | Seed diagnosis data                                        |
| `bun run seed:users`       | Seed user data                                             |
| `bun run seed:realistic`   | Seed realistic patient/diagnosis data (requires .env.local)|
| `bun run db:backup`        | Export database backup                                     |
| `bun run db:backup:list`   | List available backups                                     |
| `bun run db:backup:restore`| Restore from a backup                                      |
| `bun run db:backfill-consent`| Backfill consent records for existing users              |

---

## Code Style & Conventions

### General

- TypeScript for all frontend code.
- Follow conventional commit format: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`.
- Write tests for new backend features in `tests/backend/tests/`.

### Frontend: Data Fetching

- **ALWAYS** fetch data in Server Components or Server Actions using Prisma directly.
- **NEVER** use `useEffect` or client-side fetching for initial data loads that can be done server-side.
- **NEVER** use Server Actions for data fetching — they are strictly for mutations.
- **ALWAYS** put data-fetching utility functions in `frontend/utils/`.
- **ALWAYS** use `revalidatePath` or `revalidateTag` after successful mutations.

```typescript
// app/dashboard/page.tsx — correct Server Component pattern
import prisma from "@/lib/prisma";

async function DashboardPage() {
  const patients = await prisma.patient.findMany();
  return <PatientList patients={patients} />;
}
```

### Frontend: Data Mutation (Server Actions)

The project uses `next-safe-action` for all mutations. Every action needs a paired Zod schema.

- **ALWAYS** define a Zod schema in `frontend/schemas/`.
- **ALWAYS** create the action in `frontend/actions/` using `actionClient` from `actions/client.ts`.
- **NEVER** expose direct API endpoints for mutations.

```typescript
// schemas/CreatePatientSchema.ts
import * as z from "zod";
export const CreatePatientSchema = z.object({
  name: z.string().min(1, "Patient name is required"),
  email: z.string().email("Invalid email address"),
});

// actions/create-patient.ts
("use server");
import { actionClient } from "./client";
import { CreatePatientSchema } from "@/schemas/CreatePatientSchema";
import prisma from "@/prisma/prisma";
import { revalidatePath } from "next/cache";

export const createPatient = actionClient
  .inputSchema(CreatePatientSchema)
  .action(async ({ parsedInput }) => {
    const { name, email } = parsedInput;
    try {
      const newPatient = await prisma.patient.create({ data: { name, email } });
      revalidatePath("/dashboard");
      return { success: newPatient };
    } catch (error) {
      console.error(`Error creating new patient: ${error}`);
      return { error: "Failed to create new patient." };
    }
  });
```

### Backend Conventions

- Keep routes in Flask blueprints under `backend/app/api/`.
- Keep reusable logic in `backend/app/services/`.
- Read all tunables/thresholds from `backend/app/config.py` and environment variables — **never hardcode threshold literals in endpoints**.
- Keep endpoint failures explicit and safe for API consumers.

---

## Styling Guidelines

### DaisyUI Only Policy

- **ALWAYS** use DaisyUI components and classes (buttons, cards, modals, alerts, badges, etc.)
- **NEVER** use custom Tailwind classes for decorative styling (no custom gradients, shadows, transitions on top of DaisyUI's system)
- **USE** `lucide-react` for all icons
- **NEVER** create custom gradients or visual effects — use DaisyUI's built-in options

**Common classes:**

| Type    | Classes                                                                       |
| ------- | ----------------------------------------------------------------------------- |
| Buttons | `btn btn-primary`, `btn-secondary`, `btn-success`, `btn-ghost`, `btn-outline` |
| Cards   | `card card-body card-title card-actions`                                      |
| Modals  | `modal modal-box modal-backdrop modal-open`                                   |
| Alerts  | `alert alert-info alert-success alert-warning alert-error`                    |
| Badges  | `badge badge-primary badge-secondary badge-outline`                           |
| Layout  | `bg-base-100 bg-base-200 bg-base-300 text-base-content`                       |

### Navigation Links

When creating new sidebar navigation items, copy from `nav-link.tsx`:

- Icon size: `size-4.5` with `strokeWidth={2.5}`
- Animation curve: `ease-[cubic-bezier(0.32,0.72,0,1)]`
- Always include: hover gradient overlay, active state, consistent spacing

---

## Copywriting Guidelines

This is a medical app for adult non-technical users — millennials through older adults.

- Use plain language and short sentences; explain medical terms when needed.
- Tone: calm, respectful, supportive. No slang, sarcasm, or alarmist language.
- **NEVER** make absolute diagnosis claims. Avoid wording that implies guaranteed results.
- Prefer actionable text that tells users what to do next.
- **NEVER** use the word "cluster" in user-facing text. Use "group" instead.
- **ALWAYS** proofread user-facing copy for clarity, grammar, and spelling before shipping.

---

## Git Workflow

### Pull Request Template

```md
## What does this PR do?

- A brief description of the changes made in this PR

## Files Changed

- A list of the files that were changed in this PR

## Testing Done

- A description of the tests that were performed to verify the changes
```

### Commit Convention

Use [Conventional Commits](https://www.conventionalcommits.org/):
`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `perf:`, `test:`

---

## Skill Routing

Use the appropriate skill file for AI-assisted work:

| Task type                                             | Skill file                                                                                 |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Diagnosis server actions, Zod schemas, diagnosis flow | `frontend/.github/skills/medical-diagnosis-actions/SKILL.md`                               |
| Patient/clinician-facing copy                         | `frontend/.github/skills/clinical-copywriting/SKILL.md`                                    |
| Flask endpoints, services, config-driven API changes  | `backend/.github/skills/flask-diagnostic-api/SKILL.md`                                     |
| D3 charts, map visualizations                         | `frontend/.github/skills/d3-viz/SKILL.md` (canonical)                                      |
| Discovering or installing new skills                  | `find-skills`                                                                              |
| Frontend UI (polished visual design)                  | `frontend-design` skill (when available locally)                                           |
| Frontend UI/UX (mobile-first)                         | `accessibility-compliance` → `vercel-react-best-practices` → `vercel-composition-patterns` |

### Duplicate Skill Policy

The `d3-viz` skill may have compatibility copies across tool folders (`.gemini/`, `.agent/`, `.agents/`, `.qwen/`). The canonical copy is `frontend/.github/skills/d3-viz/SKILL.md`. When updating it, mirror the exact content to all compatibility copies **in the same PR**.

---

## AI Validation Checklist

Before committing AI-generated changes, verify:

- [ ] Architecture facts are correct (Flask backend on port `10000`, Next.js 16 App Router)
- [ ] Frontend mutations follow the schema + server-action pattern (`next-safe-action`)
- [ ] `revalidatePath` / `revalidateTag` is applied after mutations where needed
- [ ] User-facing medical text is plain-language, calm, and non-absolute
- [ ] Frontend UI changes are mobile-usable at small breakpoints
- [ ] If frontend routes, role guards, or navigation UI changed, `docs/SYSTEM_PAGE_NAVIGATION_FLOWCHART.md` is updated in the same PR
- [ ] No contradictory style guidance introduced in docs
- [ ] `npx tsc --noEmit` passes in `frontend/`
- [ ] Relevant `pytest` tests pass in `tests/backend/tests/`

> For a comprehensive branch review checklist covering CI/CD, build processes, and additional quality checks, refer to [`docs/BRANCH_REVIEW_CHECKLIST.md`](docs/BRANCH_REVIEW_CHECKLIST.md).

## Changelog Standards

When creating a changelog for a branch, follow these standards:

- **Keep a Changelog** format — organize entries into categories: Added, Changed, Deprecated, Removed, Fixed, Security. Entries are listed newest-first with release dates.
- **Semantic Versioning** — use `MAJOR.MINOR.PATCH` format:
  - `MAJOR` (e.g., 2.x.x) = incompatible API changes
  - `MINOR` (e.g., x.2.x) = new backwards-compatible features
  - `PATCH` (e.g., x.x.3) = backwards-compatible bug fixes

Place changelogs in `docs/CHANGELOG-<branch-name>.md` and reference them in the main `docs/CHANGELOG.md` upon merge.

### Change Sync Checklist

When AI guidance files are updated:

1. If architecture/runtime facts change (ports, backend type, entrypoints) — update `AGENTS.md`, `frontend/AGENTS.md`, `backend/AGENTS.md`, `README.md`, `frontend/README.md`, `backend/README.md`
2. If a skill path changes — update the Skill Routing table above
3. If the duplicate-skill policy applies — canonical change + mirrored copies in same PR
4. If App Router pages, redirects/guards, role access, or nav links change — update `docs/SYSTEM_PAGE_NAVIGATION_FLOWCHART.md` in the same PR so docs stay in sync with UX behavior

---

## Boundaries

The agent should **never**:

- Hardcode threshold literals in Flask endpoints — always use `config.py` and env vars
- Use `useEffect` for initial data loading in the frontend
- Create Server Actions for data fetching (actions are for mutations only)
- Introduce custom CSS gradients/shadows that bypass DaisyUI
- Use the word "cluster" in any user-facing string
- Make absolute medical claims in UI copy

### Database Operations & Backup Reminders

When asked to perform **destructive database operations** (seeding, clearing, schema migrations, running `seed-realistic.js`, `clear-patients.js`, or Prisma migrations), the agent **MUST**:

- **Remind the developer** to create a backup first using `npm run db:backup`
- **Reference the backup documentation**: `docs/SEEDING_AND_BACKUP.md`
- **NOT automatically run backup commands** (avoids redundant files and unexpected behavior)

This gives developers control over when backups are created and prevents redundant backup files from multiple developers.

### Schema Change & Backup Sync

When the **Prisma schema** (`frontend/prisma/schema.prisma`) is modified, the agent **MUST**:

- Review `frontend/scripts/backup-db.js` and assess if the schema modifications affect backup/restore logic
- Update the backup script if new tables, renamed fields, or removed columns require changes to the export/import process
- Verify that backup and restore still work end-to-end after schema changes

### Code Duplication Guard

The agent **MUST** actively check for and eliminate duplicated code. Before writing new code:

- Search existing files for similar logic that could be reused
- Extract repeated patterns into shared utility functions or helpers
- Never copy-paste blocks of code that already exist elsewhere
- Prefer DRY (Don't Repeat Yourself) principles across all layers

---

## Troubleshooting

| Problem                   | Solution                                                                                  |
| ------------------------- | ----------------------------------------------------------------------------------------- |
| Database connection error | Check `DATABASE_URL` in `.env.local`                                                      |
| Supabase auth failure     | Check `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`                      |
| Backend not responding    | Ensure Flask is running on `http://localhost:10000`; check `NEXT_PUBLIC_BACKEND_URL`      |
| Prisma client errors      | Run `npx prisma generate`                                                                 |
| Model confidence warnings | System uses different UI paths based on confidence/uncertainty combos — expected behavior |
| Map not rendering         | Check `NEXT_PUBLIC_MAPBOX_TOKEN` in `.env.local`                                          |
| Wrong diagnosis mode      | Verify `NEXT_PUBLIC_DIAGNOSIS_MODE` in `.env.local` (default: `adaptive`)                 |
| Migration failures        | Use `DIRECT_DATABASE_URL` or `DIRECT_URL` for migrations, not `DATABASE_URL` (pgBouncer)  |
| Secret key exposed        | `SUPABASE_SERVICE_ROLE_KEY` must never be committed to version control                    |
