# AILL-BE-SICK — Predictive Intelligent Health Screening & Analysis System

A full-stack disease screening application combining a **Flask** backend (Monte Carlo Dropout classification, neuro-symbolic verification, SHAP explanations) with a **Next.js** frontend (TypeScript, Prisma, Supabase).

## AI-Assisted Development

For AI-assisted work in this repository, the single source of truth is `AGENTS.md` (root). Sub-directories have their own scoped files — prefer `frontend/AGENTS.md` or `backend/AGENTS.md` for in-directory work.

Skill files for targeted tasks:

| Task type | Skill file |
|-----------|------------|
| Diagnosis server actions, Zod schemas | `frontend/.github/skills/medical-diagnosis-actions/SKILL.md` |
| Patient/clinician-facing copy | `frontend/.github/skills/clinical-copywriting/SKILL.md` |
| Flask endpoints & config-driven API | `backend/.github/skills/flask-diagnostic-api/SKILL.md` |
| D3 charts, map visualizations | `frontend/.github/skills/d3-viz/SKILL.md` |

## Project Structure

```text
aill-be-sick/
├── backend/                  # Flask REST API (Python)
│   ├── app/                  #   Application package
│   │   ├── api/              #     Blueprints (diagnosis, cluster, surveillance, outbreak)
│   │   ├── services/         #     ML classifier, verification, clustering, outbreak detection
│   │   ├── models/           #     Data models (diagnosis session)
│   │   ├── utils/            #     Helpers, database connection, scoring
│   │   ├── config.py         #     Centralised configuration & thresholds
│   │   └── evidence_keywords.py
│   ├── run.py                #   Entry point
│   ├── question_bank.json    #   English question bank
│   ├── question_bank_tagalog.json  # Tagalog question bank
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                 # Next.js app (TypeScript, Prisma, Supabase)
│   ├── app/                  #   App Router pages & layouts
│   │   ├── (app)/            #     Protected app routes (clinician & patient)
│   │   └── (auth)/           #     Authentication pages
│   ├── actions/              #   Server actions (mutations via next-safe-action)
│   ├── components/           #   UI components
│   │   ├── clinicians/       #     Clinician dashboard components
│   │   ├── patient/          #     Patient interface components
│   │   ├── shared/           #     Shared components
│   │   └── ui/               #     Base UI components
│   ├── constants/            #   Static data (disease definitions, census data)
│   ├── documentations/       #   Feature write-ups and PR notes
│   ├── hooks/                #   Custom React hooks
│   ├── stores/               #   Zustand state stores
│   ├── schemas/              #   Zod validation schemas
│   ├── utils/                #   Utility functions (data fetching, backend URL resolver)
│   ├── types/                #   TypeScript type definitions
│   ├── prisma/               #   Schema & migrations
│   └── package.json
├── docs/                     # Project-level manuals, research, and QA guides
├── notebooks/                # Jupyter notebooks for data analysis & model experiments
└── README.md
```

## Prerequisites

