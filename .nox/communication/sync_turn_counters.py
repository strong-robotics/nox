#!/usr/bin/env python3
"""
One-shot: set turn_counters (and default round_cap) in status.json from communication-agent.speak.txt.
Use in manual pipeline mode when speak_orchestrator.py is not running.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone

from speak_utils import merge_turn_counters_into_status, read_speak

STATUS_FILE = "communication/status.json"
DEFAULT_SPEAK = "communication-agent.speak.txt"


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--speak", default=DEFAULT_SPEAK, help="Path to communication-agent.speak.txt")
    parser.add_argument("--status", default=STATUS_FILE, help="Path to status.json")
    args = parser.parse_args()

    if not os.path.exists(args.status):
        print(f"ERROR: {args.status} not found (cwd={os.getcwd()})", file=sys.stderr)
        sys.exit(1)

    speak_text = read_speak(args.speak)
    with open(args.status, "r", encoding="utf-8") as f:
        data = json.load(f)

    if merge_turn_counters_into_status(data, speak_text):
        data["last_updated"] = utc_now_iso()
        tmp = args.status + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
            f.write("\n")
        os.replace(tmp, args.status)
        print(
            f"Updated turn_counters: {data['turn_counters']} "
            f"(round_cap={data.get('round_cap', 5)})"
        )
    else:
        print(f"No change (turn_counters already {data.get('turn_counters')}).")


if __name__ == "__main__":
    main()
