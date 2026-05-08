#!/usr/bin/env python3
"""Agent heartbeat — run in background at agent startup.
Writes a tick+timestamp every 2s so monitor.py can detect frozen/dead agents."""
import json
import sys
import time
from pathlib import Path

RUNTIME_DIR = Path(__file__).parent.parent / ".runtime"

def run(role: str):
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    hb_file = RUNTIME_DIR / f"heartbeat_{role}.json"
    tick = 0
    while True:
        tick += 1
        hb_file.write_text(json.dumps({"tick": tick, "ts": time.time(), "role": role}))
        time.sleep(2)

if __name__ == "__main__":
    role = sys.argv[1].lower() if len(sys.argv) > 1 else "unknown"
    run(role)
