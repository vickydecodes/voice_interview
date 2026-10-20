# AI Interview Simulator

A full-stack, voice-enabled technical interview simulation platform. Built with a Python FastAPI backend, MongoDB (Motor), OpenRouter AI (LLM brain), and a modern dark-mode React frontend with Web Speech API for real-time conversational audio.

---

## 🎯 Architecture & Features

### 1. Resume Upload & Auth (Landing Page)
- **Zero-signup identity**: The candidate's resume (PDF or DOCX) is their identity.
- **Structured Parsing**: Extracts candidate text and sends it to OpenRouter to parse:
  - Full Name, Email, Phone
  - Skills List
  - Education History
  - Work Experience (Roles, Companies, Durations, Key Highlights)
  - Projects (Titles, Descriptions, Tech Stack)
  - Certifications & Executive Summary
- **MongoDB Upsert**: Creates or updates the user profile by email and issues a secure JWT bearer token.
- **Interactive UI**: Drag-and-drop file upload with animated multi-stage parsing indicators and error retry handling.

### 2. Target Companies Page
- **Pre-Seeded Catalog**: Comes with 6 pre-seeded industry leaders calibrated across all difficulty tiers:
  - **Google** (Elite • 10/10) - Planetary scale distributed systems & algorithmic depth
  - **Stripe** (Elite • 9/10) - Idempotency, financial fault tolerance & practical architecture
  - **Netflix** (Hard • 8/10) - Chaos engineering, high-throughput microservices & senior autonomy
  - **Airbnb** (Hard • 7/10) - Marketplace concurrency, distributed systems & core culture values
  - **Spotify** (Medium • 6/10) - Audio streaming data pipelines & collaborative engineering
  - **Linear** (Medium • 5/10) - Local-first sync engines, 60fps UI latency & craft
- **Dynamic Crawler & AI Analysis**:
  - Click **"+ New Company"** and supply any company website URL (e.g. `https://anthropic.com` or `datadoghq.com`).
  - Scrapes headings, title, meta description, and page body with BeautifulSoup4.
  - OpenRouter AI analyzes the company's valuation/scale, hiring bar, and engineering culture.
  - Automatically calculates difficulty level (`Easy`, `Medium`, `Hard`, `Elite`), score (1-10), difficulty reasoning, interview style, and key focus areas.
  - Saves the company to MongoDB and inserts the new card directly onto the grid without a page reload.

### 3. Voice Interview Session
- **Call-Style Screen**: Sleek dark interface with an animated AI avatar waveform that transitions dynamically between **Idle**, **AI Speaking**, **Listening to You**, and **Thinking/Analyzing**.
- **Web Speech API**:
  - **Speech-to-Text (STT)**: Continuous speech recognition with real-time transcript streaming.
  - **Text-to-Speech (TTS)**: Natural voice synthesis of the AI interviewer's replies.
  - **Self-Pickup Prevention**: Automatically halts microphone recognition while the AI is speaking to prevent the microphone from picking up the AI's own voice.
  - **Typed Fallback**: Keyboard drawer for silent environments or unsupported microphone browsers.
- **Difficulty-Calibrated Turn Execution**:
  - Evaluates the user's answers against their actual resume projects and the company's hiring bar.
  - Probes vague answers, mixes technical and behavioral scenarios, asks one question at a time, and speaks in natural, spoken conversational voice without markdown or lists.
  - Every conversation turn is persisted to MongoDB.

---

## 🛠️ Stack

- **Backend**: Python 3.11+, FastAPI, Motor (Async MongoDB), Pydantic v2, BeautifulSoup4, PyMuPDF (`pymupdf`), `python-docx`, PyJWT, python-dotenv, httpx
- **AI Brain**: OpenRouter (`https://openrouter.ai/api/v1/chat/completions`)
  - Configurable models: `OPENROUTER_MODEL` and optional `OPENROUTER_INTERVIEW_MODEL`
  - Exponential backoff retry for 429/5xx, JSON parsing fallback with code fence stripping
- **Database**: MongoDB (Collections: `users`, `companies`, `interviews`)
- **Frontend**: React (Vite), React Router, Tailwind CSS, Axios, Lucide React, Web Speech API

---

## 🚀 One-Command Launch (Recommended)

Both setup scripts behave identically, are completely idempotent (safe to run repeatedly), run from the repository root regardless of where they are invoked, and stop with a clear message and link on the first failure.

### Windows
```cmd
run.bat
```
*(Optionally verify prerequisites and configuration without installing or launching servers: `run.bat --check`)*

### macOS / Linux
First make the script executable:
```bash
chmod +x run.sh
./run.sh
```
*(Optionally verify prerequisites and configuration without installing or launching servers: `./run.sh --check`)*

### What the Setup Scripts Do (7 Automated Steps)
1. **Prerequisite Checks**:
   - Verifies **Python 3.11+** numerically (`python3` then `python` on Unix; `py -3` then `python` on Windows).
   - Verifies **Node.js 18+** and **npm** are present.
   - Tests **MongoDB** connection using `MONGO_URI` from `backend/.env` (default `mongodb://localhost:27017`) with a 3-second server selection timeout.
