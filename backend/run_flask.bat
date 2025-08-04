@echo off
echo Starting Flask application...
echo.
echo The server will be available at: http://localhost:8000
echo.
echo Available endpoints:
echo   GET  /classifications/     - Health check
echo   POST /classifications/new  - Disease detection
echo.
echo Press Ctrl+C to stop the server
echo.
python app.py
