"""
Helpers to parse communication-agent.speak.txt for Collegiate Room turn-taking.
All comments in English per project convention.
"""

from __future__ import annotations

import os
from typing import Any, Dict, Optional


def read_speak(path: str) -> str:
    if not path or not os.path.exists(path):
        return ""
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        return f.read()


def is_empty_or_whitespace(text: str) -> bool:
    return not (text or "").strip()


def get_last_segment(text: str) -> Optional[str]:
    """Return the last non-empty segment when splitting by '---' (marker lines)."""
    if not text or not text.strip():
        return None
    parts = [p.strip() for p in text.split("---") if p.strip()]
    if not parts:
        return None
    return parts[-1]


def segment_speaker(segment: str) -> Optional[str]:
    """
    Detect who owns this segment: User, Antigravity, or Cursor.
    Scan ALL lines — segments may include a preamble (e.g. title) before `User:`.
    """
    if not segment:
        return None
    for line in segment.splitlines():
        line = line.strip()
        if not line:
            continue
        if line.startswith("User:") or line.startswith("User "):
            return "User"
        if line.startswith("Antigravity"):
            return "Antigravity"
        if line.startswith("Cursor"):
            return "Cursor"
        # Do not return on unrelated lines; keep scanning for a role header.
    return None


def expected_next_role_after_segment(
    last_speaker: Optional[str],
    first_speaker: str,
) -> Optional[str]:
    """
    Who should speak next given the last completed segment's speaker.
    - Empty file / no segment -> None (nothing to answer yet).
    - Last segment User -> first_speaker (Cursor or Antigravity) starts the round.
    - Last Antigravity -> Cursor (unless first_speaker is Antigravity and we alternate; standard ping-pong).
    - Last Cursor -> Antigravity.

    Ping-pong: User -> first_speaker -> other agent -> ... (5 each enforced in speak text, not here).
    """
    if last_speaker is None:
        return None
    if last_speaker == "User":
        fs = first_speaker.strip()
        if fs not in ("Cursor", "Antigravity"):
            fs = "Cursor"
        return fs
    if last_speaker == "Antigravity":
        return "Cursor"
    if last_speaker == "Cursor":
        return "Antigravity"
    return None


def expected_next_role_from_file(text: str, first_speaker: str = "Cursor") -> Optional[str]:
    """Combine get_last_segment + expected_next_role_after_segment."""
    seg = get_last_segment(text)
    if not seg:
        return None
    sp = segment_speaker(seg)
    return expected_next_role_after_segment(sp, first_speaker)


def count_agent_turns(text: str) -> Dict[str, int]:
    """
    Count completed agent segments in communication-agent.speak.txt (split by ---). User blocks are not counted.
    """
    counts: Dict[str, int] = {"Antigravity": 0, "Cursor": 0}
    if not text or not text.strip():
        return counts
    parts = [p.strip() for p in text.split("---") if p.strip()]
    for part in parts:
        sp = segment_speaker(part)
        if sp in counts:
            counts[sp] += 1
    return counts


def round_cap_from_status(data: Optional[Dict[str, Any]]) -> int:
    """Default round_cap (denominator for per-role x/5) from status.json."""
    if not data:
        return 5
    cap = data.get("round_cap", 5)
    try:
        n = int(cap)
        return max(1, n)
    except (TypeError, ValueError):
        return 5


def cycle_complete_for_cap(counts: Dict[str, int], cap: int) -> bool:
    """True when both roles have at least `cap` replies in this transcript."""
    return counts.get("Antigravity", 0) >= cap and counts.get("Cursor", 0) >= cap


def merge_turn_counters_into_status(data: Dict[str, Any], speak_text: str) -> bool:
    """
    Set data['turn_counters'] from communication-agent.speak.txt; ensure data['round_cap'] exists (default 5).
    Returns True if turn_counters changed.
    """
    if "round_cap" not in data:
        data["round_cap"] = 5
    else:
        data["round_cap"] = round_cap_from_status(data)
    counts = count_agent_turns(speak_text)
    prev = data.get("turn_counters")
    if prev != counts:
        data["turn_counters"] = counts
        return True
    return False
