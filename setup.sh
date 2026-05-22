#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(pwd)"

echo "--- INSTALLING NOX ---"

# Copy .nox contents to project root
mkdir -p "$PROJECT_DIR/.nox"
cp -r "$SCRIPT_DIR/.nox/." "$PROJECT_DIR/.nox/"

# Create tasks file
touch "$PROJECT_DIR/multi-agent.tasks.txt"

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
