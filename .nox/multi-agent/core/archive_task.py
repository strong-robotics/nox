#!/usr/bin/env python3
"""
Simple task archival - just saves task info to history.
No learning, no analysis, just storage.
"""

import json
import os
import shutil
from datetime import datetime
from pathlib import Path

NOX_ROOT      = Path(__file__).parents[2]
HISTORY_DIR   = str(NOX_ROOT / "multi-agent/core/history")
ARTIFACTS_DIR = str(NOX_ROOT / "multi-agent/core/artifacts")
STATUS_FILE   = str(NOX_ROOT / "multi-agent/status.json")

def archive_task(task_id: str, status: str = "completed"):
    """
    Save completed task to history with timestamps from status.json
    
    Args:
        task_id: Task ID (e.g., "MRH-1234")
        status: completed|failed|partial
    """
    
    # Create directory structure
    now = datetime.utcnow()
    month_dir = Path(HISTORY_DIR) / now.strftime("%Y-%m")
    month_dir.mkdir(parents=True, exist_ok=True)
    
    # Load status.json
    try:
        with open(STATUS_FILE, 'r') as f:
            status_data = json.load(f)
    except FileNotFoundError:
        print(f"❌ Error: {STATUS_FILE} not found")
        return
    
    # Load artifacts
    implementation_plan = read_file_safe(f"{ARTIFACTS_DIR}/implementation_plan.md")
    task_description = read_file_safe(f"{ARTIFACTS_DIR}/task.md")
    qa_feedback = read_file_safe(f"{ARTIFACTS_DIR}/qa_feedback.md")
    
    # Calculate durations from status.json timestamps
    pipeline_with_durations = []
    task_started = None
    task_finished = None
    
    archive_time = now.isoformat() + 'Z'
    for agent in status_data.get('pipeline', []):
        completed_at = agent.get('completed_at')
        agent_status = agent['status']
        # If the archiving agent called us before updating its own status,
        # treat it as completed now (archive_task is called at task completion).
        if agent.get('started_at') and not completed_at and agent_status == 'in_progress':
            completed_at = archive_time
            agent_status = 'completed'

        agent_data = {
            "role": agent['role'],
            "status": agent_status,
            "started_at": agent.get('started_at'),
            "completed_at": completed_at,
            "duration_minutes": None
        }

        # Calculate duration if we have both timestamps
        if agent.get('started_at') and completed_at:
            try:
                start = datetime.fromisoformat(agent['started_at'].replace('Z', '+00:00'))
                end = datetime.fromisoformat(completed_at.replace('Z', '+00:00'))
                duration = (end - start).total_seconds() / 60
                agent_data['duration_minutes'] = round(duration, 1)

                # Track overall task timing
                if task_started is None or start < task_started:
                    task_started = start
                if task_finished is None or end > task_finished:
                    task_finished = end
            except:
                pass

        pipeline_with_durations.append(agent_data)
    
    # Calculate total task duration
    total_duration = 0
    if task_started and task_finished:
        total_duration = round((task_finished - task_started).total_seconds() / 60, 1)
    
    # Build history record
    history = {
        "task_id": task_id,
        "title": extract_title(task_description),
        "status": status,
        "created_at": status_data.get('run_id', now.isoformat()),
        "completed_at": now.isoformat(),
        "duration_minutes": total_duration,
        
        "input": {
            "description": task_description,
            "source": "multi-agent.tasks.txt"
        },
        
        "pipeline": pipeline_with_durations,
        
        "artifacts": {
            "implementation_plan": implementation_plan[:500] if implementation_plan else "",
            "task_description": task_description[:500] if task_description else "",
            "qa_feedback": qa_feedback[:500] if qa_feedback else ""
        },
        
        "notes": ""  # User can add notes later: "good practice" or "bad practice"
    }
    
    # Save history JSON
    history_file = month_dir / f"{task_id}_{status}.json"
    with open(history_file, 'w') as f:
        json.dump(history, f, indent=2)
    
    # Copy full artifacts
    artifacts_dest = month_dir / f"{task_id}_artifacts"
    artifacts_dest.mkdir(exist_ok=True)
    
    for artifact in ['implementation_plan.md', 'task.md', 'qa_feedback.md']:
        src = Path(ARTIFACTS_DIR) / artifact
        if src.exists():
            shutil.copy(src, artifacts_dest / artifact)
    
    # Update index
    update_index(task_id, history_file, status)
    
    print(f"✅ Task {task_id} archived")
    print(f"   Status: {status}")
    print(f"   Duration: {total_duration} minutes")
    print(f"   Location: {history_file}")
    
    # Show agent timings
    print(f"\n   Agent timings:")
    for agent in pipeline_with_durations:
        if agent['duration_minutes']:
            print(f"   • {agent['role']}: {agent['duration_minutes']} min")
        else:
            print(f"   • {agent['role']}: {agent['status']}")

    # Update queue stats after archiving
    try:
        import subprocess
        subprocess.run(["python3", str(NOX_ROOT / "multi-agent/core/queue_stats.py"), "--quiet"], check=False)
    except Exception:
        pass

def read_file_safe(path: str) -> str:
    """Read file or return empty string"""
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return f.read()
    except:
        return ""

def extract_title(task_content: str) -> str:
    """Extract title from task.md — prefers ## Action section, falls back to first heading."""
    if not task_content:
        return "Untitled task"
    lines = task_content.strip().split('\n')
    for i, line in enumerate(lines):
        if line.strip().lower() == '## action':
            # Return the next non-empty line
            for j in range(i + 1, len(lines)):
                if lines[j].strip():
                    return lines[j].strip()[:100]
    # Fallback: first non-metadata heading or non-empty line
    for line in lines:
        if line.startswith('## ') and 'metadata' not in line.lower() and 'task id' not in line.lower():
            return line[3:].strip()[:100]
        if line.startswith('# ') and 'metadata' not in line.lower():
            return line[2:].strip()[:100]
    return "Untitled task"

def update_index(task_id: str, history_file: Path, status: str):
    """Update fast-lookup index"""
    index_file = Path(HISTORY_DIR) / "index.json"
    
    if index_file.exists():
        with open(index_file, 'r') as f:
            index = json.load(f)
    else:
        index = {"tasks": {}}
    
    index['tasks'][task_id] = {
        "file": str(history_file),
        "archived_at": datetime.utcnow().isoformat(),
        "status": status
    }
    
    index['last_updated'] = datetime.utcnow().isoformat()
    index['total_tasks'] = len(index['tasks'])
    
    with open(index_file, 'w') as f:
        json.dump(index, f, indent=2)

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python3 archive_task.py TASK-ID [status]")
        print("Example: python3 archive_task.py MRH-1234 completed")
        sys.exit(1)
    
    task_id = sys.argv[1]
    status = sys.argv[2] if len(sys.argv) > 2 else "completed"
    
    archive_task(task_id, status)
