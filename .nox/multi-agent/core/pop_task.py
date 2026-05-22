import os
import sys
import re
from pathlib import Path

NOX_ROOT  = Path(__file__).parents[2]
TASK_FILE = str(NOX_ROOT.parent / "multi-agent.tasks.txt")

def pop_task(file_path=TASK_FILE):
    if not os.path.exists(file_path):
        return

    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Find all blocks including their headers, preserving original task numbers.
    # Matches full block: "--- task N\n...\n---"
    blocks = re.findall(r"(--- task \d+\n.*?\n---)", content, re.DOTALL)

    if not blocks:
        # Fallback for simple '---' without task labels
        segments = [b.strip() for b in content.split("---") if b.strip()]
        if len(segments) <= 1:
            with open(file_path, "w", encoding="utf-8") as f:
                f.write("")
            return
        # Remove first segment, rewrite rest as-is
        with open(file_path, "w", encoding="utf-8") as f:
            for seg in segments[1:]:
                f.write(f"--- {seg.strip()}\n---\n\n")
        return

    # Remove the first block. Keep the rest with their ORIGINAL task numbers intact.
    remaining_blocks = blocks[1:]

    if not remaining_blocks:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write("")
        return

    # Rewrite the file preserving original task numbers exactly as they were.
    with open(file_path, "w", encoding="utf-8") as f:
        for block in remaining_blocks:
            f.write(block.strip())
            f.write("\n\n")

if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else TASK_FILE
    pop_task(path)
    print(f"Successfully promoted next task in {path}")
    # Update queue stats after popping
    try:
        import subprocess
        subprocess.run(["python3", str(NOX_ROOT / "multi-agent/core/queue_stats.py"), "--quiet"], check=False)
    except Exception:
        pass
