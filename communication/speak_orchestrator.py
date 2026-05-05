#!/usr/bin/env python3
"""
Poll communication-agent.speak.txt and sync status.json pipeline roles (Cursor / Antigravity) so the
next speaker is 'ready' and the other is 'waiting'.

Use when you do not want to hand-edit status.json after every User message or
agent reply. Run from project root alongside wait_for_status.py.

Comments in English per project convention.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone

from speak_utils import (
    expected_next_role_from_file,
    is_empty_or_whitespace,
    merge_turn_counters_into_status,
    read_speak,
)

STATUS_FILE = "communication/status.json"
DEFAULT_SPEAK = "communication-agent.speak.txt"


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def load_status(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_status_atomic(path: str, data: dict) -> None:
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
        f.write("\n")
    os.replace(tmp, path)


def get_first_speaker(data: dict) -> str:
    fs = data.get("first_speaker", "Cursor")
    if fs not in ("Cursor", "Antigravity"):
        return "Cursor"
    return fs


def sync_agents_from_speak(data: dict, speak_text: str) -> bool:
    """
    Update Cursor / Antigravity pipeline entries from communication-agent.speak.txt.
    Returns True if status.json content changed.
    """
    first_speaker = get_first_speaker(data)
    pipeline = data.get("pipeline")
    if not pipeline:
        return False

    by_role = {e["role"]: e for e in pipeline}

    # Empty file: no turn — avoid leaving a stale 'ready'
    if is_empty_or_whitespace(speak_text):
        changed = False
        for role in ("Cursor", "Antigravity"):
            if role in by_role and by_role[role].get("status") != "waiting":
                by_role[role]["status"] = "waiting"
                by_role[role]["description"] = "Idle (empty communication-agent.speak.txt)."
                changed = True
        if merge_turn_counters_into_status(data, speak_text):
            changed = True
        if changed:
            data["last_updated"] = utc_now_iso()
        return changed

    expected = expected_next_role_from_file(speak_text, first_speaker)

    if expected is None:
        # Non-empty but could not infer next role (malformed markers?)
        return False

    changed = False
    for role in ("Cursor", "Antigravity"):
        if role not in by_role:
            continue
        want = "ready" if role == expected else "waiting"
        if by_role[role].get("status") != want:
            by_role[role]["status"] = want
            by_role[role]["description"] = f"Orchestrator: next speaker inferred → {expected}."
            changed = True

    if merge_turn_counters_into_status(data, speak_text):
        changed = True

    if changed:
        data["last_updated"] = utc_now_iso()
    return changed


def run_loop(speak_path: str, status_path: str, interval: float, once: bool) -> None:
    print(f"--- SPEAK ORCHESTRATOR ---")
    print(f"Speak: {os.path.abspath(speak_path)}")
    print(f"Status: {os.path.abspath(status_path)}")
    print(f"Interval: {interval}s (Ctrl+C to stop)\n")

    while True:
        try:
            if not os.path.exists(status_path):
                print(f"ERROR: {status_path} missing (cwd={os.getcwd()})")
                time.sleep(5)
                if once:
                    return
                continue

            speak_text = read_speak(speak_path)
            data = load_status(status_path)
            if sync_agents_from_speak(data, speak_text):
                save_status_atomic(status_path, data)
                print(f"[{data.get('last_updated')}] Updated pipeline from communication-agent.speak.txt (next turn).")
        except KeyboardInterrupt:
            print("\nStopped.")
            sys.exit(0)
        except Exception as e:
            print(f"Orchestrator error: {e}")
            time.sleep(2)

        if once:
            return
        time.sleep(interval)


def main():
    parser = argparse.ArgumentParser(
        description="Sync status.json Cursor/Antigravity 'ready' from communication-agent.speak.txt turn order."
    )
    parser.add_argument(
        "--speak",
        default=DEFAULT_SPEAK,
        help=f"Path to communication-agent.speak.txt (default: {DEFAULT_SPEAK})",
    )
    parser.add_argument(
        "--status",
        default=STATUS_FILE,
        help=f"Path to status.json (default: {STATUS_FILE})",
    )
    parser.add_argument(
        "--interval",
        type=float,
        default=3.0,
        help="Seconds between polls (default: 3)",
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Run a single sync and exit",
    )
    args = parser.parse_args()
    run_loop(args.speak, args.status, args.interval, args.once)


if __name__ == "__main__":
    main()
