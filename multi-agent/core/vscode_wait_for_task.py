import os
import time
import sys
import json
import signal
import subprocess
from pathlib import Path

# Exit on SIGHUP (PTY/terminal closed when VSCode session dies)
signal.signal(signal.SIGHUP, lambda sig, frame: sys.exit(1))

TASK_FILE = "multi-agent.tasks.txt"
RUNTIME_DIR = Path(__file__).parent.parent / ".runtime"

def write_heartbeat(role: str):
    try:
        RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
        hb = RUNTIME_DIR / f"heartbeat_{role.lower()}.json"
        hb.write_text(json.dumps({"tick": int(time.time()), "ts": time.time(), "role": role.lower()}))
    except Exception:
        pass

def has_copilot_parent() -> bool:
    """Walk up process tree — return True if VSCode/Copilot is still an ancestor."""
    pid = os.getpid()
    for _ in range(12):
        try:
            ppid = int(subprocess.check_output(
                ["ps", "-p", str(pid), "-o", "ppid="],
                stderr=subprocess.DEVNULL
            ).strip())
        except Exception:
            return False
        if ppid <= 1:
            return False
        try:
            cmd = subprocess.check_output(
                ["ps", "-p", str(ppid), "-o", "command="],
                stderr=subprocess.DEVNULL
            ).decode().strip()
            if "copilot" in cmd or "extensionHost" in cmd or "code" in cmd.lower():
                return True
        except Exception:
            return False
        pid = ppid
    return False

def wait_for_task(role: str = "architect"):
    print(f"--- VSCODE: Waiting for task in {TASK_FILE} ---")
    print(f"Current Directory (CWD): {os.getcwd()}")

    check_counter = 0

    while True:
        # Check 1: reparented to launchd (fast, every iteration)
        if os.getppid() == 1:
            print(f"[{role}] Orphaned (ppid=1) — session dead, exiting.")
            sys.exit(1)

        # Check 2: VSCode/Copilot no longer in parent chain (every ~8s)
        check_counter += 1
        if check_counter % 4 == 0:
            if not has_copilot_parent():
                print(f"[{role}] VSCode/Copilot gone from parent chain — session dead, exiting.")
                sys.exit(1)

        write_heartbeat(role)

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
    role = sys.argv[1] if len(sys.argv) > 1 else "architect"
    wait_for_task(role)
