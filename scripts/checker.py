#!/usr/bin/env python3
"""
Helper utility for run.sh and run.bat to perform idempotent, cross-platform checks.
"""
from __future__ import annotations
import glob
import hashlib
import os
import re
import secrets
import socket
import sys
import time
import urllib.request
from pathlib import Path
from urllib.parse import urlparse

ROOT_DIR = Path(__file__).resolve().parent.parent

# Inject backend/.venv site-packages into sys.path if present,
# so pymongo/motor can be imported even when invoked by system Python.
venv_win_sp = ROOT_DIR / "backend" / ".venv" / "Lib" / "site-packages"
if venv_win_sp.is_dir() and str(venv_win_sp) not in sys.path:
    sys.path.insert(0, str(venv_win_sp))

for sp in glob.glob(str(ROOT_DIR / "backend" / ".venv" / "lib" / "python*" / "site-packages")):
    if os.path.isdir(sp) and sp not in sys.path:
        sys.path.insert(0, sp)


def check_python():
    """Verifies Python version is numerically 3.11+."""
    v = sys.version_info
    ver_str = f"{v.major}.{v.minor}.{v.micro}"
    if not ((v.major == 3 and v.minor >= 11) or v.major > 3):
        print(f"[ERROR] Python 3.11+ is required (found {ver_str}).", file=sys.stderr)
        print("Please install Python 3.11 or newer from: https://www.python.org/downloads/", file=sys.stderr)
        sys.exit(1)
    if v.releaselevel in ("alpha", "beta") and v.major >= 3 and v.minor >= 14:
        # Pre-release builds of unreleased future Python lack precompiled wheels on PyPI
        print(f"[ERROR] Python {ver_str} is an experimental {v.releaselevel} build without wheel support.", file=sys.stderr)
        print("Please install a stable Python 3.11 or 3.12 release from: https://www.python.org/downloads/", file=sys.stderr)
        sys.exit(1)
    print(ver_str)
    sys.exit(0)


def check_node():
    """Verifies Node.js 18+ and npm are installed."""
    import subprocess
    is_win = os.name == "nt"
    # Check node
    try:
        res = subprocess.run(["node", "-e", "console.log(process.versions.node)"], capture_output=True, text=True, check=True, shell=is_win)
        node_ver_str = res.stdout.strip()
        major = int(node_ver_str.split(".")[0])
        if major < 18:
            print(f"[ERROR] Node.js 18+ is required (found v{node_ver_str}).", file=sys.stderr)
            print("Please install Node.js 18+ from: https://nodejs.org/", file=sys.stderr)
            sys.exit(1)
    except Exception:
        print("[ERROR] Node.js is not installed or not in PATH.", file=sys.stderr)
        print("Please install Node.js 18+ from: https://nodejs.org/", file=sys.stderr)
        sys.exit(1)

    # Check npm
    try:
        res = subprocess.run(["npm", "-v"], capture_output=True, text=True, check=True, shell=is_win)
        npm_ver_str = res.stdout.strip()
    except Exception:
        print("[ERROR] npm is not installed or not in PATH.", file=sys.stderr)
        print("Please install npm (bundled with Node.js) from: https://nodejs.org/", file=sys.stderr)
        sys.exit(1)

    print(f"v{node_ver_str}, npm {npm_ver_str}")
    sys.exit(0)


