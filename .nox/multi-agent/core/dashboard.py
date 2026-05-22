#!/usr/bin/env python3
import atexit
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import monitor  # type: ignore  # pyrefly: ignore

def truncate(text, width):
    text = " ".join(str(text).split())
    if len(text) <= width: return text
    return text[: max(width - 3, 0)] + "..."

def role_icon(status):
    return {"waiting": "..", "ready": ">>", "in_progress": "##", "completed": "OK"}.get(status, "??")

def agent_icon(alive):
    return "✓" if alive else "✗"

def enter_alternate_screen():
    sys.stdout.write("\033[?1049h\033[H")
    sys.stdout.flush()

def exit_alternate_screen():
    sys.stdout.write("\033[?1049l")
    sys.stdout.flush()

def display_dashboard():
    enter_alternate_screen()
    atexit.register(exit_alternate_screen)

    while True:
        try:
            state = monitor.get_full_system_state()

            sys.stdout.write("\033[H\033[2J")
            sys.stdout.flush()

            # ── header ──────────────────────────────────────────────────────
            print("=" * 100)
            print(" MULTI-AGENT PIPELINE DASHBOARD")
            print(f" RUN ID       : {state['run_id']}")
            print(f" CURRENT TASK : {state['current_task']}")
            print(f" QUEUE        : completed={state['tasks']['completed']} queued={state['tasks']['queued']}")

            # ── pipeline (logical) ───────────────────────────────────────────
            print("=" * 100)
            print(" PIPELINE  (logical state from status.json)")
            for stage in state['pipeline']:
                role      = stage.get("role", "?").ljust(12)
                status    = stage.get("status", "?")
                desc      = truncate(stage.get("description", ""), 40)
                started   = stage.get("started_at") or "-"
                done      = stage.get("completed_at") or "-"
                print(f" {role_icon(status)} {role} | {status.upper().ljust(12)} | start {started} | done {done} | {desc}")

            # ── live agents (physical, by env) ───────────────────────────────
            print("=" * 100)
            print(" LIVE AGENTS  (physical processes from pid files)")
            agents = state.get("live_agents", [])
            if not agents:
                print("  none identified")
            else:
                by_env = {}
                for a in agents:
                    by_env.setdefault(a["env"], []).append(a)
                for env in ("cursor", "antigravity", "codex", "codex_app"):
                    if env not in by_env:
                        continue
                    print(f"  [{env.upper()}]")
                    for a in by_env[env]:
                        icon   = agent_icon(a["alive"])
                        status = "alive" if a["alive"] else "DEAD"
                        print(f"    {icon}  {a['role']:<12} PID {str(a['pid']):<8} {status}")

            # ── codex runtime details (per role, only if log exists) ─────────
            codex_agents = state.get("codex_agents", [])
            if codex_agents:
                print("=" * 100)
                print(" CODEX RUNTIME")
                for ca in codex_agents:
                    icon = agent_icon(ca["alive"])
                    print(f"  {icon}  {ca['role']:<12} {ca['state']:<12} PID {str(ca['pid'] or '-'):<8} model={ca['model']}")
                    if ca["events"]:
                        for ev in ca["events"][-3:]:
                            print(f"       › {truncate(ev, 88)}")

            # ── Codex.app chat state ────────────────────────────────────────
            codex_app_agents = state.get("codex_app_agents", [])
            if codex_app_agents:
                print("=" * 100)
                print(" CODEX.APP CHAT AGENTS")
                for agent in codex_app_agents:
                    icon = agent_icon(agent.get("alive"))
                    signal = "signal" if agent.get("signal_received") else "no-signal"
                    pid = agent.get("pid") or "-"
                    current = agent.get("current_status") or "-"
                    updated = agent.get("last_updated") or "-"
                    print(
                        f"  {icon}  {agent['role']:<12} {agent['state']:<16} "
                        f"PID {str(pid):<8} {signal:<9} current={current:<12} updated={updated}"
                    )

            # ── cursor events ────────────────────────────────────────────────
            cursor_events = state.get("cursor_events", [])
            if cursor_events:
                print("=" * 100)
                print(" RECENT CURSOR EVENTS")
                for event in cursor_events:
                    print(f" - {truncate(event, 94)}")

            # ── footer ───────────────────────────────────────────────────────
            print("=" * 100)
            print(f" Last Updated : {state['last_updated']}")
            print(" Controls     : Ctrl+C stops dashboard only.")
            print("=" * 100)

            time.sleep(3)
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"Dashboard error: {e}")
            time.sleep(2)

if __name__ == "__main__":
    display_dashboard()
