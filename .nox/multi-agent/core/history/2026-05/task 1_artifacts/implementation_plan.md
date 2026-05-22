# Implementation Plan: Create a red cube button widget

## Goal
Create `test/red_cube_button.dart` containing a StatelessWidget `RedCubeButton` — an 80×80 red square that prints "Red pressed" to console on tap.

## Owns (Files to Create/Modify)
- **Create**: `test/red_cube_button.dart` — new standalone widget file

## Integrates Into
- Standalone file, no integration points required

## Implementation Details
- **Stack**: Flutter
- **Approach**:
  1. Create `test/` directory if it does not exist
  2. Create `test/red_cube_button.dart`
  3. Import `package:flutter/material.dart`
  4. Define `RedCubeButton` as a `StatelessWidget`
  5. In `build()`, wrap a `GestureDetector` around a `Container` with:
     - `width: 80`, `height: 80`
     - `decoration: BoxDecoration(color: Colors.red)`
  6. `GestureDetector.onTap` calls `print('Red pressed')`
- **Key constraints**:
  - No external dependencies beyond `flutter/material.dart`
  - No `const` constructor required but preferred if applicable
  - No debug-only code, no TODOs
- **Reuse**: None — greenfield file

## [CHECK] Acceptance Criteria (For Tester)

### 1. File Structure
- [ ] File exists at `test/red_cube_button.dart`
- [ ] Class is named exactly `RedCubeButton`
- [ ] Class extends `StatelessWidget`

### 2. Behavior
- [ ] Widget renders a `Container` with `width: 80` and `height: 80`
- [ ] `BoxDecoration` uses `color: Colors.red`
- [ ] Tap triggers `print('Red pressed')`

### 3. Constraints
- [ ] No external dependencies other than `flutter/material.dart`
- [ ] No debug output, TODO comments, or hardcoded strings beyond the print message
