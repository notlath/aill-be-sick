# AI'll Be Sick — Backend Agent Guide

This file covers backend-specific guidance for AI-assisted development. For shared conventions (git workflow, skill routing, AI validation checklist), see the root [`AGENTS.md`](../AGENTS.md).

---

## ⚠️ MANDATORY PRE-COMPLETION CHECKLIST

**BEFORE calling `attempt_completion`, you MUST verify ALL items below.**

### Code Quality

- [ ] No hardcoded threshold literals in Flask endpoints (use `config.py`)
- [ ] Relevant `pytest` tests pass in `tests/backend/tests/`
- [ ] Endpoint failures are explicit and safe for API consumers
- [ ] No duplicated code blocks — search for repeated logic that should be extracted into shared utilities

**These checks are NOT optional. Complete them before every task completion.**

---

## Project Overview

This project is the backend for "AI'll Be Sick," a Flask-based REST API for a disease detection and surveillance system. The application analyzes user-provided symptoms to predict potential diseases. It is multilingual, supporting both English and Tagalog.

### Key Features

- **Disease Detection**: AI-powered symptom analysis for 6 diseases (Dengue, Pneumonia, Typhoid, Diarrhea, Measles, Influenza)
- **Bilingual Support**: English (BioClinical-ModernBERT) and Tagalog (RoBERTa-Tagalog) models
- **Uncertainty Quantification**: Monte Carlo Dropout for confidence/uncertainty scoring
- **Follow-up Questions**: Expected Information Gain (EIG) driven adaptive questioning
- **Neuro-Symbolic Verification**: Concept-based verification using tier classification
- **K-means Clustering**: Patient data pattern identification
- **Outbreak Surveillance**: Isolation Forest anomaly detection
- **Model Explainability**: GradientSHAP token importance scores
- **Triage System**: 3-tier severity classification

### Architecture & Tech Stack

| Layer              | Technology                                    |
| ------------------ | --------------------------------------------- |
| Framework          | Flask 3.0.3                                   |
| ML Framework       | PyTorch (torch >=2.5.0,<2.8.0)                |
| NLP Models         | transformers >=4.56.1                         |
| Explainability     | Captum 0.7.0 (GradientSHAP)                   |
| ML Utilities       | scikit-learn 1.8.0                            |
| Database           | PostgreSQL + SQLAlchemy >=2.0.0               |
| DB Driver          | psycopg2-binary 2.9.10                        |
| Production Server  | Gunicorn 23.0.0                               |
| CORS               | Flask-Cors 5.0.0                              |
| Language Detection | langdetect 1.0.9                              |
| Text Matching      | rapidfuzz 3.5.2                               |
| Config             | python-dotenv 1.0.0                           |

### Skill Files

For AI-assisted backend work, use:

- `backend/.github/skills/flask-diagnostic-api/SKILL.md` for blueprint/service/config-driven API changes.
- Root `AGENTS.md` for cross-repo operational guidance, skill routing, and AI validation checklist.

---

## Building and Running

### 1. Setup

Create and activate a Python virtual environment:

**macOS/Linux:**

```bash
python3 -m venv venv
source venv/bin/activate
```

**Windows:**

```bash
python -m venv venv
venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Environment Variables

Configure `.env` (see root `AGENTS.md` for backend env vars):

```env
FLASK_ENV=development
FRONTEND_URL=http://localhost:3000
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DB_NAME
```

Model paths and thresholds are in `app/config.py` — adjust via environment variables as needed.

### 4. Run the Server

```bash
python run.py
```

The application will be available at `http://localhost:10000`.

---

## Project Structure

```
backend/
├── app/
│   ├── __init__.py           # Flask app factory (blueprint registration, CORS, config)
│   ├── config.py             # All thresholds, tunables, model paths, keywords
│   ├── evidence_keywords.py  # Medical keyword definitions (EN + FIL)
│   ├── question_groups.py    # Follow-up question banks (EN + FIL)
│   ├── api/
│   │   ├── __init__.py
│   │   ├── diagnosis.py      # /diagnosis/* endpoints (new, explain, verify)
│   │   ├── cluster.py        # /api/patient-clusters endpoint
│   │   ├── outbreak.py       # /api/surveillance/outbreaks endpoint
│   │   ├── surveillance.py   # Surveillance endpoints
│   │   ├── user.py           # User management endpoints
│   │   └── main.py           # Main routes (health check, etc.)
│   ├── models/
│   │   ├── __init__.py
│   │   └── diagnosis_session.py  # SQLAlchemy model for diagnosis sessions
│   ├── services/
│   │   ├── __init__.py
│   │   ├── ml_service.py           # MCDClassifierWithSHAP, model inference
│   │   ├── cluster_service.py      # K-means clustering logic
│   │   ├── illness_cluster_service.py
│   │   ├── information_gain.py     # EIG calculations for follow-up questions
│   │   ├── outbreak_service.py     # Isolation Forest outbreak detection
│   │   ├── surveillance_service.py # Surveillance analytics
│   │   └── verification.py         # Diagnosis verification (neuro-symbolic)
│   └── utils/
│       ├── __init__.py
│       ├── database.py             # Database connection helpers
│       └── scoring.py              # Scoring utilities
├── requirements.txt
├── run.py                    # Entry point (Flask app initialization)
└── Dockerfile
```

