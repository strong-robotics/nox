#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(pwd)"

echo "--- INSTALLING NOX ---"

# Copy .nox contents to project root
mkdir -p "$PROJECT_DIR/.nox"
cp -r "$SCRIPT_DIR/.nox/." "$PROJECT_DIR/.nox/"

# Clear stale artifacts and runtime from previous sessions
rm -f "$PROJECT_DIR/.nox/multi-agent/core/artifacts/"*.md 2>/dev/null
rm -f "$PROJECT_DIR/.nox/multi-agent/.runtime/"*.pid 2>/dev/null
rm -f "$PROJECT_DIR/.nox/multi-agent/.runtime/heartbeat_"*.json 2>/dev/null

# Create tasks file
touch "$PROJECT_DIR/multi-agent.tasks.txt"

# Linear API key (optional)
echo ""
read -r -p "Linear API key (press Enter to skip): " LINEAR_KEY
if [[ -n "$LINEAR_KEY" ]]; then
  printf "LINEAR_API_KEY=%s\n" "$LINEAR_KEY" > "$PROJECT_DIR/.nox/.env"
  echo "  ✓ Saved to .nox/.env"
else
  touch "$PROJECT_DIR/.nox/.env"
  echo "  ✓ Skipped (add LINEAR_API_KEY to .nox/.env later to enable Linear integration)"
fi

# Update .gitignore
printf "\n.nox/\nmulti-agent.tasks.txt\n" >> "$PROJECT_DIR/.gitignore"

# Remove temp clone
rm -rf "$SCRIPT_DIR"

# Setup Python venv
echo "[1/2] Creating Python venv and installing dependencies..."
python3 -m venv "$PROJECT_DIR/.nox/venv"
"$PROJECT_DIR/.nox/venv/bin/pip" install --upgrade pip -q
"$PROJECT_DIR/.nox/venv/bin/pip" install -r "$PROJECT_DIR/.nox/requirements.txt"

# Setup dashboard
echo "[2/2] Installing dashboard dependencies..."
cd "$PROJECT_DIR/.nox/dashboard"
npm install

echo ""
echo "--- NOX READY ---"
echo "Run with: .nox/run_nox.sh"
