# Implementation Plan: Create a purple cube button that disables after 3 taps

## Goal
Create `test/purple_cube_button.dart` containing a `PurpleCubeButton` StatefulWidget — an 80x80 purple square that shows a tap counter as white text, turns grey after 3 taps, and ignores further taps.

## Owns (Files to Create/Modify)
- **Create**: `test/purple_cube_button.dart` — new StatefulWidget file

## Integrates Into
- Standalone widget in `test/` directory — no integration into existing app tree required

## Implementation Details
- **Stack**: Flutter
- **Approach**:
  1. Create `test/purple_cube_button.dart`
  2. Define `class PurpleCubeButton extends StatefulWidget` with `_PurpleCubeButtonState extends State<PurpleCubeButton>`
  3. State holds `int _count = 0` and `bool _disabled = false`
  4. In `build`, return a `GestureDetector` wrapping a `Container`
  5. Container: `width: 80, height: 80`, `decoration: BoxDecoration(color: _disabled ? Colors.grey : Colors.purple)`
  6. Container child: `Center` wrapping `Text('$_count', style: TextStyle(color: Colors.white))`
  7. `onTap` callback: if `_disabled` return; else `setState(() { _count++; if (_count >= 3) _disabled = true; })`
  8. No external packages — only `package:flutter/material.dart`
- **Key constraints**:
  - Widget must be named exactly `PurpleCubeButton`
  - File must be at `test/purple_cube_button.dart`
  - Disable threshold is exactly 3 taps
  - Color switches to `Colors.grey` when disabled (not just visually — taps must be ignored)
  - No external dependencies
- **Reuse**: Mirror StatefulWidget pattern from `test/green_cube_button.dart`

## [CHECK] Acceptance Criteria (For Tester)
> Tester is skipped for this task — Developer is the last agent and handles cleanup.

### 1. File Structure
- [ ] File `test/purple_cube_button.dart` exists
- [ ] Class `PurpleCubeButton` extends `StatefulWidget`
- [ ] Companion `_PurpleCubeButtonState` exists

### 2. Visual Behavior
- [ ] Widget renders as 80x80 container
- [ ] Background color is `Colors.purple` via `BoxDecoration` when active
- [ ] Background color switches to `Colors.grey` after 3 taps
- [ ] Tap counter displayed as white text centered inside

### 3. Interaction
- [ ] Counter increments on each tap (up to 3)
- [ ] After 3rd tap button is disabled — further taps have no effect
- [ ] Uses `GestureDetector` (or `InkWell`) for tap detection

### 4. Constraints
- [ ] No external dependencies beyond `package:flutter/material.dart`
- [ ] No debug output or TODO comments
- [ ] Build/lint passes (or note if unavailable)
