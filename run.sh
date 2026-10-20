#!/usr/bin/env bash
set -euo pipefail

# -----------------------------------------------------------------
# AI Interview Simulator - macOS / Linux Setup & Launcher
# -----------------------------------------------------------------

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT"

CHECK_ONLY=false
for arg in "${@:-}"; do
  case "$arg" in
    --check|-c)
      CHECK_ONLY=true
      ;;
    *)
      echo "[ERROR] Unknown option: $arg"
      echo "Usage: ./run.sh [--check]"
      exit 1
      ;;
  esac
done

echo "================================================================"
echo "          AI INTERVIEW SIMULATOR - LAUNCHER"
echo "================================================================"
echo ""

# -----------------------------------------------------------------
# Step 1: Prerequisite Checks
# -----------------------------------------------------------------

# 1.1 Python 3.11+ (try python3, then python, with py launcher fallback)
PYTHON_BIN=()
for cmd in "python3" "python" "py -3.12" "py -3.11" "py -3"; do
  read -r -a candidate <<< "$cmd"
  if command -v "${candidate[0]}" >/dev/null 2>&1; then
    if "${candidate[@]}" scripts/checker.py python_version >/dev/null 2>&1; then
      PYTHON_BIN=("${candidate[@]}")
      break
    fi
  fi
done

if [ ${#PYTHON_BIN[@]} -eq 0 ]; then
  echo "[ERROR] Python 3.11+ was not found or the installed version is too old!"
  echo "Please install Python 3.11 or newer from: https://www.python.org/downloads/"
  exit 1
fi

PY_VER=$("${PYTHON_BIN[@]}" scripts/checker.py python_version)
echo "[1/7] Checking Python... OK ($PY_VER)"

# 1.2 Node.js 18+ and npm
if ! "${PYTHON_BIN[@]}" scripts/checker.py check_node >/dev/null 2>&1; then
  "${PYTHON_BIN[@]}" scripts/checker.py check_node
  exit 1
fi
NODE_NPM_VER=$("${PYTHON_BIN[@]}" scripts/checker.py check_node)
echo "[1/7] Checking Node.js and npm... OK ($NODE_NPM_VER)"

# 1.3 MongoDB Reachable Check
if ! "${PYTHON_BIN[@]}" scripts/checker.py check_mongo >/dev/null 2>&1; then
  "${PYTHON_BIN[@]}" scripts/checker.py check_mongo
  exit 1
fi
MONGO_STATUS=$("${PYTHON_BIN[@]}" scripts/checker.py check_mongo)
echo "[1/7] Checking MongoDB connection... $MONGO_STATUS"

# -----------------------------------------------------------------
# Step 2: Environment Files (.env)
# -----------------------------------------------------------------
echo "[2/7] Checking environment files..."
if ! "${PYTHON_BIN[@]}" scripts/checker.py check_env >/dev/null 2>&1; then
  "${PYTHON_BIN[@]}" scripts/checker.py check_env
  exit 1
fi
echo "[2/7] Checking environment files... OK (.env configured)"

# Check-Only Flag
if [ "$CHECK_ONLY" = true ]; then
  echo ""
  echo "================================================================"
  echo "[CHECK PASSED] All prerequisites, environment files, and MongoDB"
  echo "connection checks passed successfully!"
  echo "================================================================"
  exit 0
fi

# -----------------------------------------------------------------
# Step 3: Backend Setup (backend/.venv)
# -----------------------------------------------------------------
echo "[3/7] Setting up backend environment..."

if [ ! -f "backend/.venv/bin/python" ] && [ ! -f "backend/.venv/Scripts/python.exe" ]; then
  echo "      Creating virtual environment in backend/.venv..."
  "${PYTHON_BIN[@]}" -m venv "backend/.venv"
fi

VENV_ACTIVATE="backend/.venv/bin/activate"
if [ -f "backend/.venv/Scripts/activate" ]; then
  VENV_ACTIVATE="backend/.venv/Scripts/activate"
fi

BE_STATUS=$("${PYTHON_BIN[@]}" scripts/checker.py backend_status)

if [ "$BE_STATUS" = "NEEDS_INSTALL" ]; then
  echo "      Activating virtualenv and installing backend requirements..."
  # shellcheck source=/dev/null
  source "$VENV_ACTIVATE"
  python -m pip install --upgrade pip --quiet
  python -m pip install -r backend/requirements.txt --quiet
  deactivate || true
  "${PYTHON_BIN[@]}" scripts/checker.py touch_backend_marker >/dev/null 2>&1
  echo "[3/7] Setting up backend environment... OK (installed)"
else
  echo "[3/7] Setting up backend environment... OK (dependencies up to date, skipping install)"
fi

# -----------------------------------------------------------------
# Step 4: Frontend Setup (npm install in /frontend)
# -----------------------------------------------------------------
echo "[4/7] Setting up frontend dependencies..."

FE_STATUS=$("${PYTHON_BIN[@]}" scripts/checker.py frontend_status)

if [ "$FE_STATUS" = "NEEDS_INSTALL" ]; then
  echo "      Installing frontend packages in /frontend..."
  (cd frontend && npm install --silent)
  "${PYTHON_BIN[@]}" scripts/checker.py touch_frontend_marker >/dev/null 2>&1
  echo "[4/7] Setting up frontend dependencies... OK (installed)"
else
  echo "[4/7] Setting up frontend dependencies... OK (node_modules up to date, skipping install)"
fi

# -----------------------------------------------------------------
# Step 5: Port Checks (8000 & 5173)
# -----------------------------------------------------------------
echo "[5/7] Checking network ports (8000, 5173)..."
if ! "${PYTHON_BIN[@]}" scripts/checker.py check_ports; then
  exit 1
fi
echo "[5/7] Checking network ports (8000, 5173)... OK (both free)"

# -----------------------------------------------------------------
# Step 6: Start Both Servers
# -----------------------------------------------------------------
echo "[6/7] Starting application servers..."
echo "      Starting backend API on port 8000..."

VENV_BIN="backend/.venv/bin/python"
if [ -f "backend/.venv/Scripts/python.exe" ]; then
  VENV_BIN="backend/.venv/Scripts/python.exe"
fi

(cd backend && "$REPO_ROOT/$VENV_BIN" -m uvicorn app.main:app --reload --port 8000) &
BACKEND_PID=$!
FRONTEND_PID=""

cleanup() {
  echo ""
  echo "Shutting down servers..."
  trap - SIGINT SIGTERM EXIT
  if [ -n "${FRONTEND_PID:-}" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi
  if [ -n "${BACKEND_PID:-}" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
  exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# -----------------------------------------------------------------
# Step 7: Health Wait (poll /health up to 20 seconds)
# -----------------------------------------------------------------
echo "[7/7] Waiting for backend health check (http://localhost:8000/health)..."
if ! "${PYTHON_BIN[@]}" scripts/checker.py poll_health; then
  echo "[ERROR] Backend failed to start or did not become healthy within 20s."
  exit 1
fi
echo "[7/7] Backend health check passed! OK"

echo ""
echo "================================================================"
echo "          AI INTERVIEW SIMULATOR READY!"
echo "================================================================"
echo "  Frontend Web App:  http://localhost:5173"
echo "  Backend API Docs:  http://localhost:8000/docs"
echo "================================================================"
echo "Press Ctrl+C to terminate both servers."
echo ""

(cd frontend && npm run dev) &
FRONTEND_PID=$!
wait "$FRONTEND_PID"
