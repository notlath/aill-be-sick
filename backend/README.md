# Aill-Be-Sick Backend (Django)

This is the Django REST API backend for the Aill-Be-Sick disease detection system. It provides endpoints for symptom analysis and disease prediction, serving as the machine learning and data processing layer for the application.

## Features

- **Disease Detection API**: Process symptoms and return disease predictions
- **REST API**: JSON-based API endpoints for frontend integration
- **Django Admin**: Administrative interface for data management
- **SQLite Database**: Lightweight database for development
- **CSRF Protection**: Configurable CSRF protection for API endpoints

## Tech Stack

- **Framework**: Django 5.2
- **Database**: SQLite3 (development)
- **API**: Django REST Framework patterns
- **Python**: 3.8+
- **Admin Interface**: Django Admin

## Prerequisites

Before running this application, make sure you have:

- Python 3.8+ installed
- pip (Python package installer)
- Virtual environment support (recommended)

## Project Structure

```
backend/
├── manage.py                 # Django management utility
├── db.sqlite3               # SQLite database file
├── abs/                     # Main project directory
│   ├── __init__.py
│   ├── settings.py          # Django settings configuration
│   ├── urls.py              # Main URL routing
│   ├── wsgi.py              # WSGI application
│   └── asgi.py              # ASGI application
└── classifications/         # Disease classification app
    ├── __init__.py
    ├── admin.py             # Admin interface configuration
    ├── apps.py              # App configuration
    ├── models.py            # Database models
    ├── views.py             # API views and logic
    ├── urls.py              # App-specific URL routing
    ├── tests.py             # Unit tests
    └── migrations/          # Database migrations
        └── __init__.py
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
pip install django
pip install djangorestframework  # Optional: for advanced REST features
```

### 4. Environment Configuration

The backend uses Django's default settings. For production, create a `.env` file:

```env
SECRET_KEY=your_secret_key_here
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1
```

### 5. Database Setup

Run migrations to set up the SQLite database:

```bash
python manage.py makemigrations
python manage.py migrate
```

### 6. Create Superuser (Optional)

To access the Django admin interface:

```bash
python manage.py createsuperuser
```

### 7. Start Development Server

```bash
python manage.py runserver
```

The Django backend will be available at `http://localhost:8000`

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
- **Error Response**:
  ```json
  {
    "error": "Method not allowed"
  }
  ```
- **Error Status**: 405 Method Not Allowed

### Admin Interface

#### GET `/admin/`

- **Description**: Django admin interface
- **Access**: Requires superuser credentials
- **Features**:
  - User management
  - Database inspection
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
2. Load trained models in the view
3. Process symptoms through the model
4. Return predictions

### Database Models

Currently, the backend uses Django's default models. To add custom models for storing predictions, symptoms, or user data:

```python
# classifications/models.py
from django.db import models

class Symptom(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField()

class Disease(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField()

class Prediction(models.Model):
    symptoms = models.JSONField()
    predicted_disease = models.CharField(max_length=100)
    confidence = models.FloatField()
    timestamp = models.DateTimeField(auto_now_add=True)
```

## Configuration

### Settings Overview

Key configuration options in `abs/settings.py`:

- **DEBUG**: Set to `False` in production
- **ALLOWED_HOSTS**: Configure for production domains
- **DATABASE**: SQLite for development, PostgreSQL/MySQL for production
- **SECRET_KEY**: Change for production deployment

### CORS Configuration

For frontend integration, you may need to install and configure CORS:

```bash
pip install django-cors-headers
```

Add to `settings.py`:

```python
INSTALLED_APPS = [
    'corsheaders',
    # ... other apps
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    # ... other middleware
]

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",  # Next.js frontend
]
```

## Testing

### Running Tests

```bash
python manage.py test
```

### Adding Tests

Add test cases in `classifications/tests.py`:

```python
from django.test import TestCase, Client
import json

class ClassificationAPITest(TestCase):
    def setUp(self):
        self.client = Client()

    def test_new_case_endpoint(self):
        response = self.client.post('/classifications/new',
                                  json.dumps({"symptoms": ["fever", "cough"]}),
                                  content_type='application/json')
        self.assertEqual(response.status_code, 201)
```

## Deployment

### Production Considerations

1. **Environment Variables**: Use environment variables for sensitive settings
2. **Database**: Switch to PostgreSQL or MySQL for production
3. **Static Files**: Configure static file serving
4. **Security**: Update `SECRET_KEY`, disable `DEBUG`, configure `ALLOWED_HOSTS`
5. **WSGI/ASGI**: Use production WSGI server like Gunicorn

### Example Production Settings

```python
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get('SECRET_KEY')
DEBUG = os.environ.get('DEBUG', 'False').lower() == 'true'
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '').split(',')

# Production database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME'),
        'USER': os.environ.get('DB_USER'),
        'PASSWORD': os.environ.get('DB_PASSWORD'),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '5432'),
    }
}
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

1. **Port already in use**: Change port with `python manage.py runserver 8001`
2. **Migration errors**: Delete `db.sqlite3` and run migrations again
3. **Import errors**: Ensure virtual environment is activated
4. **CSRF errors**: Use `@csrf_exempt` decorator for API endpoints

### Debug Mode

Enable detailed error messages by setting `DEBUG = True` in `settings.py`:

```python
DEBUG = True
```

### Logging

Add logging configuration for debugging:

```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
        },
    },
}
```

## Frontend Integration

This backend is designed to work with the Next.js frontend. The frontend makes requests to:

- `POST /classifications/new` for disease detection
- Data flows: Frontend symptoms → Backend ML processing → Frontend results display

## Future Enhancements

1. **Machine Learning Models**: Integrate actual ML models for disease prediction
2. **User Authentication**: Add user management and authentication
3. **Data Persistence**: Store predictions and user history
4. **Advanced Analytics**: Add analytics and reporting features
5. **API Documentation**: Implement Swagger/OpenAPI documentation
6. **Rate Limiting**: Add API rate limiting for production use
7. **Caching**: Implement Redis caching for improved performance

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

This project is for educational/thesis purposes.
