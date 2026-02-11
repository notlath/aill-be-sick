# ---- Build stage: install dependencies ----
FROM python:3.11-slim AS builder

WORKDIR /build

# Install build-time system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt


# ---- Runtime stage: lean production image ----
FROM python:3.11-slim

# Security: run as non-root user
RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /sbin/nologin appuser

WORKDIR /app

# Copy only the installed packages from the builder stage
COPY --from=builder /install /usr/local

# Copy application code
COPY . .

# Own app directory to the non-root user
RUN chown -R appuser:appuser /app

USER appuser

# Expose port (platforms like Render/Railway inject PORT at runtime)
EXPOSE 10000

# Healthcheck for container orchestrators
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:${PORT:-10000}/')" || exit 1

# Use Gunicorn with sensible production defaults
# - 1 worker / 1 thread to keep memory low on free tiers
# - 300s timeout for ML model inference
# - max-requests for worker recycling to prevent memory leaks
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT:-10000} --workers 1 --threads 1 --timeout 300 --max-requests 100 --max-requests-jitter 10 --access-logfile - --error-logfile - app:app"]