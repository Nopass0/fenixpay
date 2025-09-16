@echo off
REM Development startup script for Voice Project (Windows)

echo Starting Voice Project in development mode...

REM Check if bun is installed
where bun >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Bun is not installed. Please install it from https://bun.sh
    exit /b 1
)

REM Check if npm is installed
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: npm is not installed. Please install Node.js
    exit /b 1
)

REM Install dependencies if needed
if not exist "backend\node_modules" (
    echo Installing backend dependencies...
    cd backend
    bun install
    cd ..
)

if not exist "frontend\node_modules" (
    echo Installing frontend dependencies...
    cd frontend
    npm install
    cd ..
)

REM Check if .env file exists in backend
if not exist "backend\.env" (
    echo Warning: No .env file found in backend. Copying from .env.example...
    copy backend\.env.example backend\.env
    echo Please update backend\.env with your database credentials
)

echo Starting backend on port 3000...
echo Starting frontend on port 3001...

REM Start both services in new windows
start "Voice Backend" cmd /k "cd backend && bun run dev"
start "Voice Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Voice Project is running!
echo    Backend: http://localhost:3000
echo    Frontend: http://localhost:3001
echo.
echo Close the terminal windows to stop the services