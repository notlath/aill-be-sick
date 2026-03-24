# AI'll Be Sick — Agent Guide

This file is the single source of truth for AI-assisted development on this project. It covers architecture, conventions, commands, skill routing, and guardrails.

> Sub-directories have their own scoped `AGENTS.md` files (`frontend/AGENTS.md`, `backend/AGENTS.md`). Always prefer those for in-directory work; use this file for cross-repo context.

---

## Project Overview

AI'll Be Sick is a full-stack disease detection application. Users submit symptoms and receive AI-powered disease predictions. The system supports both English and Tagalog, serves patient and clinician roles, and includes epidemiological surveillance features.

- **`backend/`** — Flask REST API. Processes symptoms, runs ML inference, and returns predictions.
- **`frontend/`** — Next.js App Router UI. Patient diagnosis flow, clinician dashboard, maps, alerts.
- **`notebooks/`** — Jupyter notebooks for data analysis and model experimentation.
- **`docs/`** — User manuals, technical reports, and research notes.

### Architecture

| Layer | Technology |
|-------|-----------|
| Backend API | Python, Flask (port `10000`) |
| ML Models | BioClinical-ModernBERT (EN), RoBERTa-Tagalog (FIL) |
| Frontend | TypeScript, Next.js 15 App Router |
| Database | PostgreSQL + Prisma ORM |
| Auth | Supabase Auth |
| Styling | Tailwind CSS + DaisyUI |
| Icons | Lucide React |

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
pytest backend/tests/<test_file>.py
python test_flask.py   # Integration smoke test (requires server running)
```

### Frontend (Next.js)

```bash
# From /frontend
bun install

# Configure .env.local:
# NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
# NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:10000   ← backend URL (includes localhost normalization in frontend/utils/backend-url.ts)
# DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DB_NAME?schema=public

npx prisma generate && npx prisma db push
bun dev                                              # Runs on http://localhost:3000
```

**Available scripts:**
```bash
bun run build          # Production build
bun run start          # Production server
bun run lint           # Next.js linting
npx tsc --noEmit       # TypeScript type check (run before committing)
node scripts/seed-diagnoses.js   # Seed diagnosis data
```

---

## Code Style & Conventions

### General

- TypeScript for all frontend code.
- Follow conventional commit format: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`.
- Write tests for new backend features in `backend/tests/`.

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
"use server";
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

| Type | Classes |
|------|---------|
| Buttons | `btn btn-primary`, `btn-secondary`, `btn-success`, `btn-ghost`, `btn-outline` |
| Cards | `card card-body card-title card-actions` |
| Modals | `modal modal-box modal-backdrop modal-open` |
| Alerts | `alert alert-info alert-success alert-warning alert-error` |
| Badges | `badge badge-primary badge-secondary badge-outline` |
| Layout | `bg-base-100 bg-base-200 bg-base-300 text-base-content` |

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

| Task type | Skill file |
|-----------|------------|
| Diagnosis server actions, Zod schemas, diagnosis flow | `frontend/.github/skills/medical-diagnosis-actions/SKILL.md` |
| Patient/clinician-facing copy | `frontend/.github/skills/clinical-copywriting/SKILL.md` |
| Flask endpoints, services, config-driven API changes | `backend/.github/skills/flask-diagnostic-api/SKILL.md` |
| D3 charts, map visualizations | `frontend/.github/skills/d3-viz/SKILL.md` (canonical) |
| Discovering or installing new skills | `find-skills` |
| Frontend UI (polished visual design) | `frontend-design` skill (when available locally) |
| Frontend UI/UX (mobile-first) | `accessibility-compliance` → `vercel-react-best-practices` → `vercel-composition-patterns` |

### Duplicate Skill Policy

The `d3-viz` skill may have compatibility copies across tool folders (`.gemini/`, `.agent/`, `.agents/`, `.qwen/`). The canonical copy is `frontend/.github/skills/d3-viz/SKILL.md`. When updating it, mirror the exact content to all compatibility copies **in the same PR**.

---

## AI Validation Checklist

Before committing AI-generated changes, verify:

- [ ] Architecture facts are correct (Flask backend on port `10000`, Next.js App Router)
- [ ] Frontend mutations follow the schema + server-action pattern (`next-safe-action`)
- [ ] `revalidatePath` / `revalidateTag` is applied after mutations where needed
- [ ] User-facing medical text is plain-language, calm, and non-absolute
- [ ] Frontend UI changes are mobile-usable at small breakpoints
- [ ] No contradictory style guidance introduced in docs
- [ ] `npx tsc --noEmit` passes in `frontend/`
- [ ] Relevant `pytest` tests pass in `backend/tests/`

### Change Sync Checklist

When AI guidance files are updated:

1. If architecture/runtime facts change (ports, backend type, entrypoints) — update `AGENTS.md`, `frontend/AGENTS.md`, `backend/AGENTS.md`, `README.md`, `frontend/README.md`, `backend/README.md`
2. If a skill path changes — update the Skill Routing table above
3. If the duplicate-skill policy applies — canonical change + mirrored copies in same PR

---

## Boundaries

The agent should **never**:

- Hardcode threshold literals in Flask endpoints — always use `config.py` and env vars
- Use `useEffect` for initial data loading in the frontend
- Create Server Actions for data fetching (actions are for mutations only)
- Introduce custom CSS gradients/shadows that bypass DaisyUI
- Use the word "cluster" in any user-facing string
- Make absolute medical claims in UI copy

---

## Troubleshooting

| Problem | Solution |
|---------|---------|
| Database connection error | Check `DATABASE_URL` in `.env.local` |
| Supabase auth failure | Check `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Backend not responding | Ensure Flask is running on `http://localhost:10000`; check `NEXT_PUBLIC_BACKEND_URL` |
| Prisma client errors | Run `npx prisma generate` |
| Model confidence warnings | System uses different UI paths based on confidence/uncertainty combos — expected behavior |