def check_env():
    """
    Checks backend/.env and frontend/.env.
    Auto-generates backend/.env with random JWT_SECRET if missing.
    Verifies OPENROUTER_API_KEY is present and not a placeholder.
    """
    backend_env = ROOT_DIR / "backend" / ".env"
    backend_example = ROOT_DIR / "backend" / ".env.example"
    frontend_env = ROOT_DIR / "frontend" / ".env"
    frontend_example = ROOT_DIR / "frontend" / ".env.example"

    # 1. backend/.env
    if not backend_env.is_file():
        if not backend_example.is_file():
            print("[ERROR] backend/.env.example not found.", file=sys.stderr)
            sys.exit(1)
        raw_content = backend_example.read_text(encoding="utf-8")
        random_jwt = secrets.token_urlsafe(32)
        updated = re.sub(r"^JWT_SECRET=.*", f"JWT_SECRET={random_jwt}", raw_content, flags=re.MULTILINE)
        if "JWT_SECRET=" not in updated:
            updated += f"\nJWT_SECRET={random_jwt}\n"
        backend_env.write_text(updated, encoding="utf-8")
        print("      Created backend/.env with auto-generated JWT_SECRET.")

    # 2. frontend/.env
    if not frontend_env.is_file():
        if frontend_example.is_file():
            frontend_env.write_text(frontend_example.read_text(encoding="utf-8"), encoding="utf-8")
            print("      Created frontend/.env from .env.example.")

    # 3. Check LLM_PROVIDER & OPENROUTER_API_KEY
    llm_provider = "openrouter"
    api_key = ""
    for line in backend_env.read_text(encoding="utf-8").splitlines():
        m_prov = re.match(r"^\s*LLM_PROVIDER\s*=\s*(.*)", line)
        if m_prov:
            llm_provider = m_prov.group(1).split("#")[0].strip().strip("'\"").lower()
        m_key = re.match(r"^\s*OPENROUTER_API_KEY\s*=\s*(.*)", line)
        if m_key:
            api_key = m_key.group(1).split("#")[0].strip().strip("'\"")

    if llm_provider == "mock":
        print("OK (mock mode)")
        sys.exit(0)

    if not api_key or api_key in ("your_openrouter_api_key_here", "sk-or-v1-your_openrouter_api_key_here", "sk-or-v1-your-actual-api-key"):
        print("\n================================================================", file=sys.stderr)
        print("[WARNING] OPENROUTER_API_KEY is missing or unconfigured in backend/.env!", file=sys.stderr)
        print("================================================================", file=sys.stderr)
        print("Please edit backend/.env and set your OPENROUTER_API_KEY:", file=sys.stderr)
        print("  OPENROUTER_API_KEY=sk-or-v1-your-key-here\n", file=sys.stderr)
        print("To obtain an OpenRouter API key:", file=sys.stderr)
        print("  1. Sign in to https://openrouter.ai/keys", file=sys.stderr)
        print("  2. Create a key and paste it into backend/.env", file=sys.stderr)
        print("================================================================\n", file=sys.stderr)
        sys.exit(1)

    # 4. Synchronize detected LAN IP into frontend & backend .env
    detected_ip = setup_network_env()
    print(f"OK (configured for {detected_ip})")
    sys.exit(0)


def get_local_ip() -> str:
    """Detects the primary local LAN IPv4 address (e.g. 192.168.x.x, 10.x.x.x)."""
    env_ip = os.getenv("HOST_IP") or os.getenv("LOCAL_IP")
    if env_ip and env_ip.strip():
        return env_ip.strip()

    # Route-based UDP socket query (no packets actually transmitted)
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        if ip and not ip.startswith("127."):
            return ip
    except Exception:
        pass
    finally:
        s.close()

    try:
        hostname = socket.gethostname()
        for ip in socket.gethostbyname_ex(hostname)[2]:
            if not ip.startswith("127.") and not ip.startswith("169.254."):
                return ip
    except Exception:
        pass

    return "127.0.0.1"


def print_ip():
    """Prints detected local LAN IP to stdout for shell scripts."""
    print(get_local_ip())
    sys.exit(0)


def setup_network_env(target_ip: str | None = None) -> str:
    """
    Configures frontend/.env with VITE_API_URL=http://<IP>:8000
    and backend/.env with HOST=0.0.0.0 and CORS_ORIGINS including <IP>.
    """
    import json
    ip = target_ip or get_local_ip()

    fe_env = ROOT_DIR / "frontend" / ".env"
    be_env = ROOT_DIR / "backend" / ".env"

    # 1. Update frontend/.env
    if fe_env.is_file():
        fe_content = fe_env.read_text(encoding="utf-8")
        if re.search(r"^\s*VITE_API_URL\s*=.*", fe_content, flags=re.MULTILINE):
            fe_content = re.sub(
                r"^\s*VITE_API_URL\s*=.*",
                f"VITE_API_URL=http://{ip}:8000",
                fe_content,
                flags=re.MULTILINE,
            )
        else:
            fe_content += f"\nVITE_API_URL=http://{ip}:8000\n"
        fe_env.write_text(fe_content, encoding="utf-8")
    else:
        fe_env.write_text(f"# Backend API URL\nVITE_API_URL=http://{ip}:8000\n", encoding="utf-8")

    # 2. Update backend/.env
    if be_env.is_file():
        be_content = be_env.read_text(encoding="utf-8")
        if re.search(r"^\s*HOST\s*=.*", be_content, flags=re.MULTILINE):
            be_content = re.sub(r"^\s*HOST\s*=.*", "HOST=0.0.0.0", be_content, flags=re.MULTILINE)
        else:
            be_content += "\nHOST=0.0.0.0\n"

        cors_match = re.search(r"^\s*CORS_ORIGINS\s*=\s*(.*)", be_content, flags=re.MULTILINE)
        if cors_match:
            try:
                origins = json.loads(cors_match.group(1).split("#")[0].strip())
                if isinstance(origins, list):
                    for new_orig in [f"http://{ip}:5173", f"http://{ip}:8000", f"http://{ip}:3000"]:
                        if new_orig not in origins:
                            origins.append(new_orig)
                    be_content = re.sub(
                        r"^\s*CORS_ORIGINS\s*=.*",
                        f"CORS_ORIGINS={json.dumps(origins)}",
                        be_content,
                        flags=re.MULTILINE,
                    )
            except Exception:
                pass
        be_env.write_text(be_content, encoding="utf-8")

    return ip


