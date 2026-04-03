# Aill-Be-Sick Backend (Flask)

This is the Flask REST API backend for the Aill-Be-Sick disease detection system. It provides endpoints for symptom analysis, disease prediction, patient clustering, and outbreak surveillance.

## Copilot Quickstart

For AI-assisted backend implementation, use this order:

1. Read root guidance:

- `../.instructions.md`
- `../.prompt.md`
- `../COPILOT_CONFIG.md`

2. Apply backend overlay:

- `./.instructions.md`

3. Use backend skill:

- `./.github/skills/flask-diagnostic-api/SKILL.md`

Starter prompt:

```text
Implement [feature] in backend.
Follow ../.instructions.md + ./.instructions.md.
Use ./.github/skills/flask-diagnostic-api/SKILL.md patterns.
Keep route logic in app/api and reusable logic in app/services.
Run targeted pytest files and summarize changed files + test results.
```

## Features

- **Disease Detection API**: Monte Carlo Dropout classification with uncertainty quantification
- **Neuro-Symbolic Verification**: Ontology-based concept matching to validate predictions
- **Model Explainability**: GradientSHAP token-level attribution for transparency
- **Bilingual Support**: English (BioClinical-ModernBERT) and Tagalog (RoBERTa-Tagalog) models
- **Dynamic Follow-Up**: Evidence-weighted question selection with deduplication
- **Patient Clustering**: K-Means clustering with silhouette analysis
- **Outbreak Surveillance**: Isolation Forest anomaly detection for outbreak identification
- **REST API**: JSON-based endpoints with CORS support

## Tech Stack

- **Framework**: Flask 3.0 with Flask-CORS
- **ML/AI**: PyTorch, Hugging Face Transformers, SHAP
- **Clustering**: scikit-learn (K-Means, Isolation Forest)
- **Database**: PostgreSQL via Supabase
- **Server**: Gunicorn for production
- **Python**: 3.10+

## Prerequisites

