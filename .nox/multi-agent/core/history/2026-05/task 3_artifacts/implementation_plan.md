# Implementation Plan: Create a green cube button widget with counter

## Goal
Create `test/green_cube_button.dart` containing a `GreenCubeButton` StatefulWidget — an 80x80 green square that displays an internal tap counter as centered white text, incrementing on each tap.

## Owns (Files to Create/Modify)
- **Create**: `test/green_cube_button.dart` — new StatefulWidget file

## Integrates Into
- Standalone widget in `test/` directory — no integration into existing app tree required

## Implementation Details
- **Stack**: Flutter
- **Approach**:
  1. Create `test/green_cube_button.dart`
  2. Define `class GreenCubeButton extends StatefulWidget` with `_GreenCubeButtonState extends State<GreenCubeButton>`
  3. State holds `int _count = 0`
  4. In `build`, return a `GestureDetector` wrapping a `Container`
  5. Container: `width: 80, height: 80`, `decoration: BoxDecoration(color: Colors.green)`
  6. Container child: `Center` wrapping `Text('$_count', style: TextStyle(color: Colors.white))`
  7. `onTap` callback: `setState(() { _count++; })`
  8. No external packages — only `package:flutter/material.dart`
- **Key constraints**:
  - No external dependencies
  - Widget must be named exactly `GreenCubeButton` (StatefulWidget)
  - File must be at `test/green_cube_button.dart`
  - Use `BoxDecoration` with `color: Colors.green`
  - Counter text must be white and centered
  - State must be internal
- **Reuse**: Mirror container/decoration pattern from `test/red_cube_button.dart`

## [CHECK] Acceptance Criteria (For Tester)

### 1. File Structure
- [ ] File `test/green_cube_button.dart` exists
- [ ] Class `GreenCubeButton` extends `StatefulWidget`
- [ ] Companion `_GreenCubeButtonState` exists and extends `State<GreenCubeButton>`

### 2. Visual Behavior
- [ ] Widget renders as 80x80 container
- [ ] Background color is `Colors.green` via `BoxDecoration`
- [ ] Counter value displayed as white text centered inside the square

### 3. Interaction
- [ ] Tapping the widget increments the internal counter via `setState`
- [ ] Counter starts at 0 and increments by 1 per tap
- [ ] Uses `GestureDetector` (or `InkWell`) for tap detection

### 4. Constraints
- [ ] No external dependencies beyond `package:flutter/material.dart`
- [ ] No debug output or TODO comments
- [ ] Build/lint passes (or note if unavailable)
