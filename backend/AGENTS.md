# Agents Code Understanding

## Project Overview

This project is the backend for "Aill-Be-Sick," a Flask-based REST API for a disease detection and surveillance system. The application analyzes user-provided symptoms to predict potential diseases. It is multilingual, supporting both English and Tagalog.

The core of the application uses sophisticated machine learning models for its predictions. It leverages `torch` and Hugging Face `transformers` (specifically `BioClinical-ModernBERT` for English and `RoBERTa-Tagalog` for Tagalog) to classify symptoms into one of four diseases: Dengue, Pneumonia, Typhoid, or Impetigo. The system is designed to be robust, with logic to handle uncertainty in predictions through Monte Carlo Dropout, and it includes a follow-up question mechanism to refine diagnoses.

Beyond individual diagnosis, the system has broader public health capabilities. It includes endpoints for:
-   **K-means clustering** (`/api/patient-clusters`): To identify patterns and groupings in patient data.
-   **Outbreak Surveillance** (`/api/surveillance/outbreaks`): To detect anomalies in disease reporting using an Isolation Forest model, which could indicate a potential outbreak.
-   **Model Explainability** (`/diagnosis/explain`): To provide insights into which symptoms contributed most to a diagnosis.

The API is configured for deployment using Gunicorn and is set up for hosting platforms like Railway and Render, as indicated by `railway.json`, `render.yaml`, and the `Dockerfile`.

## Building and Running

### 1. Setup

First, create and activate a Python virtual environment.

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**macOS/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 2. Install Dependencies

Install the required Python packages using pip:
```bash
pip install -r requirements.txt
```

### 3. Running the Application

To start the development server, run the `app.py` script. The `run_flask.bat` file provides a convenient way to do this on Windows.

```bash
python app.py
```
The application will be available at `http://localhost:10000`.

## Testing

The project includes a basic integration test script. To run the tests, first make sure the Flask application is running in a separate terminal. Then, execute the test script:

```bash
python test_flask.py
```

This script sends requests to the API's endpoints to verify they are functioning correctly.

## Development Conventions

-   **API Structure:** The application follows a standard Flask structure. The main logic and all routes are defined in `app.py`.
-   **Machine Learning:** The machine learning models are loaded and managed within `app.py`. The `MCDClassifierWithSHAP` class encapsulates the prediction and uncertainty logic.
-   **Configuration:** Application configuration is handled through environment variables (using `python-dotenv`) for settings like the frontend URL and model thresholds.
-   **Endpoints**: The main diagnosis endpoints are under the `/diagnosis/` prefix. Additional data analysis endpoints for clustering and surveillance are under `/api/`.
-   **Multilingual Support**: The application explicitly handles English and Tagalog, loading separate question banks (`question_bank.json`, `question_bank_tagalog.json`) and using different models for each language.
