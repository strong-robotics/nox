import os
import time
import sys

# Universal relative path from project root
TASK_FILE = "multi-agent.tasks.txt"

def wait_for_task():
    print(f"--- ANTIGRAVITY: Waiting for task in {TASK_FILE} ---")
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
