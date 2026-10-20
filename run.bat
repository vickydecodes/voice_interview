@echo off
setlocal enabledelayedexpansion

:: -------------------------------------------------------------
:: AI Interview Simulator - Windows Setup & Launcher
:: -------------------------------------------------------------

set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

set "CHECK_ONLY=0"
if "%~1"=="--check" set "CHECK_ONLY=1"
if "%~1"=="-c" set "CHECK_ONLY=1"

echo ================================================================
echo           AI INTERVIEW SIMULATOR - LAUNCHER
echo ================================================================
echo.

:: -------------------------------------------------------------
:: Step 1: Prerequisite Checks
:: -------------------------------------------------------------

:: 1.1 Python 3.11+ (try py -3 then python)
set "PYTHON_CMD="
set "PY_VER="

where py >nul 2>&1
if !errorlevel! equ 0 (
    for %%c in ("py -3.12" "py -3.11" "py -3") do (
        if "!PYTHON_CMD!"=="" (
            for /f "tokens=*" %%v in ('%%~c scripts\checker.py python_version 2^>nul') do (
                set "PY_VER=%%v"
                set "PYTHON_CMD=%%~c"
            )
        )
    )
)

if "!PYTHON_CMD!"=="" (
    where python >nul 2>&1
    if !errorlevel! equ 0 (
        for /f "tokens=*" %%v in ('python scripts\checker.py python_version 2^>nul') do (
            set "PY_VER=%%v"
            set "PYTHON_CMD=python"
        )
    )
)

if "!PYTHON_CMD!"=="" (
    echo [ERROR] Python 3.11+ was not found or is too old!
    echo Please install Python 3.11 or newer from: https://www.python.org/downloads/
    exit /b 1
)

echo [1/7] Checking Python... OK (!PY_VER!)

:: 1.2 Node.js 18+ and npm
for /f "tokens=*" %%v in ('!PYTHON_CMD! scripts\checker.py check_node 2^>nul') do set "NODE_NPM_VER=%%v"
!PYTHON_CMD! scripts\checker.py check_node >nul 2>&1
if !errorlevel! neq 0 (
    !PYTHON_CMD! scripts\checker.py check_node
    exit /b 1
)
echo [1/7] Checking Node.js and npm... OK (!NODE_NPM_VER!)

:: 1.3 MongoDB Reachable Check
for /f "tokens=*" %%m in ('!PYTHON_CMD! scripts\checker.py check_mongo 2^>nul') do set "MONGO_STATUS=%%m"
!PYTHON_CMD! scripts\checker.py check_mongo >nul 2>&1
if !errorlevel! neq 0 (
    !PYTHON_CMD! scripts\checker.py check_mongo
    exit /b 1
)
echo [1/7] Checking MongoDB connection... !MONGO_STATUS!

:: -------------------------------------------------------------
:: Step 2: Environment Files (.env)
:: -------------------------------------------------------------
echo [2/7] Checking environment files...
!PYTHON_CMD! scripts\checker.py check_env >nul 2>&1
if !errorlevel! neq 0 (
    !PYTHON_CMD! scripts\checker.py check_env
    exit /b 1
)
echo [2/7] Checking environment files... OK (.env configured)

:: Check-Only Flag
if "%CHECK_ONLY%"=="1" (
    echo.
    echo ================================================================
    echo [CHECK PASSED] All prerequisites, environment files, and MongoDB
    echo connection checks passed successfully^^!
    echo ================================================================
    exit /b 0
)

:: -------------------------------------------------------------
:: Step 3: Backend Setup (backend/.venv)
:: -------------------------------------------------------------
echo [3/7] Setting up backend environment...

if not exist "backend\.venv\Scripts\python.exe" (
    echo       Creating Python virtual environment in backend\.venv...
    !PYTHON_CMD! -m venv "backend\.venv"
    if !errorlevel! neq 0 (
        echo [ERROR] Failed to create virtual environment in backend\.venv.
        exit /b 1
    )
)

