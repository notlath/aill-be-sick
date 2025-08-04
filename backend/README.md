# Aill-Be-Sick Backend (Flask)

This is the Flask REST API backend for the Aill-Be-Sick disease detection system. It provides endpoints for symptom analysis and disease prediction, serving as the machine learning and data processing layer for the application.

## Features

- **Disease Detection API**: Process symptoms and return disease predictions
- **REST API**: JSON-based API endpoints for frontend integration
- **CORS Support**: Cross-Origin Resource Sharing for frontend integration
- **Lightweight**: Minimal dependencies and fast startup
- **Simple Deployment**: Easy to deploy and scale

## Tech Stack

- **Framework**: Flask 3.0
- **CORS**: Flask-CORS for frontend integration
- **Python**: 3.8+
- **Server**: Gunicorn for production deployment

## Prerequisites

Before running this application, make sure you have:

- Python 3.8+ installed
- pip (Python package installer)
- Virtual environment support (recommended)

## Project Structure

```
backend/
├── app.py                   # Main Flask application
├── requirements.txt         # Python dependencies
├── run_flask.bat           # Windows batch file to run the app
├── test_flask.py           # Testing utilities
├── README.md               # This file
├── README-flask.md         # Flask-specific documentation
└── MIGRATION_GUIDE.md      # Django to Flask migration guide
```

## Installation & Setup

### 1. Navigate to Backend Directory

```bash
cd backend
```

### 2. Create Virtual Environment

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

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Start Development Server

**Option 1: Direct Python execution**

```bash
python app.py
```

**Option 2: Using the batch file (Windows only)**

```bash
run_flask.bat
```

**Option 3: Using Gunicorn (Production)**

```bash
gunicorn app:app
```

The Flask backend will be available at `http://localhost:8000`

## Testing

Run the test script to verify the API is working:

```bash
python test_flask.py
```

## API Endpoints

### Classification Endpoints

#### GET `/classifications/`

- **Description**: Test endpoint to verify API is running
- **Response**: `{"message": "Hello, world!"}`
- **Status**: 200 OK

#### POST `/classifications/new`

- **Description**: Submit symptoms for disease detection
- **Content-Type**: `application/json`
- **Request Body**:
  ```json
  {
    "symptoms": ["fever", "cough", "headache"]
  }
  ```
- **Response**:
  ```json
  {
    "data": "Detected Disease Name"
  }
  ```
- **Status**: 201 Created
- **Error Responses**:
  ```json
  {
    "error": "No JSON data provided"
  }
  ```
- **Error Status**: 400 Bad Request
  - Model administration

## Development

### Adding New Features

1. **Create new models** in `classifications/models.py`
2. **Add views** in `classifications/views.py`
3. **Configure URLs** in `classifications/urls.py`
4. **Run migrations** for database changes:
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

### Machine Learning Integration

The current implementation includes a placeholder for disease detection logic in `classifications/views.py`:

```python
# Insert machine learning stuff
detected_disease = "Jabetis"  # Placeholder for actual disease detection logic
```

To integrate actual ML models:

1. Install ML dependencies (scikit-learn, pandas, etc.)
2. Load trained models in the Flask app
3. Process symptoms through the model
4. Return predictions

### Adding Database Support

Flask doesn't include an ORM by default, but you can add one easily:

**Option 1: SQLAlchemy**

```bash
pip install flask-sqlalchemy
```

**Option 2: Simple JSON file storage**

```python
import json
from datetime import datetime

def save_prediction(symptoms, disease):
    prediction = {
        "symptoms": symptoms,
        "predicted_disease": disease,
        "timestamp": datetime.now().isoformat()
    }
    # Save to file or database
```

## Configuration

### Flask Configuration

Configure your Flask app in `app.py`:

```python
app.config['DEBUG'] = True  # Set to False in production
app.config['CORS_ORIGINS'] = ['http://localhost:3000']  # Frontend URL
```

### Environment Variables

For production, use environment variables:

```python
import os
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-key')
```

## Testing

### Running Tests

```bash
python test_flask.py
```

This will test both API endpoints and verify the Flask app is working correctly.

### Adding Tests

You can extend `test_flask.py` with additional test cases:

```python
def test_error_handling():
    """Test error responses"""
    response = requests.post(f"{base_url}/classifications/new")
    assert response.status_code == 400
```

## Deployment

### Production Considerations

1. **Environment Variables**: Use environment variables for sensitive settings
2. **WSGI Server**: Use Gunicorn for production deployment
3. **Security**: Configure proper CORS, disable debug mode
4. **Logging**: Add proper logging configuration
5. **Process Management**: Use supervisor or systemd for process management

### Production Deployment with Gunicorn

```bash
# Install gunicorn (already in requirements.txt)
pip install gunicorn

# Run with gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 app:app
```

### Example Production Configuration

```python
import os

class Config:
    DEBUG = os.environ.get('DEBUG', 'False').lower() == 'true'
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-key')

app.config.from_object(Config)
```

## API Usage Examples

### Using curl

```bash
# Test the API
curl -X GET http://localhost:8000/classifications/

# Submit symptoms for detection
curl -X POST http://localhost:8000/classifications/new \
  -H "Content-Type: application/json" \
  -d '{"symptoms": ["fever", "cough", "headache"]}'
```

### Using Python requests

```python
import requests

# Test endpoint
response = requests.get('http://localhost:8000/classifications/')
print(response.json())

# Disease detection
symptoms_data = {"symptoms": ["fever", "cough", "headache"]}
response = requests.post('http://localhost:8000/classifications/new',
                        json=symptoms_data)
print(response.json())
```

## Troubleshooting

### Common Issues

1. **Port already in use**: Change port in `app.py`: `app.run(port=8001)`
2. **CORS errors**: Verify Flask-CORS is installed and configured
3. **Import errors**: Ensure virtual environment is activated
4. **Module not found**: Install dependencies with `pip install -r requirements.txt`

### Debug Mode

Debug mode is enabled by default in `app.py`:

```python
app.run(debug=True)  # Shows detailed error messages
```

### Logging

Add logging to your Flask app:

```python
import logging
logging.basicConfig(level=logging.INFO)
app.logger.info('Flask app starting...')
```

## Frontend Integration

This backend is designed to work with the Next.js frontend. The frontend makes requests to:

- `POST /classifications/new` for disease detection
- Data flows: Frontend symptoms → Backend ML processing → Frontend results display

## Future Enhancements

1. **Machine Learning Models**: Integrate actual ML models for disease prediction
2. **Database Integration**: Add SQLAlchemy for data persistence
3. **User Authentication**: Add Flask-Login for user management
4. **API Documentation**: Implement Flask-RESTX or Swagger for API docs
5. **Rate Limiting**: Add Flask-Limiter for API rate limiting
6. **Caching**: Implement Flask-Caching for improved performance
7. **Input Validation**: Add request validation with marshmallow
8. **Error Handling**: Implement comprehensive error handling and logging

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

This project is for educational/thesis purposes.