- **Python 3.10+** and **pip** (or [uv](https://docs.astral.sh/uv/))
- **Node.js 18+** and **npm** (or **bun**)
- **PostgreSQL** database (local or hosted, e.g. Supabase)
- **Git**

---

## Backend Setup

### 1. Create & Activate Virtual Environment

```bash
cd backend

# Using uv (recommended)
uv venv && source .venv/bin/activate

# Or using venv
python3 -m venv .venv && source .venv/bin/activate
```

> **Windows:** use `.venv\Scripts\activate` instead.

### 2. Install Dependencies

```bash
# Using pip
pip install -r requirements.txt

# Using uv (faster)
uv pip install -r requirements.txt
```

### 3. Environment Variables

Create a `.env` file in `backend/` (or set these in your shell):

| Variable                | Description                                 | Default                     |
| ----------------------- | ------------------------------------------- | --------------------------- |
| `DATABASE_URL`          | PostgreSQL connection string                | _(required)_                |
| `FLASK_ENV`             | `development` or `production`               | `production`                |
| `SESSION_COOKIE_SECURE` | `true` / `false` — override cookie security | auto (based on `FLASK_ENV`) |

Thresholds for symptom validation, confidence, triage levels, etc. are defined in [`app/config.py`](backend/app/config.py) and can be overridden with environment variables where noted.

### 4. Start the Server

```bash
# Development
python run.py

# Production (Gunicorn)
gunicorn -w 4 -b 0.0.0.0:10000 "run:app"
```

The API will be available at **http://localhost:10000**.

### API Endpoints

| Method | Path                                  | Description                            |
| ------ | ------------------------------------- | -------------------------------------- |
| `GET`  | `/diagnosis/`                         | Health check                           |
| `POST` | `/diagnosis/new`                      | Initial symptom classification         |
| `POST` | `/diagnosis/follow-up`                | Follow-up question & re-classification |
| `POST` | `/diagnosis/explain`                  | SHAP-based symptom attribution         |
| `GET`  | `/api/patient-clusters`               | K-Means patient clustering             |
| `GET`  | `/api/patient-clusters/silhouette`    | Silhouette analysis                    |
| `GET`  | `/api/surveillance/outbreaks`         | Isolation Forest outbreak detection    |
| `GET`  | `/api/surveillance/outbreaks/details` | Detailed outbreak information          |
| `GET`  | `/api/illness-clusters`              | Illness-based clustering               |

### Key Features

- **Monte Carlo Dropout** — uncertainty-aware classification with confidence & mutual information scores
- **Neuro-Symbolic Verification** — ontology-based concept matching to flag out-of-scope predictions
- **GradientSHAP Explanations** — token-level attribution for model transparency
- **Bilingual Support** — English and Tagalog symptom input with automatic language detection
- **Dynamic Follow-Up** — evidence-weighted question selection with deduplication and early stopping

**Supported diseases:** Dengue, Pneumonia, Typhoid, Diarrhea, Measles, Influenza

---

## Frontend Setup

### 1. Install Dependencies

```bash
cd frontend

# Using bun (recommended)
bun install

# Or using npm
npm install
```

### 2. Environment Variables

Create `.env.local` in `frontend/`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:10000
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DB_NAME?schema=public
```

> `NEXT_PUBLIC_BACKEND_URL` is normalized at runtime through `frontend/utils/backend-url.ts` to ensure consistent localhost resolution across environments.

### 3. Database & Prisma

```bash
npx prisma generate
npx prisma db push

# Optional: seed diagnosis data
node scripts/seed-diagnoses.js
```

### 4. Start Dev Server

```bash
bun dev       # preferred
npm run dev   # alternative
```

The frontend runs at **http://localhost:3000**.

### Key Technologies

- Next.js 15 (App Router, TypeScript)
- Prisma ORM with PostgreSQL
- Supabase authentication & middleware
- Tailwind CSS + DaisyUI component library
- `next-safe-action` for type-safe server mutations paired with Zod schemas
- Lucide React for icons

---

## Running the Full Application

1. **Backend** — in `backend/`: `python run.py` (runs on port 10000)
2. **Frontend** — in `frontend/`: `bun dev` (runs on port 3000)
3. Open **http://localhost:3000**

### User Flows

| Role      | Login              | Features                                                                                              |
| --------- | ------------------ | ----------------------------------------------------------------------------------------------------- |
| Patient   | `/login`           | Symptom chat → diagnosis → BMI & temperature input → history, profile management                     |
| Clinician | `/clinician-login` | Dashboard, patient groups, outbreak surveillance, diagnosis override, alerts, healthcare reports, map |

### Notable Features (Recent)

- **Clinician Diagnosis Override** — clinicians can override AI assessments with a full audit trail preserving the original AI prediction, confidence, and uncertainty scores
- **BMI & Temperature Tracking** — patients can optionally log height/weight (BMI) and temperature during a session; BMI advice is generated via AI and cached against the diagnosis record
- **Endemic Disease Tracking** — dashboard surfaces endemic disease summaries and badges for regional patterns
- **AI Insights Explanation** — extended SHAP-based token explanations surfaced in the Insights modal

---

## Troubleshooting

| Issue                      | Fix                                                                            |
| -------------------------- | ------------------------------------------------------------------------------ |
| Port conflict (3000/10000) | Kill existing processes or change ports                                        |
| CORS errors                | Verify `Flask-Cors` is installed; allowed origins are set in `app/__init__.py` |
| Database connection        | Check `DATABASE_URL` in `.env` / `.env.local`                                  |
| Prisma client stale        | Re-run `npx prisma generate` after schema changes                              |
| Model loading slow         | First run downloads transformer models (~500 MB); subsequent starts use cache  |
| Supabase auth failure      | Check `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`          |

---

## License

This project is for educational / thesis purposes.
