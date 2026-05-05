#!/usr/bin/env python3
"""
Queue stats — counts tasks from source files directly.
Never trusts agent-reported numbers.

Usage:
  python3 multi-agent/core/queue_stats.py         # update + print
  python3 multi-agent/core/queue_stats.py --quiet  # update only, no output
"""

import json
import re
import sys
import os
from datetime import datetime, timezone
from pathlib import Path

TASKS_FILE   = "multi-agent.tasks.txt"
STATUS_FILE  = "multi-agent/status.json"
HISTORY_FILE = "multi-agent/core/history/index.json"
STATS_FILE   = "multi-agent/queue_stats.json"

QUIET = "--quiet" in sys.argv


def count_remaining() -> int:
    """Count task blocks in the queue file."""
    if not os.path.exists(TASKS_FILE):
        return 0
    with open(TASKS_FILE, "r", encoding="utf-8") as f:
        content = f.read()
    blocks = re.findall(r"--- task \d+", content)
    return len(blocks)


def count_completed() -> int:
    """Count completed tasks from history index."""
    if not os.path.exists(HISTORY_FILE):
        return 0
    with open(HISTORY_FILE, "r", encoding="utf-8") as f:
        index = json.load(f)
    return index.get("total_tasks", 0)


def get_current_task() -> str:
    """Get current task name from status.json."""
    if not os.path.exists(STATUS_FILE):
        return "None"
    with open(STATUS_FILE, "r", encoding="utf-8") as f:
        status = json.load(f)
    return status.get("current_task", "None")


def get_pipeline_state() -> list:
    """Get current pipeline agent statuses."""
    if not os.path.exists(STATUS_FILE):
        return []
    with open(STATUS_FILE, "r", encoding="utf-8") as f:
        status = json.load(f)
    return [
        {"role": a["role"], "status": a["status"]}
        for a in status.get("pipeline", [])
    ]


def update_stats() -> dict:
    queued_total = count_remaining()
    completed = count_completed()
    current   = get_current_task()
    pipeline  = get_pipeline_state()

    active_statuses = {"in_progress", "ready"}
    in_progress = 1 if any(a["status"] in active_statuses for a in pipeline) else 0
    remaining = max(queued_total - in_progress, 0)
    total = completed + in_progress + remaining

    stats = {
        "total":       total,
        "completed":   completed,
        "in_progress": in_progress,
        "remaining":   remaining,
        "current_task": current,
        "pipeline":    pipeline,
        "last_updated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }

    Path(STATS_FILE).parent.mkdir(parents=True, exist_ok=True)
    with open(STATS_FILE, "w", encoding="utf-8") as f:
        json.dump(stats, f, indent=2)

    return stats


def print_stats(stats: dict):
    bar_total = stats["total"] or 1
    done_pct  = int(stats["completed"] / bar_total * 20)
    bar       = "█" * done_pct + "░" * (20 - done_pct)

    print("\n📋 QUEUE STATS")
    print("=" * 40)
    print(f"  Total tasks   : {stats['total']}")
    print(f"  Completed     : {stats['completed']}")
    print(f"  In progress   : {stats['in_progress']}")
    print(f"  Remaining     : {stats['remaining']}")
    print(f"  Progress [{bar}]")
    print(f"\n  Current task  : {stats['current_task']}")
    print("\n  Pipeline:")
    for agent in stats["pipeline"]:
        icon = {"waiting": "⏸", "in_progress": "⚙️", "ready": "🟢", "completed": "✅"}.get(agent["status"], "❓")
        print(f"    {icon}  {agent['role']}: {agent['status']}")
    print()


if __name__ == "__main__":
    stats = update_stats()
    if not QUIET:
        print_stats(stats)
