#!/usr/bin/env python3
import json
import os
import sys
import time
from pathlib import Path

STATUS_FILE = str(Path(__file__).parents[2] / "multi-agent/status.json")


def wait_for_status(role, target_status):
    print(f"--- CODEX AUTONOMOUS MODE: {role.upper()} ---")
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
            with open(STATUS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)

            run_id = data.get("run_id", "N/A")
            role_data = next((s for s in data["pipeline"] if s["role"] == role), None)
            if not role_data:
                print(f"Error: Role {role} not found in status.json")
                sys.exit(1)

            current_status = role_data["status"]

            if current_status != last_reported_status:
                print(f"[{run_id}] Status changed: {current_status}")
                last_reported_status = current_status

            if current_status == target_status:
                print(f"CODEX_SIGNAL_RECEIVED: {role} {target_status}")
                sys.exit(0)

            time.sleep(3)
        except Exception as e:
            print(f"Read error: {e}")
            time.sleep(2)


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 codex_wait_for_status.py [Role] [Status] [optional: status_file_path]")
        sys.exit(1)

    if len(sys.argv) > 3:
        STATUS_FILE = sys.argv[3]

    wait_for_status(sys.argv[1], sys.argv[2])
