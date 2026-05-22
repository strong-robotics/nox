# Implementation Plan: Create a green cube button widget with counter

## Goal
Create `test/green_cube_button.dart` containing a StatefulWidget `GreenCubeButton` — an 80×80 green square whose tap count is displayed as centered white text and increments on each tap.

## Owns (Files to Create/Modify)
- **Create**: `test/green_cube_button.dart` — new standalone stateful widget file

## Integrates Into
- Standalone file, no integration points required

## Implementation Details
- **Stack**: Flutter
- **Approach**:
  1. Import `package:flutter/material.dart`
  2. Define `GreenCubeButton` as a `StatefulWidget` with `const` constructor and `createState()` returning `_GreenCubeButtonState`
  3. Define `_GreenCubeButtonState extends State<GreenCubeButton>`:
     - Private field `int _count = 0`
     - `onTap`: call `setState(() { _count++; })`
     - `build()`: `GestureDetector` wrapping a `Container`:
       - `width: 80`, `height: 80`
       - `decoration: BoxDecoration(color: Colors.green)`
       - `child: Center(child: Text('$_count', style: TextStyle(color: Colors.white)))`
- **Key constraints**:
  - No external dependencies beyond `flutter/material.dart`
  - Must use `StatefulWidget` — counter requires mutable state
  - No debug-only code, no TODOs
- **Reuse**: Pattern from `test/red_cube_button.dart` and `test/blue_cube_button.dart` for widget structure

## [CHECK] Acceptance Criteria (For Tester)

### 1. File Structure
- [ ] File exists at `test/green_cube_button.dart`
- [ ] Class is named exactly `GreenCubeButton`
- [ ] Class extends `StatefulWidget`
- [ ] State class exists (e.g. `_GreenCubeButtonState`)

### 2. Behavior
- [ ] Widget renders a `Container` with `width: 80` and `height: 80`
- [ ] `BoxDecoration` uses `color: Colors.green`
- [ ] Counter value displayed as centered white text
- [ ] Tap increments the counter via `setState`

### 3. Constraints
- [ ] No external dependencies other than `flutter/material.dart`
- [ ] No debug output or TODO comments