def cmd_setup_network_env():
    """CLI handler for setup_network_env command."""
    target_ip = sys.argv[2].strip() if len(sys.argv) > 2 else None
    ip = setup_network_env(target_ip)
    print(f"OK ({ip})")
    sys.exit(0)


def check_mongo():

    """
    Reads MONGO_URI from backend/.env (default mongodb://localhost:27017)
    and tests connection with a 3-second server selection timeout.
    """
    backend_env = ROOT_DIR / "backend" / ".env"
    mongo_uri = "mongodb://localhost:27017"

    if backend_env.is_file():
        for line in backend_env.read_text(encoding="utf-8").splitlines():
            m = re.match(r"^\s*MONGO_URI\s*=\s*(.*)", line)
            if m:
                val = m.group(1).split("#")[0].strip().strip("'\"")
                if val:
                    mongo_uri = val
                break

    connected = False
    err_msg = ""

    # Try pymongo first with 3s timeout
    try:
        from pymongo import MongoClient
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=3000)
        client.admin.command("ping")
        connected = True
    except (ImportError, SystemError):
        # Fallback to direct TCP socket check
        try:
            parsed = urlparse(mongo_uri)
            host = parsed.hostname or "127.0.0.1"
            port = parsed.port or 27017
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(3.0)
            s.connect((host, port))
            s.close()
            connected = True
        except Exception as se:
            err_msg = str(se)
    except Exception as pe:
        err_msg = str(pe)

    if connected:
        print(f"OK ({mongo_uri})")
        sys.exit(0)
    else:
        print(f"\n================================================================", file=sys.stderr)
        print(f"[ERROR] Could not connect to MongoDB at: {mongo_uri}", file=sys.stderr)
        if err_msg:
            print(f"Error details: {err_msg}", file=sys.stderr)
        print("================================================================", file=sys.stderr)
        print("Please ensure MongoDB is reachable:", file=sys.stderr)
        print("  - Local MongoDB:", file=sys.stderr)
        print("      * Windows: Open PowerShell as Admin and run: net start MongoDB", file=sys.stderr)
        print("      * macOS:   brew services start mongodb-community", file=sys.stderr)
        print("      * Linux:   sudo systemctl start mongod", file=sys.stderr)
        print("      * Docker:  docker run -d -p 27017:27017 --name mongodb mongo:latest", file=sys.stderr)
        print("  - MongoDB Atlas (Cloud):", file=sys.stderr)
        print("      * Create a free cluster at https://www.mongodb.com/cloud/atlas", file=sys.stderr)
        print("      * Update MONGO_URI in backend/.env with your Atlas connection string.", file=sys.stderr)
        print("================================================================\n", file=sys.stderr)
        sys.exit(1)


def backend_status():
    """Checks if backend pip install is required."""
    req_file = ROOT_DIR / "backend" / "requirements.txt"
    venv_dir = ROOT_DIR / "backend" / ".venv"
    marker_file = venv_dir / ".requirements.sha256"

    if not marker_file.is_file():
        print("NEEDS_INSTALL")
        sys.exit(0)

    try:
        current_hash = hashlib.sha256(req_file.read_bytes()).hexdigest()
        stored_hash = marker_file.read_text(encoding="utf-8").strip()
        if current_hash == stored_hash:
            print("UP_TO_DATE")
            sys.exit(0)
    except Exception:
        pass

    print("NEEDS_INSTALL")
    sys.exit(0)