- Python 3.10+ installed
- pip or [uv](https://docs.astral.sh/uv/) (recommended)
- PostgreSQL database (via Supabase)
- Virtual environment support

## Project Structure

```
backend/
├── app/                          # Application package
│   ├── __init__.py               # App factory & configuration
│   ├── config.py                 # Centralized configuration & thresholds
│   ├── evidence_keywords.py      # Evidence extraction keywords
│   ├── api/                      # Flask blueprints
│   │   ├── main.py               # Health check endpoints
│   │   ├── diagnosis.py          # Diagnosis endpoints
│   │   ├── cluster.py            # Patient clustering endpoints
│   │   ├── surveillance.py       # Surveillance endpoints
│   │   └── outbreak.py           # Outbreak detection endpoints
│   ├── services/                 # Business logic
│   │   ├── ml_service.py         # ML classifier with MCD & SHAP
│   │   ├── verification.py       # Neuro-symbolic verification layer
│   │   ├── cluster_service.py    # K-Means clustering
│   │   ├── illness_cluster_service.py  # Illness-based clustering
│   │   ├── surveillance_service.py     # Surveillance logic
│   │   ├── outbreak_service.py   # Isolation Forest outbreak detection
│   │   └── information_gain.py   # Question selection algorithm
│   ├── models/                   # Data models
│   │   └── diagnosis_session.py  # Session state management
│   └── utils/                    # Utilities
│       ├── database.py           # Database connection
│       └── scoring.py            # Scoring utilities
├── run.py                        # Entry point
├── question_bank.json            # English question bank
├── question_bank_tagalog.json    # Tagalog question bank
├── requirements.txt              # Python dependencies
├── Dockerfile                    # Container configuration
├── railway.json                  # Railway deployment config
└── render.yaml                   # Render deployment config
```

## Installation & Setup

### 1. Navigate to Backend Directory

```bash
cd backend
```

### 2. Create Virtual Environment

**Using uv (recommended):**

```bash
uv venv && source .venv/bin/activate
```

**Using venv:**

```bash
# macOS/Linux
python3 -m venv .venv && source .venv/bin/activate

# Windows
python -m venv .venv
.venv\Scripts\activate
```

### 3. Install Dependencies

```bash
# Using pip
pip install -r requirements.txt

# Using uv (faster)
uv pip install -r requirements.txt
```

### 4. Environment Variables

Create a `.env` file in `backend/`:

| Variable                | Description                   | Default                     |
| ----------------------- | ----------------------------- | --------------------------- |
| `DATABASE_URL`          | PostgreSQL connection string  | _(required)_                |
| `PORT`                  | Server port                   | `10000`                     |
| `FLASK_DEBUG`           | Enable debug mode             | `False`                     |
| `FLASK_SECRET_KEY`      | Session secret key            | _(auto-generated)_          |
| `FLASK_ENV`             | `development` or `production` | `production`                |
| `SESSION_COOKIE_SECURE` | Cookie security               | auto (based on `FLASK_ENV`) |
| `FRONTEND_URL`          | Allowed CORS origin           | `http://localhost:3000`     |

### 5. Start Development Server

```bash
python run.py
```

The API will be available at **http://localhost:10000**.

### Production Deployment

```bash
gunicorn -w 4 -b 0.0.0.0:10000 "run:app"
```

## API Endpoints

### Diagnosis Endpoints

| Method | Path                   | Description                            |
| ------ | ---------------------- | -------------------------------------- |
| `GET`  | `/diagnosis/`          | Health check                           |
| `POST` | `/diagnosis/new`       | Initial symptom classification         |
| `POST` | `/diagnosis/follow-up` | Follow-up question & re-classification |
| `POST` | `/diagnosis/explain`   | SHAP-based symptom attribution         |

### Clustering Endpoints

| Method | Path                               | Description                |
| ------ | ---------------------------------- | -------------------------- |
| `GET`  | `/api/patient-clusters`            | K-Means patient clustering |
| `GET`  | `/api/patient-clusters/silhouette` | Silhouette score analysis  |
| `GET`  | `/api/illness-clusters`            | Illness-based clustering   |

### Surveillance Endpoints

| Method | Path                                  | Description                         |
| ------ | ------------------------------------- | ----------------------------------- |
| `GET`  | `/api/surveillance/outbreaks`         | Isolation Forest outbreak detection |
| `GET`  | `/api/surveillance/outbreaks/details` | Detailed outbreak information       |

## API Usage Examples

### Initial Diagnosis

```bash
curl -X POST http://localhost:10000/diagnosis/new \
  -H "Content-Type: application/json" \
  -d '{
    "symptoms": "I have a high fever and severe headache for 3 days",
    "language": "en"
  }'
```

**Response:**

```json
{
  "disease": "DENGUE",
  "confidence": 0.85,
  "uncertainty": 0.12,
  "probabilities": {
    "DENGUE": 0.85,
    "TYPHOID": 0.08,
    "PNEUMONIA": 0.05,
  },
  "model": "BioClinical-ModernBERT",
  "session_id": "abc123",
  "follow_up_question": "Do you have any skin rashes?"
}
```

### Follow-up Question

```bash
curl -X POST http://localhost:10000/diagnosis/follow-up \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "abc123",
    "answer": "Yes, I have red spots on my arms",
    "language": "en"
  }'
```

### Get Explanation

```bash
curl -X POST http://localhost:10000/diagnosis/explain \
  -H "Content-Type: application/json" \
  -d '{
    "symptoms": "high fever and severe headache",
    "disease": "DENGUE",
    "language": "en"
  }'
```

### Patient Clustering

```bash
curl -X GET "http://localhost:10000/api/patient-clusters?n_clusters=4"
```

### Outbreak Detection

```bash
curl -X GET http://localhost:10000/api/surveillance/outbreaks
```

## Key Features Explained

### Monte Carlo Dropout (MCD)

The classifier runs multiple forward passes with dropout enabled to estimate prediction uncertainty. This provides:

- **Confidence**: Mean probability across passes
- **Uncertainty**: Variance in predictions (epistemic uncertainty)

### Neuro-Symbolic Verification

An ontology-based layer that:

- Extracts clinical concepts from input symptoms
- Validates predictions against known disease-symptom relationships
- Flags out-of-scope or inconsistent predictions

### GradientSHAP Explanations

Token-level attribution showing which words in the input contributed most to the prediction, enabling model transparency and interpretability.

### Bilingual Models

- **English**: `BioClinical-ModernBERT` - Trained on clinical text
- **Tagalog**: `RoBERTa-Tagalog` - Localized for Filipino language support

## Testing

Run the integration tests (ensure the server is running):

```bash
python test_flask.py
```

Or run the test suite:

```bash
cd tests
pytest
```

## Troubleshooting

| Issue               | Solution                                                           |
| ------------------- | ------------------------------------------------------------------ |
| Port 10000 in use   | Change port via `PORT` env variable                                |
| CORS errors         | Check `FRONTEND_URL` and allowed origins in `app/__init__.py`      |
| Model loading slow  | First run downloads ~500MB of transformer models; cached afterward |
| Database connection | Verify `DATABASE_URL` in `.env`                                    |
| Import errors       | Ensure virtual environment is activated                            |
| Out of memory       | Reduce batch size or use CPU-only mode                             |

## License

This project is for educational/thesis purposes.