2. **Environment Configuration**:
   - If `backend/.env` is missing, copies `backend/.env.example` and automatically generates a secure, random `JWT_SECRET`.
   - If `frontend/.env` is missing, copies `frontend/.env.example`.
   - Validates that `OPENROUTER_API_KEY` is configured and not an empty placeholder.
3. **Backend Setup**:
   - Creates `backend/.venv` only if missing.
   - Activates the virtualenv, upgrades pip, and installs `backend/requirements.txt`.
   - Skips installation on subsequent runs if the SHA-256 hash of `requirements.txt` matches the stored marker inside the venv.
4. **Frontend Setup**:
   - Runs `npm install` in `/frontend` only if `node_modules` is missing or if `package.json`/`package-lock.json` has changed since the stored marker.
5. **Port Checks**:
   - Verifies ports `8000` (Backend API) and `5173` (Frontend Dev Server) are free before launching. If either port is occupied, reports the busy port and exits cleanly.
6. **Server Startup**:
   - Backend: Starts `uvicorn app.main:app --reload --port 8000` from `/backend` using the venv's Python.
   - Frontend: Runs `npm run dev` from `/frontend`.
   - On Windows (`run.bat`): Spawns backend and frontend each in its own dedicated command window.
   - On Unix (`run.sh`): Runs backend in the background with clean `SIGINT`/`SIGTERM`/`EXIT` traps and runs frontend in the foreground.
7. **Health Wait**:
   - Polls `http://localhost:8000/health` for up to 20 seconds.
   - Prints the final success banner with clickable links:
     - **Frontend Web App**: [http://localhost:5173](http://localhost:5173)
     - **Backend API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🛠️ Manual Setup Guide

If you prefer setting up the components manually instead of using `run.bat` or `run.sh`:

### Prerequisites
1. **Python 3.11+** installed
2. **Node.js 18+** and **npm** installed
3. **MongoDB** running on default port `27017` (`mongodb://localhost:27017`)

---

### Step 1: OpenRouter API Key
1. Go to [https://openrouter.ai/keys](https://openrouter.ai/keys).
2. Sign in and create a new API key (starts with `sk-or-v1-...`).
3. Ensure your account has credits or select free models (e.g. `meta-llama/llama-3.3-70b-instruct` or `google/gemini-2.5-flash`).

---

### Step 2: Backend Setup

1. Open a terminal in the project directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   - **Windows**:
     ```powershell
     python -m venv venv
     .\venv\Scripts\activate
     ```
   - **Linux / macOS**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. Install requirements:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure `.env`:
   ```bash
   cp .env.example .env
   ```
   Edit `backend/.env` with your settings:
   ```env
   MONGO_URI=mongodb://localhost:27017
   DATABASE_NAME=ai_interview_simulator
   JWT_SECRET=ai-interview-simulator-jwt-secret-key-2026-secure
   OPENROUTER_API_KEY=sk-or-v1-your-actual-api-key
   OPENROUTER_MODEL=meta-llama/llama-3.3-70b-instruct
   OPENROUTER_INTERVIEW_MODEL=meta-llama/llama-3.3-70b-instruct
   ```

5. Launch the backend server:
   ```bash
   python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   API interactive docs available at: `http://localhost:8000/docs`

---

### Step 3: Frontend Setup

1. Open a new terminal in the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Launch the Vite dev server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:5173/resume
   ```

---

## 📡 API Endpoints Reference

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/auth/resume` | Upload resume (PDF/DOCX), parse with AI, return JWT & user | No |
| `GET` | `/auth/me` | Fetch authenticated user profile and parsed resume | Yes (Bearer) |
| `GET` | `/companies` | List all target companies sorted by date | No |
| `POST` | `/companies` | Scrape company URL, analyze with AI, save and return | Yes (Bearer) |
| `GET` | `/companies/{id}` | Retrieve details for a single company | No |
| `POST` | `/interviews` | Create a new interview session and get AI opening question | Yes (Bearer) |
| `POST` | `/interviews/{id}/turn` | Submit candidate answer transcript and get AI interviewer follow-up | Yes (Bearer) |
| `GET` | `/interviews/{id}` | Fetch interview session state and conversation transcript | Yes (Bearer) |
| `GET` | `/health` | Service health check | No |

---

## 💡 Troubleshooting

- **Microphone not working**: Ensure you grant microphone permissions when prompted in the browser. In Chrome/Edge, ensure the site is accessed via `http://localhost:5173` or `https://`.
- **OpenRouter 401 / 402 Error**: Check that your `OPENROUTER_API_KEY` in `backend/.env` is active and has sufficient credits at [openrouter.ai/credits](https://openrouter.ai/credits).
- **MongoDB Connection**: Make sure MongoDB is running (`Get-Service *mongo*` on Windows or `brew services start mongodb-community` on macOS).