---

## API Endpoints

### Diagnosis

| Method | Endpoint                    | Description                              |
| ------ | --------------------------- | ---------------------------------------- |
| POST   | `/diagnosis/new`            | Submit symptoms for diagnosis            |
| POST   | `/diagnosis/explain`        | Get SHAP-based explanation               |
| POST   | `/diagnosis/verify`         | Verify diagnosis with additional input   |

### Clustering & Surveillance

| Method | Endpoint                    | Description                              |
| ------ | --------------------------- | ---------------------------------------- |
| GET    | `/api/patient-clusters`     | K-means patient clustering               |
| GET    | `/api/surveillance/outbreaks`| Outbreak detection via Isolation Forest  |
| GET    | `/api/surveillance/*`       | Additional surveillance analytics        |

### User Management

| Method | Endpoint                    | Description                              |
| ------ | --------------------------- | ---------------------------------------- |
| *      | `/api/user/*`               | User management endpoints                |

### Main

| Method | Endpoint                    | Description                              |
| ------ | --------------------------- | ---------------------------------------- |
| GET    | `/`                         | Health check / root                      |

---

## Key Components

### ML Service (`app/services/ml_service.py`)

- `MCDClassifierWithSHAP`: Core classification with Monte Carlo Dropout uncertainty
- Loads BioClinical-ModernBERT (EN) or RoBERTa-Tagalog (FIL) based on input language
- Returns disease prediction, confidence, uncertainty, and probability distributions
- GradientSHAP integration for token-level explainability

### Configuration (`app/config.py`)

All tunables are read from this file — **never hardcode thresholds in endpoints**:

- Model paths (HuggingFace)
- Symptom validation thresholds (min confidence, max MI, min words/chars)
- Diagnosis confidence thresholds (high confidence, low uncertainty)
- Evidence-based stop criteria
- Uncertainty quantification thresholds (variance, CV, disagreement, ECE)
- Temperature scaling for calibration
- Follow-up question limits
- EIG configuration
- Triage thresholds (3-tier system)
- Medical keywords (EN + FIL)
- Three-tier concept classification (in-scope symptoms, clinical concepts, unrelated)

### Verification (`app/services/verification.py`)

- Neuro-symbolic verification using concept classification
- Tier 1: In-scope disease symptoms
- Tier 2: Clinical concepts + high-value concepts
- Tier 3: Unrelated category concepts (STI, cardiovascular, neurological, etc.)

---

## Testing

### Integration Smoke Test

Ensure the Flask application is running in a separate terminal, then:

```bash
python test_flask.py
```

This sends requests to the API's endpoints to verify they are functioning correctly.

### Pytest Tests

```bash
pytest tests/backend/tests/<test_file>.py
```

Write tests for new backend features in `tests/backend/tests/`.

---

## Development Conventions

- **API Structure**: Flask app-factory pattern. Routing in `app/__init__.py`, blueprints in `app/api/`.
- **Configuration**: All tunables in `app/config.py` — read via `current_app.config` or import directly.
- **Endpoints**: Keep routes in blueprints under `app/api/`. Keep reusable logic in `app/services/`.
- **Error Handling**: Keep endpoint failures explicit and safe for API consumers. Return structured error responses.
- **Multilingual Support**: Language detection via `langdetect`. Separate question banks and models per language.
- **Database**: SQLAlchemy models in `app/models/`. Connection via `app/utils/database.py`.

---

## Common Issues & Troubleshooting

| Problem                      | Solution                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------ |
| Model not loading            | Check model paths in `app/config.py`; ensure HuggingFace cache is accessible               |
| CORS errors                  | Verify `FRONTEND_URL` env var matches the actual frontend URL                              |
| Database connection error    | Check `DATABASE_URL` env var format                                                        |
| Low confidence predictions   | Check symptom input quality; review validation thresholds in `config.py`                   |
| Torch/CUDA issues            | Ensure torch version is compatible (>=2.5.0,<2.8.0); check CUDA availability               |
| Slow inference               | Consider batch processing; check model device placement (CPU vs GPU)                       |

---

## Database Operations & Backup Reminders

See root `AGENTS.md` for full database operations guidelines. Key points:

- **ALWAYS** remind the developer to create a backup before destructive operations
- **Reference**: `docs/SEEDING_AND_BACKUP.md`
- **NEVER** automatically run backup commands

### Code Duplication Guard

- **MUST** actively check for and eliminate duplicated code
- Search existing files for similar logic that could be reused
- Extract repeated patterns into shared utility functions or helpers
- Never copy-paste blocks of code that already exist elsewhere
- Prefer DRY (Don't Repeat Yourself) principles across all layers