def touch_backend_marker():
    """Writes current requirements.txt hash to marker file."""
    req_file = ROOT_DIR / "backend" / "requirements.txt"
    venv_dir = ROOT_DIR / "backend" / ".venv"
    marker_file = venv_dir / ".requirements.sha256"
    marker_file.parent.mkdir(parents=True, exist_ok=True)
    current_hash = hashlib.sha256(req_file.read_bytes()).hexdigest()
    marker_file.write_text(current_hash, encoding="utf-8")
    print("OK")
    sys.exit(0)


def frontend_status():
    """Checks if frontend npm install is required."""
    fe_dir = ROOT_DIR / "frontend"
    node_modules = fe_dir / "node_modules"
    marker_file = node_modules / ".installed.marker"
    pkg_json = fe_dir / "package.json"
    pkg_lock = fe_dir / "package-lock.json"

    if not node_modules.is_dir() or not marker_file.is_file():
        print("NEEDS_INSTALL")
        sys.exit(0)

    try:
        marker_mtime = marker_file.stat().st_mtime
        if pkg_json.is_file() and pkg_json.stat().st_mtime > marker_mtime:
            print("NEEDS_INSTALL")
            sys.exit(0)
        if pkg_lock.is_file() and pkg_lock.stat().st_mtime > marker_mtime:
            print("NEEDS_INSTALL")
            sys.exit(0)

        h = hashlib.sha256()
        if pkg_json.is_file():
            h.update(pkg_json.read_bytes())
        if pkg_lock.is_file():
            h.update(pkg_lock.read_bytes())
        current_hash = h.hexdigest()

        stored_hash = marker_file.read_text(encoding="utf-8").strip()
        if stored_hash == current_hash:
            print("UP_TO_DATE")
            sys.exit(0)
    except Exception:
        pass

    print("NEEDS_INSTALL")
    sys.exit(0)


def touch_frontend_marker():
    """Writes current package hash and updates mtime on frontend marker."""
    fe_dir = ROOT_DIR / "frontend"
    marker_file = fe_dir / "node_modules" / ".installed.marker"
    marker_file.parent.mkdir(parents=True, exist_ok=True)

    h = hashlib.sha256()
    for fname in ["package.json", "package-lock.json"]:
        p = fe_dir / fname
        if p.is_file():
            h.update(p.read_bytes())
    marker_file.write_text(h.hexdigest(), encoding="utf-8")
    print("OK")
    sys.exit(0)


def check_ports():
    """Verifies that ports 8000 and 5173 are free."""
    for port in [8000, 5173]:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        try:
            s.bind(("127.0.0.1", port))
            s.close()
        except Exception:
            service_name = "Backend API" if port == 8000 else "Frontend Dev Server"
            print(f"\n[ERROR] Port {port} is already in use ({service_name})!", file=sys.stderr)
            print(f"Please terminate the process using port {port} before starting.\n", file=sys.stderr)
            sys.exit(1)
    print("OK")
    sys.exit(0)


def poll_health():
    """Polls http://localhost:8000/health for up to 20 seconds."""
    urls = ["http://localhost:8000/health", "http://127.0.0.1:8000/health"]
    start_time = time.time()
    while time.time() - start_time < 20.0:
        for url in urls:
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "HealthCheck/1.0"})
                with urllib.request.urlopen(req, timeout=1.5) as resp:
                    if resp.status == 200:
                        print("OK")
                        sys.exit(0)
            except Exception:
                pass
        time.sleep(0.5)

    print("\n[ERROR] Backend did not respond on http://localhost:8000/health within 20 seconds.", file=sys.stderr)
    sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python checker.py [python_version|check_node|check_env|check_mongo|get_ip|setup_network_env|backend_status|touch_backend_marker|frontend_status|touch_frontend_marker|check_ports|poll_health]")
        sys.exit(1)

    cmd = sys.argv[1]
    dispatch = {
        "python_version": check_python,
        "check_node": check_node,
        "check_env": check_env,
        "check_mongo": check_mongo,
        "get_ip": print_ip,
        "setup_network_env": cmd_setup_network_env,
        "backend_status": backend_status,
        "touch_backend_marker": touch_backend_marker,
        "frontend_status": frontend_status,
        "touch_frontend_marker": touch_frontend_marker,
        "check_ports": check_ports,
        "poll_health": poll_health,
    }


    if cmd in dispatch:
        dispatch[cmd]()
    else:
        print(f"Unknown command: {cmd}", file=sys.stderr)
        sys.exit(1)
