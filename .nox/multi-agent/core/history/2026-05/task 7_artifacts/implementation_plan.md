# Implementation Plan: Create an orange cube button that disables after 5 taps

## Goal
Create `test/orange_cube_button.dart` containing a `PurpleCubeButton` StatefulWidget — an 80x80 orange square that shows a tap counter as white text, turns grey after 5 taps, and ignores further taps.

## Owns (Files to Create/Modify)
- **Create**: `test/orange_cube_button.dart` — new StatefulWidget file (note: filename is orange_cube_button.dart, class name is PurpleCubeButton per instructions)

## Integrates Into
- Standalone widget in `test/` directory — no integration into existing app tree required

## Implementation Details
- **Stack**: Flutter
- **Approach**:
  1. Create `test/orange_cube_button.dart`
  2. Define `class PurpleCubeButton extends StatefulWidget` with `_PurpleCubeButtonState extends State<PurpleCubeButton>`
  3. State holds `int _count = 0` and `bool _disabled = false`
  4. In `build`, return a `GestureDetector` wrapping a `Container`
  5. Container: `width: 80, height: 80`, `decoration: BoxDecoration(color: _disabled ? Colors.grey : Colors.orange)`
  6. Container child: `Center` wrapping `Text('$_count', style: TextStyle(color: Colors.white))`
  7. `onTap` callback: if `_disabled` return; else `setState(() { _count++; if (_count >= 5) _disabled = true; })`
  8. No external packages — only `package:flutter/material.dart`
- **Key constraints**:
  - Class must be named exactly `PurpleCubeButton` (per instructions)
  - File must be at `test/orange_cube_button.dart`
  - Disable threshold is exactly 5 taps
  - Color switches to `Colors.grey` when disabled
  - No external dependencies
- **Reuse**: Mirror pattern from `test/purple_cube_button.dart` and `test/white_cube_button.dart`, change color to `Colors.orange` and threshold to 5

## [CHECK] Acceptance Criteria (For Tester)

### 1. File Structure
- [ ] File `test/orange_cube_button.dart` exists
- [ ] Class `PurpleCubeButton` extends `StatefulWidget`
- [ ] Companion `_PurpleCubeButtonState` exists

### 2. Visual Behavior
- [ ] Widget renders as 80x80 container
- [ ] Background color is `Colors.orange` via `BoxDecoration` when active
- [ ] Background color switches to `Colors.grey` after 5 taps
- [ ] Tap counter displayed as white text centered inside

### 3. Interaction
- [ ] Counter increments on each tap (up to 5)
- [ ] After 5th tap button is disabled — further taps have no effect
- [ ] Uses `GestureDetector` (or `InkWell`) for tap detection

### 4. Constraints
- [ ] No external dependencies beyond `package:flutter/material.dart`
- [ ] No debug output or TODO comments
- [ ] Build/lint passes (or note if unavailable)
