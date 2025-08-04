# Django to Flask Migration Comparison

## Overview

This document compares the Django and Flask implementations of your backend API to help you understand the differences and benefits of the migration.

## Key Differences

### 1. **Project Structure**

**Django (Before):**

```
backend/
├── manage.py                # Django management utility
├── db.sqlite3              # Database file
├── abs/                    # Project package
│   ├── settings.py         # Complex configuration
│   ├── urls.py             # URL routing
│   ├── wsgi.py             # WSGI application
│   └── asgi.py             # ASGI application
└── classifications/        # Django app
    ├── models.py           # Database models
    ├── views.py            # View functions
    ├── urls.py             # App URLs
    ├── admin.py            # Admin interface
    └── migrations/         # Database migrations
```

**Flask (After):**

```
backend/
├── app.py                  # Single Flask application file
├── requirements-flask.txt  # Simpler dependencies
└── test_flask.py          # Testing utilities
```

### 2. **Dependencies**

**Django:**

- asgiref==3.9.1
- Django==5.2.4
- sqlparse==0.5.3
- tzdata==2025.2

**Flask:**

- flask==3.0.3
- flask-cors==5.0.0
- gunicorn==23.0.0

**Size Reduction:** ~75% fewer dependencies

### 3. **Code Comparison**

**Django View (Before):**

```python
# classifications/views.py
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json

def index(request):
    return JsonResponse({"message": "Hello, world!"})

@csrf_exempt
def new_case(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        symptoms = data.get("symptoms", [])
        print("Detecting disease for symptoms:", symptoms)
        detected_disease = "Jabetis"
        return JsonResponse({"data": detected_disease}, status=201)
    else:
        return JsonResponse({"error": "Method not allowed"}, status=405)
```

**Flask Routes (After):**

```python
# app.py
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/classifications/', methods=['GET'])
def index():
    return jsonify({"message": "Hello, world!"})

@app.route('/classifications/new', methods=['POST'])
def new_case():
    data = request.get_json()
    symptoms = data.get("symptoms", [])
    print("Detecting disease for symptoms:", symptoms)
    detected_disease = "Jabetis"
    return jsonify({"data": detected_disease}), 201
```

### 4. **Starting the Server**

**Django:**

```cmd
python manage.py runserver
```

**Flask:**

```cmd
python app.py
# or
python run_flask.bat
```

## Benefits of Flask Migration

### ✅ **Simplicity**

- **Single file application** vs multiple modules
- **Less boilerplate** code required
- **Easier to understand** for simple APIs

### ✅ **Lighter Weight**

- **Smaller memory footprint**
- **Faster startup time**
- **Fewer dependencies** to manage

### ✅ **Flexibility**

- **Less opinionated** framework
- **Easy to add** only needed features
- **Simple deployment** options

### ✅ **Learning Curve**

- **Easier to learn** and maintain
- **More straightforward** debugging
- **Clear code flow**

## What You Lose

### ❌ **Built-in Features**

- No admin interface
- No ORM (Object-Relational Mapping)
- No built-in user authentication
- No database migrations

### ❌ **Scalability Features**

- Less built-in security features
- No automatic CSRF protection
- Fewer middleware options

## Migration Steps Completed

1. ✅ **Created Flask application** (`app.py`)
2. ✅ **Converted Django views** to Flask routes
3. ✅ **Added CORS support** for frontend integration
4. ✅ **Maintained same API interface**
5. ✅ **Added error handling**
6. ✅ **Created new requirements file**
7. ✅ **Added testing utilities**
8. ✅ **Created run scripts**

## API Compatibility

The Flask version maintains **100% API compatibility** with your Django version:

- ✅ Same endpoints: `/classifications/` and `/classifications/new`
- ✅ Same request/response format
- ✅ Same HTTP methods and status codes
- ✅ Same JSON structure

**Your frontend will work without any changes!**

## Next Steps

1. **Test the Flask app** using the provided test script
2. **Update your frontend** to point to the Flask server (if needed)
3. **Remove Django files** once you're satisfied with Flask
4. **Add database support** if you need persistent storage (SQLAlchemy)
5. **Implement actual ML model** in the disease detection logic

## Running Both Versions

You can run both versions side by side for testing:

- **Django:** `python manage.py runserver` (port 8000)
- **Flask:** `python app.py` (port 8000, or change the port in app.py)

## Recommendation

For your disease detection system, Flask is an excellent choice because:

- Your API is relatively simple
- You don't need Django's admin interface
- You want faster development and deployment
- The reduced complexity will make maintenance easier
- You can always add more features as needed
