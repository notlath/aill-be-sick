# Aill-Be-Sick Backend (Flask)

This is the Flask REST API backend for the Aill-Be-Sick disease detection system. It provides endpoints for symptom analysis and disease prediction, serving as the machine learning and data processing layer for the application.

## Features

- **Disease Detection API**: Process symptoms and return disease predictions
- **REST API**: JSON-based API endpoints for frontend integration
- **CORS Support**: Cross-Origin Resource Sharing for frontend integration
- **Error Handling**: Comprehensive error handling and validation
- **Lightweight**: Minimal Flask setup for simplicity

## Tech Stack

- **Framework**: Flask 3.0
- **CORS**: Flask-CORS for frontend integration
- **Python**: 3.8+
- **Production Server**: Gunicorn (optional)

## Prerequisites

Before running this application, make sure you have:

- Python 3.8+ installed
- pip (Python package installer)
- Virtual environment support (recommended)

## Project Structure

```
backend/
├── app.py                   # Main Flask application
├── requirements-flask.txt   # Flask dependencies
├── requirements.txt         # Original Django dependencies (can be removed)
└── [Django files]          # Can be removed after migration
```

## Installation & Setup

1. **Create and activate a virtual environment** (recommended):

   ```cmd
   python -m venv venv
   venv\Scripts\activate
   ```

2. **Install Flask dependencies**:

   ```cmd
   pip install -r requirements-flask.txt
   ```

3. **Run the application**:

   ```cmd
   python app.py
   ```

   The server will start on `http://localhost:8000`

## API Endpoints

### GET /classifications/

Returns a simple greeting message.

**Response:**

```json
{
  "message": "Hello, world!"
}
```

### POST /classifications/new

Process symptoms and return disease prediction.

**Request Body:**

```json
{
  "symptoms": ["fever", "cough", "headache"]
}
```

**Response:**

```json
{
  "data": "Jabetis"
}
```

**Error Response:**

```json
{
  "error": "Error message"
}
```

## Development

- **Debug Mode**: Enabled by default in development
- **Hot Reload**: Flask automatically reloads on code changes
- **CORS**: Enabled for all origins (configure for production)

## Production Deployment

For production, use Gunicorn:

```cmd
gunicorn -w 4 -b 0.0.0.0:8000 app:app
```

## Migration from Django

This Flask application maintains the same API interface as the original Django version:

- Same endpoint URLs
- Same request/response format
- Same functionality

You can simply switch from running the Django server to running the Flask app, and your frontend should work without changes.

## Next Steps

1. **Remove Django files** after confirming Flask works
2. **Add database support** if needed (SQLAlchemy)
3. **Implement actual ML model** in the disease detection logic
4. **Add authentication** if required
5. **Configure CORS** for production domains
