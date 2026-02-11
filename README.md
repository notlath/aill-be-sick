# AILL-BE-SICK — Predictive Intelligent Health Screening & Analysis System

A full-stack disease screening application combining a **Flask** backend (Monte Carlo Dropout classification, neuro-symbolic verification, SHAP explanations) with a **Next.js** frontend (TypeScript, Prisma, Supabase).

## Project Structure

```text
aill-be-sick/
├── backend/                # Flask REST API (Python)
│   ├── app/                #   Application package
│   │   ├── api/            #     Blueprints (diagnosis, cluster, surveillance)
│   │   ├── services/       #     ML classifier, verification, clustering, outbreak detection
│   │   ├── utils/          #     Helpers, database connection
│   │   ├── config.py       #     Centralised configuration & thresholds
│   │   └── evidence_keywords.py
│   ├── run.py              #   Entry point
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/               # Next.js app (TypeScript, Prisma, Supabase)
│   ├── app/                #   App Router pages & layouts
│   ├── actions/            #   Server actions
│   ├── components/         #   UI components
│   ├── prisma/             #   Schema & migrations
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

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | *(required)* |
| `FLASK_ENV` | `development` or `production` | `production` |
| `SESSION_COOKIE_SECURE` | `true` / `false` — override cookie security | auto (based on `FLASK_ENV`) |

Thresholds for symptom validation, confidence, triage levels, etc. are defined in [`app/config.py`](backend/app/config.py) and can be overridden with environment variables where noted.

### 4. Start the Server

```bash
# Development
python run.py

# Production (Gunicorn)
gunicorn -w 4 -b 0.0.0.0:8000 "app:create_app()"
```

The API will be available at **http://localhost:8000**.

### API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/diagnosis/` | Health check |
| `POST` | `/diagnosis/new` | Initial symptom classification |
| `POST` | `/diagnosis/follow-up` | Follow-up question & re-classification |
| `POST` | `/diagnosis/explain` | SHAP-based symptom attribution |
| `GET` | `/api/patient-clusters` | K-Means patient clustering |
| `GET` | `/api/patient-clusters/silhouette` | Silhouette analysis |
| `GET` | `/api/surveillance/outbreaks` | Isolation Forest outbreak detection |

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

1. **Backend** — in `backend/`: `python run.py`
2. **Frontend** — in `frontend/`: `npm run dev`
3. Open **http://localhost:3000**

### User Flows

| Role | Login | Features |
|---|---|---|
| Patient | `/login` | Symptom chat → diagnosis → history |
| Clinician | `/clinician-login` | Dashboard, patient clusters, outbreak surveillance |

---

## Troubleshooting

| Issue | Fix |
|---|---|
| Port conflict (3000/8000) | Kill existing processes or change ports |
| CORS errors | Verify `Flask-Cors` is installed; allowed origins are set in `app/__init__.py` |
| Database connection | Check `DATABASE_URL` in `.env` / `.env.local` |
| Prisma client stale | Re-run `npx prisma generate` after schema changes |
| Model loading slow | First run downloads transformer models (~500 MB); subsequent starts use cache |

---

## License

This project is for educational / thesis purposes.
