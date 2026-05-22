#!/bin/bash

# NOX Multi-Agent System Launcher
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$ROOT_DIR")"
export PROJECT_ROOT
cd "$ROOT_DIR"

echo "--- INITIALIZING NOX ECOSYSTEM ---"

# 1. Start Backend (FastAPI)
echo "[1/2] Starting NOX Brain (Backend) on port 777..."
"$ROOT_DIR/venv/bin/python3" "$ROOT_DIR/scripts/main.py" &
BACKEND_PID=$!

# 2. Start Frontend (Next.js)
echo "[2/2] Starting NOX Interface (Dashboard) on port 778..."
cd "$ROOT_DIR/dashboard"
npm run dev -- -p 778 &
FRONTEND_PID=$!

# Handle shutdown
trap "echo '--- SHUTTING DOWN NOX ---'; kill $BACKEND_PID; kill $FRONTEND_PID; exit" SIGINT

echo "------------------------------------------------"
echo "NOX IS ONLINE"
echo "Backend: http://localhost:777"
echo "Dashboard: http://localhost:778"
echo "Press Ctrl+C to stop everything."
echo "------------------------------------------------"

# Keep script running to wait for background processes
wait
