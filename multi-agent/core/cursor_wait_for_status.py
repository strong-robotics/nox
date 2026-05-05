import json
import time
import sys
import os

# Universal relative path from project root
STATUS_FILE = "multi-agent/status.json"

def wait_for_status(role, target_status):
    print(f"--- CURSOR AUTONOMOUS MODE: {role.upper()} ---")
    print(f"JSON Path: {STATUS_FILE}")
    print(f"Current Directory (CWD): {os.getcwd()}")
    print(f"Waiting for status '{target_status}'...")
    
    last_reported_status = None
    
    while True:
        if not os.path.exists(STATUS_FILE):
            print(f"ERROR: File {STATUS_FILE} not found!")
            time.sleep(5)
            continue
            
        try:
            with open(STATUS_FILE, "r") as f:
                data = json.load(f)
            
            run_id = data.get('run_id', 'N/A')
            role_data = next((s for s in data['pipeline'] if s['role'] == role), None)
            if not role_data:
                print(f"Error: Role {role} not found in status.json")
                sys.exit(1)
                
            current_status = role_data['status']
            
            if current_status != last_reported_status:
                print(f"[{run_id}] Status changed: {current_status}")
                last_reported_status = current_status
            
            if current_status == target_status:
                print(f"\n✅ COMMAND RECEIVED! Status: {target_status}")
                print("Waking up Cursor (Claude) to execute task...")
                sys.exit(0) 
                
            time.sleep(3) 
        except Exception as e:
            print(f"Read error: {e}")
            time.sleep(2)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 cursor_wait_for_status.py [Role] [Status] [optional: status_file_path]")
        sys.exit(1)
    
    if len(sys.argv) > 3:
        STATUS_FILE = sys.argv[3]
        
    wait_for_status(sys.argv[1], sys.argv[2])
