import os
import time
import sys

# RELATIVE PATH FROM PROJECT ROOT
TASK_FILE = "communication/discussion.md"

def wait_for_file():
    print(f"--- COLLEGIATE ROOM: Waiting for updates in {TASK_FILE} ---")
    
    if not os.path.exists(TASK_FILE):
        print(f"ERROR: File {TASK_FILE} not found in {os.getcwd()}!")
        sys.exit(1)

    initial_mtime = os.path.getmtime(TASK_FILE)
    
    while True:
        try:
            current_mtime = os.path.getmtime(TASK_FILE)
            if current_mtime > initial_mtime:
                print(f"✅ File updated!")
                sys.exit(0)
        except Exception as e:
            print(f"File check error: {e}")
        
        time.sleep(2)

if __name__ == "__main__":
    wait_for_file()
