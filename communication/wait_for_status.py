import argparse
import json
import os
import sys
import time

from speak_utils import (
    count_agent_turns,
    cycle_complete_for_cap,
    expected_next_role_from_file,
    is_empty_or_whitespace,
    read_speak,
    round_cap_from_status,
)

# RELATIVE PATH FROM PROJECT ROOT
STATUS_FILE = "communication/status.json"
DEFAULT_SPEAK = "communication-agent.speak.txt"


def load_status():
    if not os.path.exists(STATUS_FILE):
        return None
    with open(STATUS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def get_first_speaker(data):
    """Optional key first_speaker: 'Cursor' | 'Antigravity'. Default Cursor."""
    fs = (data or {}).get("first_speaker", "Cursor")
    if fs not in ("Cursor", "Antigravity"):
        return "Cursor"
    return fs


def wait_for_status(
    role,
    target_status,
    speak_path=None,
    require_nonempty_speak=False,
    enforce_speak_turn=False,
):
    speak_path = speak_path or DEFAULT_SPEAK
    print(f"--- COLLEGIATE ROOM: {role.upper()} ---")
    print(f"JSON Path: {os.path.abspath(STATUS_FILE)}")
    print(f"Speak Path: {os.path.abspath(speak_path)}")
    print(f"Waiting for status '{target_status}'...")
    if require_nonempty_speak:
        print("Mode: require non-empty communication-agent.speak.txt before turn (cold start safe).")
    if enforce_speak_turn:
        print("Mode: enforce turn order from last communication-agent.speak.txt segment + first_speaker in JSON.")

    last_reported_status = None
    last_block_reason = None
    last_json_hint_time = 0.0

    while True:
        if not os.path.exists(STATUS_FILE):
            print(f"ERROR: File {STATUS_FILE} not found relative to {os.getcwd()}!")
            time.sleep(5)
            continue

        try:
            with open(STATUS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)

            run_id = data.get("run_id", "N/A")
            role_data = next((s for s in data["pipeline"] if s["role"] == role), None)
            if not role_data:
                print(f"Error: Role {role} not found in status.json")
                sys.exit(1)

            current_status = role_data["status"]

            if current_status != last_reported_status:
                print(f"[{run_id}] Status changed: {current_status}")
                last_reported_status = current_status

            if current_status != target_status:
                # communication-agent.speak.txt alone does NOT grant a turn: status.json must be 'ready'.
                # Hint when the file already implies this role is next but JSON was not updated.
                speak_early = read_speak(speak_path)
                if (require_nonempty_speak or enforce_speak_turn) and not is_empty_or_whitespace(
                    speak_early
                ):
                    fs = get_first_speaker(data)
                    exp = expected_next_role_from_file(speak_early, fs)
                    now = time.monotonic()
                    if exp == role and now - last_json_hint_time >= 15.0:
                        print(
                            f"[{run_id}] HINT: communication-agent.speak.txt implies '{role}' is next, but "
                            f"this role's status is '{current_status}' (need '{target_status}'). "
                            f"Update status.json: set pipeline role '{role}' to '{target_status}'."
                        )
                        last_json_hint_time = now
                    elif (
                        exp is None
                        and enforce_speak_turn
                        and now - last_json_hint_time >= 20.0
                    ):
                        print(
                            f"[{run_id}] HINT: communication-agent.speak.txt is non-empty but turn could not be inferred "
                            f"(check last segment has `User:` / `Antigravity (...)` / `Cursor (...)` "
                            f"and `---` separators)."
                        )
                        last_json_hint_time = now
                time.sleep(3)
                continue

            # Status matches target — optional communication-agent.speak.txt gates
            speak_text = read_speak(speak_path)

            if require_nonempty_speak and is_empty_or_whitespace(speak_text):
                msg = "Blocking: communication-agent.speak.txt is empty (waiting for User to write)."
                if msg != last_block_reason:
                    print(msg)
                    last_block_reason = msg
                time.sleep(3)
                continue

            if enforce_speak_turn:
                first_speaker = get_first_speaker(data)
                expected = expected_next_role_from_file(speak_text, first_speaker)
                if expected is None:
                    msg = "Blocking: no speak segment yet (empty or no --- structure)."
                    if msg != last_block_reason:
                        print(msg)
                        last_block_reason = msg
                    time.sleep(3)
                    continue
                if expected != role:
                    msg = (
                        f"Blocking: speak turn expects '{expected}' next "
                        f"(first_speaker={first_speaker}), you are '{role}'."
                    )
                    if msg != last_block_reason:
                        print(msg)
                        last_block_reason = msg
                    time.sleep(3)
                    continue

            print(f"\n✅ TURN RECEIVED! Role: {role}")
            cap = round_cap_from_status(data)
            counts = count_agent_turns(speak_text)
            print(
                f"Turn counters (from communication-agent.speak.txt): Antigravity={counts['Antigravity']}, "
                f"Cursor={counts['Cursor']}, round_cap={cap}"
            )
            if cycle_complete_for_cap(counts, cap):
                print(
                    "Round boundary: both roles reached round_cap in communication-agent.speak.txt "
                    "(OK to stop agents / restart; see shared_logic.md §4)."
                )
            sys.exit(0)

        except Exception as e:
            print(f"Read error: {e}")
            time.sleep(2)


def main():
    parser = argparse.ArgumentParser(
        description="Wait until status.json shows role==target_status, with optional communication-agent.speak.txt gates."
    )
    parser.add_argument("role", help='Pipeline role, e.g. "Cursor"')
    parser.add_argument("target_status", help='Usually "ready"')
    parser.add_argument(
        "--speak",
        default=DEFAULT_SPEAK,
        help=f"Path to communication-agent.speak.txt (default: {DEFAULT_SPEAK})",
    )
    parser.add_argument(
        "--require-nonempty",
        action="store_true",
        help="Also require communication-agent.speak.txt to be non-empty (ignore ready until User wrote something).",
    )
    parser.add_argument(
        "--enforce-speak-turn",
        action="store_true",
        help="Also require that communication-agent.speak.txt last segment implies this role is next "
        "(uses first_speaker from status.json, default Cursor). Prevents both agents waking on ready.",
    )
    args = parser.parse_args()
    wait_for_status(
        args.role,
        args.target_status,
        speak_path=args.speak,
        require_nonempty_speak=args.require_nonempty,
        enforce_speak_turn=args.enforce_speak_turn,
    )


if __name__ == "__main__":
    main()
