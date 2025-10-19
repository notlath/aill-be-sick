FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port (Render will assign PORT via environment variable)
EXPOSE 10000

# Use only 1 worker with 1 thread to minimize memory usage
# Increase timeout for ML model inference
CMD gunicorn --bind 0.0.0.0:$PORT --workers 1 --threads 1 --timeout 300 --max-requests 100 --max-requests-jitter 10 app:app