# Development Server Startup Script
# This script starts both the frontend and backend servers

Write-Host "Starting development servers..." -ForegroundColor Green

# Function to start frontend
function Start-Frontend {
    Write-Host "`nStarting Frontend..." -ForegroundColor Cyan
    Set-Location -Path "$PSScriptRoot\frontend"
    
    # Check if bun is installed
    $bunInstalled = $null -ne (Get-Command bun -ErrorAction SilentlyContinue)
    
    if ($bunInstalled) {
        Write-Host "Using bun for frontend..." -ForegroundColor Yellow
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; bun dev"
    } else {
        Write-Host "Bun not found. Using npm for frontend..." -ForegroundColor Yellow
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev"
    }
}

# Function to start backend
function Start-Backend {
    Write-Host "`nStarting Backend..." -ForegroundColor Cyan
    Set-Location -Path "$PSScriptRoot\backend"
    
    # Check if venv exists
    if (Test-Path "$PSScriptRoot\backend\venv\Scripts\activate.ps1") {
        Write-Host "Activating virtual environment and starting Flask server..." -ForegroundColor Yellow
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; .\venv\Scripts\activate.ps1; python app.py"
    } else {
        Write-Host "Virtual environment not found at backend\venv\Scripts\activate.ps1" -ForegroundColor Red
        Write-Host "Please create a virtual environment first." -ForegroundColor Red
    }
}

# Start both servers
Start-Frontend
Start-Sleep -Seconds 1
Start-Backend

Write-Host "`nBoth servers are starting in separate windows..." -ForegroundColor Green
Write-Host "Press any key to exit this script (servers will continue running)..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
