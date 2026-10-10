"""Single local launch command with model bootstrap and clean process cleanup."""
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[1]


def main():
    os.chdir(ROOT)
    os.environ.setdefault("OMP_NUM_THREADS", "1")
    if not (ROOT / "models" / "forecaster.pkl").exists():
        print("Preparing the local AI model...", flush=True)
        subprocess.run([sys.executable, "scripts/train.py"], check=True)
    dev = "--dev" in sys.argv
    npm = shutil.which("npm.cmd" if os.name == "nt" else "npm")
    if not npm:
        raise SystemExit("Node/npm is required. Install dependencies as described in README.md.")
    if not dev and not (ROOT / "dist" / "index.html").exists():
        subprocess.run([npm, "run", "build"], check=True)
    backend = subprocess.Popen([sys.executable, "-m", "uvicorn", "backend.app:app", "--host", "127.0.0.1", "--port", "8000"])
    frontend = subprocess.Popen([npm, "run", "dev"]) if dev else None
    try:
        for _ in range(100):
            if backend.poll() is not None:
                raise RuntimeError("Backend could not start. Check whether port 8000 is already used.")
            try:
                urllib.request.urlopen("http://127.0.0.1:8000/api/health", timeout=1)
                break
            except OSError:
                time.sleep(0.1)
        print(f"Signal Loom is ready: http://127.0.0.1:{5173 if dev else 8000}", flush=True)
        print("Press Ctrl+C to stop.", flush=True)
        backend.wait()
    except KeyboardInterrupt:
        pass
    finally:
        for process in (frontend, backend):
            if process and process.poll() is None:
                if os.name == "nt":
                    subprocess.run(["taskkill", "/PID", str(process.pid), "/T", "/F"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                else:
                    process.terminate()


if __name__ == "__main__":
    main()
