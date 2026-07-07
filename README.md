# AILL-BE-SICK — Predictive Intelligent Health Screening & Analysis System

A full-stack disease screening application combining a **Flask** backend (Monte Carlo Dropout classification, neuro-symbolic verification, SHAP explanations) with a **Next.js** frontend (TypeScript, Prisma, Supabase).

## About the Project

This thesis details the development and evaluation of **"AI’ll Be Sick,"** a responsive, web-based clinical decision support system (CDSS) designed to assist patients and frontline healthcare workers in the early diagnosis and monitoring of common infectious diseases. 

### The Problem It Solves
The project was created to address severe challenges within the Philippine healthcare system, including persistent shortages of medical professionals, overcrowded facilities, long patient waiting times, and a lack of diagnostic resources in rural communities. Furthermore, it tackles a significant hurdle in medical artificial intelligence: the "black-box" nature of deep learning models, which traditionally fail to explain their reasoning or communicate how confident they are in their predictions, making it difficult for clinicians to trust them.

### Core Technology and Target Diseases
The system uses an adaptive questionnaire that allows patients to describe their symptoms in natural language, supporting both English and Filipino (Taglish). To process these inputs, the system routes English text to **BioClinical ModernBERT** (a transformer model specialized for long clinical text) and Filipino text to **RoBERTa-Tagalog**. 

The model is trained specifically to detect six high-burden infectious diseases prioritized by the Department of Health (DOH): **Dengue, Diarrhea, Influenza, Measles, Pneumonia, and Typhoid Fever**.

### Technical Innovations (MCD and SHAP)
The defining novelty of the thesis is how it augments the language models to make them safer and more transparent for clinical use:
*   **Monte Carlo Dropout (MCD):** Instead of giving a single definitive answer, the model performs 50 stochastic forward passes to generate a distribution of predictions. This allows the system to calculate **epistemic uncertainty**, successfully distinguishing between highly confident diagnoses and ambiguous cases that require a doctor's manual review. 
*   **SHapley Additive exPlanations (SHAP):** To make the AI interpretable, the system calculates token-level feature attributions. This means the system highlights the exact words or symptoms in a patient's description that most heavily influenced the model's final diagnosis, providing a clear explanation for its decision.

### Public Health Surveillance Features
Beyond individual patient diagnosis, the application serves as a community surveillance tool for local health centers. It aggregates diagnostic data using **K-Means clustering** to group patients by spatial and temporal illness patterns, and employs **Isolation Forest** algorithms to detect statistical anomalies. This allows the dashboard to automatically alert healthcare workers to potential disease outbreaks and abnormal trends.

### Data and Final Results
To train the model while navigating strict health data privacy laws and the lack of localized electronic records, the researchers generated a dataset of 6,000 synthetic patient narratives using Google Gemini 2.5 Pro. Crucially, this data underwent strict "Human-in-the-Loop" validation by three physicians to ensure medical accuracy. 

The finalized augmented model achieved an exceptional **98.7% macro-averaged accuracy, precision, recall, and F1-score**, outperforming traditional models like BioBERT and ClinicalBERT. Furthermore, the web application prototype received "Strongly Agree" and "Agree" ratings across usability, functional suitability, performance efficiency, reliability, and security during its ISO 25010 standard evaluations by IT professionals and healthcare workers.

---

## Project Architecture & Structure

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

### Key Technologies
- **Backend:** Python, Flask, PyTorch, BioClinical ModernBERT, RoBERTa-Tagalog
- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS, DaisyUI, Lucide React
- **Database:** PostgreSQL (Prisma ORM), Supabase (Auth & Database)
- **Architecture Features:**
  - `next-safe-action` for type-safe server mutations paired with Zod schemas
  - Centralized thresholds and tunables via `backend/app/config.py`

---

## Getting Started / Installation

### Prerequisites

- **Python 3.10+** and **pip** (or [uv](https://docs.astral.sh/uv/))
- **Node.js 18+** and **npm** (or **bun**)
- **PostgreSQL** database (local or hosted, e.g. Supabase)
- **Git**

### Backend Setup

1. **Create & Activate Virtual Environment**
   ```bash
   cd backend
   # Using uv (recommended)
   uv venv && source .venv/bin/activate
   # Or using venv (Windows: .venv\Scripts\activate)
   python3 -m venv .venv && source .venv/bin/activate
   ```

2. **Install Dependencies**
   ```bash
   # Using uv (faster)
   uv pip install -r requirements.txt
   # Or using pip
   pip install -r requirements.txt
   ```

3. **Environment Variables**
   Create a `.env` file in `backend/`:
   ```env
   DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DB_NAME?schema=public
   FLASK_ENV=development
   ```

### Frontend Setup

1. **Install Dependencies**
   ```bash
   cd frontend
   bun install
   ```

2. **Environment Variables**
   Create `.env.local` in `frontend/`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:10000
   DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DB_NAME?schema=public
   ```
   > `NEXT_PUBLIC_BACKEND_URL` is normalized at runtime through `frontend/utils/backend-url.ts`.

3. **Database & Prisma**
   ```bash
   npx prisma generate
   npx prisma db push
   # Optional: seed diagnosis data
   node scripts/seed-diagnoses.js
   ```

---

## Running the Full Application

1. **Backend** — in `backend/`: 
   ```bash
   python run.py
   ```
   The API will be available at **http://localhost:10000**.
2. **Frontend** — in `frontend/`: 
   ```bash
   bun dev
   ```
   The frontend runs at **http://localhost:3000**.
3. Open **http://localhost:3000** in your browser.

### User Flows

| Role      | Login              | Features                                                                                              |
| --------- | ------------------ | ----------------------------------------------------------------------------------------------------- |
| Patient   | `/login`           | Symptom chat → diagnosis → BMI & temperature input → history, profile management                     |
| Clinician | `/clinician-login` | Dashboard, patient groups, outbreak surveillance, diagnosis override, alerts, healthcare reports, map |

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

## AI-Assisted Development

For AI-assisted work in this repository, the single source of truth is `AGENTS.md` (root). Sub-directories have their own scoped files — prefer `frontend/AGENTS.md` or `backend/AGENTS.md` for in-directory work.

Skill files for targeted tasks:

| Task type | Skill file |
|-----------|------------|
| Diagnosis server actions, Zod schemas | `frontend/.github/skills/medical-diagnosis-actions/SKILL.md` |
| Patient/clinician-facing copy | `frontend/.github/skills/clinical-copywriting/SKILL.md` |
| Flask endpoints & config-driven API | `backend/.github/skills/flask-diagnostic-api/SKILL.md` |
| D3 charts, map visualizations | `frontend/.github/skills/d3-viz/SKILL.md` |

---

## License

This project is for educational / thesis purposes.