set "VENV_PYTHON=%ROOT_DIR%backend\.venv\Scripts\python.exe"
set "VENV_ACTIVATE=%ROOT_DIR%backend\.venv\Scripts\activate.bat"

for /f "tokens=*" %%s in ('!PYTHON_CMD! scripts\checker.py backend_status') do set "BE_STATUS=%%s"

if "!BE_STATUS!"=="NEEDS_INSTALL" (
    echo       Activating virtualenv and installing backend requirements...
    call "!VENV_ACTIVATE!"
    python -m pip install --upgrade pip --quiet
    if !errorlevel! neq 0 (
        echo [ERROR] Failed to upgrade pip.
        call deactivate 2>nul
        exit /b 1
    )
    python -m pip install -r "%ROOT_DIR%backend\requirements.txt" --quiet
    if !errorlevel! neq 0 (
        echo [ERROR] Failed to install backend requirements.
        call deactivate 2>nul
        exit /b 1
    )
    call deactivate 2>nul
    !PYTHON_CMD! scripts\checker.py touch_backend_marker >nul 2>&1
    echo [3/7] Setting up backend environment... OK (installed)
) else (
    echo [3/7] Setting up backend environment... OK (dependencies up to date, skipping install)
)

:: -------------------------------------------------------------
:: Step 4: Frontend Setup (npm install in /frontend)
:: -------------------------------------------------------------
echo [4/7] Setting up frontend dependencies...

for /f "tokens=*" %%s in ('!PYTHON_CMD! scripts\checker.py frontend_status') do set "FE_STATUS=%%s"

if "!FE_STATUS!"=="NEEDS_INSTALL" (
    echo       Installing frontend packages in /frontend...
    pushd "%ROOT_DIR%frontend"
    call npm install --silent
    if !errorlevel! neq 0 (
        echo [ERROR] npm install failed in /frontend.
        popd
        exit /b 1
    )
    popd
    !PYTHON_CMD! scripts\checker.py touch_frontend_marker >nul 2>&1
    echo [4/7] Setting up frontend dependencies... OK (installed)
) else (
    echo [4/7] Setting up frontend dependencies... OK (node_modules up to date, skipping install)
)

:: -------------------------------------------------------------
:: Step 5: Port Checks (8000 & 5173)
:: -------------------------------------------------------------
echo [5/7] Checking network ports (8000, 5173)...
!PYTHON_CMD! scripts\checker.py check_ports
if !errorlevel! neq 0 (
    exit /b 1
)
echo [5/7] Checking network ports (8000, 5173)... OK (both free)

:: -------------------------------------------------------------
:: Step 6: Start Both Servers
:: -------------------------------------------------------------
echo [6/7] Starting application servers...
echo       Starting backend API on port 8000...
start "AI Interview Simulator - Backend" cmd /k "cd /d ""%ROOT_DIR%backend"" && call .venv\Scripts\activate.bat && python -m uvicorn app.main:app --reload --port 8000"

:: -------------------------------------------------------------
:: Step 7: Health Wait (poll /health up to 20 seconds)
:: -------------------------------------------------------------
echo [7/7] Waiting for backend health check (http://localhost:8000/health)...
!PYTHON_CMD! scripts\checker.py poll_health
if !errorlevel! neq 0 (
    echo [ERROR] Backend failed to start or did not become healthy within 20s.
    exit /b 1
)
echo [7/7] Backend health check passed^^! OK

echo       Starting frontend development server on port 5173...
start "AI Interview Simulator - Frontend" cmd /k "cd /d ""%ROOT_DIR%frontend"" && npm run dev"

echo.
echo ================================================================
echo           AI INTERVIEW SIMULATOR READY^^!
echo ================================================================
echo   Frontend Web App:  http://localhost:5173
echo   Backend API Docs:  http://localhost:8000/docs
echo ================================================================
echo.
