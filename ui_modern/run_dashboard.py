"""
Launcher script for the Modern React + FastAPI GPU Node Scheduling Dashboard.
Starts both the FastAPI backend (port 8000) and the Vite React frontend (port 5173)
and opens the browser at http://localhost:5173.
"""
import os
import subprocess
import sys
import time
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UI_MODERN = ROOT / "ui_modern"
BACKEND_DIR = UI_MODERN / "backend"
FRONTEND_DIR = UI_MODERN / "frontend"

# Prefer the user's working Python 3.11 with FastAPI / Uvicorn installed
PYTHON_CANDIDATES = [
    Path(r"C:\Users\nilak\AppData\Local\Python\pythoncore-3.11-64\python.exe"),
    Path(sys.executable),
]
PYTHON_EXE = next((str(p) for p in PYTHON_CANDIDATES if p.exists()), sys.executable)


def main():
    print("=" * 70)
    print("🚀 Starting GPU Node Scheduling Modern Dashboard")
    print("   Problem 07: Pod Scheduling Using Taints & Tolerations")
    print("=" * 70)
    print(f"[*] Python Executable : {PYTHON_EXE}")
    print(f"[*] Backend Directory : {BACKEND_DIR}")
    print(f"[*] Frontend Directory: {FRONTEND_DIR}")
    print()

    # 1. Start FastAPI backend
    print("[1/3] Starting FastAPI backend on http://127.0.0.1:8000 ...")
    backend_proc = subprocess.Popen(
        [PYTHON_EXE, "-m", "uvicorn", "server:app", "--host", "127.0.0.1", "--port", "8000"],
        cwd=str(BACKEND_DIR),
    )

    # Give backend a moment to boot
    time.sleep(1.5)

    # 2. Start Vite frontend
    print("[2/3] Starting Vite React frontend on http://localhost:5173 ...")
    frontend_proc = subprocess.Popen(
        ["npm.cmd" if os.name == "nt" else "npm", "run", "dev", "--", "--host", "127.0.0.1", "--port", "5173"],
        cwd=str(FRONTEND_DIR),
    )

    time.sleep(2)

    # 3. Open browser
    url = "http://localhost:5173"
    print(f"[3/3] Opening dashboard in browser: {url}")
    print()
    print("=" * 70)
    print(f"✅ Modern Dashboard is running at: {url}")
    print("   Backend API Docs: http://localhost:8000/docs")
    print("   Press Ctrl+C to stop both servers.")
    print("=" * 70)

    try:
        webbrowser.open(url)
    except Exception:
        pass

    try:
        while True:
            time.sleep(1)
            if backend_proc.poll() is not None:
                print("[-] Backend process terminated unexpectedly.")
                break
            if frontend_proc.poll() is not None:
                print("[-] Frontend process terminated unexpectedly.")
                break
    except KeyboardInterrupt:
        print("\n[*] Stopping servers...")
    finally:
        for p, name in [(backend_proc, "Backend"), (frontend_proc, "Frontend")]:
            if p and p.poll() is None:
                print(f"[*] Stopping {name}...")
                p.terminate()
                try:
                    p.wait(timeout=3)
                except subprocess.TimeoutExpired:
                    p.kill()
        print("[*] All servers stopped cleanly.")


if __name__ == "__main__":
    main()
