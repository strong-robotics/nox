#!/usr/bin/env bash
# Resets multi-agent pipeline state to base defaults.
# Run this if agents crash or the pipeline gets stuck.
# Does NOT clear multi-agent.tasks.txt — tasks are preserved.

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

STATUS_FILE="multi-agent/status.json"
NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
RUN_ID="run_$(date -u +"%Y%m%d_%H%M%S")"

echo "🔄 Resetting pipeline state..."

cat > "$STATUS_FILE" << EOF
{
    "project": "Project Name",
    "last_updated": "$NOW",
    "run_id": "$RUN_ID",
    "pipeline": [
        {
            "role": "Architect",
            "status": "waiting",
            "started_at": null,
            "completed_at": null,
            "description": "Polling multi-agent.tasks.txt",
            "chat_name": "Cursor Architect"
        },
        {
            "role": "Designer",
            "status": "waiting",
            "started_at": null,
            "completed_at": null,
            "description": "Waiting...",
            "chat_name": "Designer"
        },
        {
            "role": "Developer",
            "status": "waiting",
            "started_at": null,
            "completed_at": null,
            "description": "Waiting...",
            "chat_name": "Developer"
        },
        {
            "role": "Tester",
            "status": "waiting",
            "started_at": null,
            "completed_at": null,
            "description": "Waiting...",
            "chat_name": "Tester"
        }
    ],
    "current_task": "None"
}
EOF

echo "✅ $STATUS_FILE reset (run_id: $RUN_ID)"

# Regenerate queue_stats.json from source files
python3 multi-agent/core/queue_stats.py --quiet
echo "✅ multi-agent/queue_stats.json updated"

echo ""
echo "Pipeline is ready. Launch agents using boot strings from launch.md"
