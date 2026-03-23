# AILL-BE-SICK — Predictive Intelligent Health Screening & Analysis System

A full-stack disease screening application combining a **Flask** backend (Monte Carlo Dropout classification, neuro-symbolic verification, SHAP explanations) with a **Next.js** frontend (TypeScript, Prisma, Supabase).

## Copilot Prompt-to-Task Quickstart

Use this flow when asking Copilot to implement work in this repository:

1. Start from root operational guidance:
   - `.instructions.md`
   - `.prompt.md`
   - `COPILOT_CONFIG.md`
2. For frontend tasks, also include:
   - `frontend/.instructions.md`
   - `frontend/.github/skills/medical-diagnosis-actions/SKILL.md`
   - `frontend/.github/skills/clinical-copywriting/SKILL.md`
3. For backend tasks, also include:
   - `backend/.instructions.md`
   - `backend/.github/skills/flask-diagnostic-api/SKILL.md`
4. Use one template from `.prompt.md`, then replace placeholders with the exact task.

Example starter prompt:

```text
Implement [feature] in [frontend/backend].
Follow .instructions.md + scoped .instructions.md for that folder.
Use the matching skill file and keep changes minimal.
Run targeted validation and summarize changed files + test/typecheck results.
```

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
│   ├── actions/              #   Server actions (25+ actions)
│   ├── components/           #   UI components
│   │   ├── clinicians/       #     Clinician dashboard components
│   │   ├── patient/          #     Patient interface components
│   │   ├── shared/           #     Shared components
│   │   └── ui/               #     Base UI components (shadcn/ui)
│   ├── hooks/                #   Custom React hooks
│   ├── stores/               #   Zustand state stores
│   ├── schemas/              #   Zod validation schemas
│   ├── utils/                #   Utility functions
│   ├── types/                #   TypeScript type definitions
│   ├── prisma/               #   Schema & migrations
│   └── package.json
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
| `GET`  | `/api/illness-clusters`               | Illness-based clustering               |

### Key Features

- **Monte Carlo Dropout** — uncertainty-aware classification with confidence & mutual information scores
- **Neuro-Symbolic Verification** — ontology-based concept matching to flag out-of-scope predictions
- **GradientSHAP Explanations** — token-level attribution for model transparency
- **Bilingual Support** — English and Tagalog symptom input with automatic language detection
- **Dynamic Follow-Up** — evidence-weighted question selection with deduplication and early stopping

---

## Frontend Setup

### 1. Install Dependencies

```bash
cd frontend

# Using npm
npm install

# Using bun (faster)
bun install
```

### 2. Environment Variables

Create `.env.local` in `frontend/`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DB_NAME?schema=public
```

### 3. Database & Prisma

```bash
# Using npm
npx prisma generate
npx prisma db push

# Using bun
bunx prisma generate
bunx prisma db push
```

### 4. Start Dev Server

```bash
# Using npm
npm run dev

# Using bun
bun dev
```

The frontend runs at **http://localhost:3000**.

### Key Technologies

- Next.js (App Router, TypeScript)
- Prisma ORM with PostgreSQL
- Supabase authentication & middleware
- Tailwind CSS
- Server Actions for chat/diagnosis flows

---

## Running the Full Application

1. **Backend** — in `backend/`: `python run.py` (runs on port 10000)
2. **Frontend** — in `frontend/`: `npm run dev` (runs on port 3000)
3. Open **http://localhost:3000**

### User Flows

| Role      | Login              | Features                                                                                 |
| --------- | ------------------ | ---------------------------------------------------------------------------------------- |
| Patient   | `/login`           | Symptom chat → diagnosis → history, profile management                                   |
| Clinician | `/clinician-login` | Dashboard, patient clusters, outbreak surveillance, alerts, healthcare reports, map view |

---

## Troubleshooting

| Issue                      | Fix                                                                            |
| -------------------------- | ------------------------------------------------------------------------------ |
| Port conflict (3000/10000) | Kill existing processes or change ports                                        |
| CORS errors                | Verify `Flask-Cors` is installed; allowed origins are set in `app/__init__.py` |
| Database connection        | Check `DATABASE_URL` in `.env` / `.env.local`                                  |
| Prisma client stale        | Re-run `npx prisma generate` after schema changes                              |
| Model loading slow         | First run downloads transformer models (~500 MB); subsequent starts use cache  |

---

## License

This project is for educational / thesis purposes.
