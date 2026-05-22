import os
import time
import sys
import atexit
from pathlib import Path

TASK_FILE = str(Path(__file__).parents[3] / "multi-agent.tasks.txt")
RUNTIME_DIR = Path(__file__).parent.parent / ".runtime"
PID_FILE = RUNTIME_DIR / "cursor_architect.pid"

def write_pid():
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    PID_FILE.write_text(str(os.getpid()))

def remove_pid():
    try:
        if PID_FILE.exists() and PID_FILE.read_text().strip() == str(os.getpid()):
            PID_FILE.unlink()
    except Exception:
        pass

def wait_for_task():
    write_pid()
    atexit.register(remove_pid)
    print(f"--- CURSOR: Waiting for task in {TASK_FILE} (pid={os.getpid()}) ---")
    print(f"Current Directory (CWD): {os.getcwd()}")
    while True:
        if os.path.exists(TASK_FILE):
            try:
                with open(TASK_FILE, "r", encoding="utf-8") as f:
                    content = f.read().strip()
                if content:
                    print(f"✅ Task detected: {content[:50]}...")
                    sys.exit(0)
            except Exception as e:
                print(f"File read error: {e}")
        time.sleep(2)

if __name__ == "__main__":
    wait_for_task()
