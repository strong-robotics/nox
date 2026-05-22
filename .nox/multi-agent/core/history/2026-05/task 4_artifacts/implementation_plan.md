# Implementation Plan: Create a yellow cube button widget with icon

## Goal
Create `test/yellow_cube_button.dart` containing a `YellowCubeButton` StatelessWidget — an 80x80 yellow square with a centered white star icon that prints "Yellow pressed" on tap.

## Owns (Files to Create/Modify)
- **Create**: `test/yellow_cube_button.dart` — new StatelessWidget file

## Integrates Into
- Standalone widget in `test/` directory — no integration into existing app tree required

## Implementation Details
- **Stack**: Flutter
- **Approach**:
  1. Create `test/yellow_cube_button.dart`
  2. Define `class YellowCubeButton extends StatelessWidget`
  3. In `build`, return a `GestureDetector` wrapping a `Container`
  4. Container: `width: 80, height: 80`, `decoration: BoxDecoration(color: Colors.yellow)`
  5. Container child: `Center` wrapping `Icon(Icons.star, color: Colors.white, size: 32)`
  6. `onTap` callback: `print('Yellow pressed')`
  7. No external packages — only `package:flutter/material.dart`
- **Key constraints**:
  - No external dependencies
  - Widget must be named exactly `YellowCubeButton`
  - File must be at `test/yellow_cube_button.dart`
  - Use `BoxDecoration` with `color: Colors.yellow`
  - Icon: `Icons.star`, `color: Colors.white`, `size: 32`
- **Reuse**: Mirror container/decoration pattern from previous cube buttons

## [CHECK] Acceptance Criteria (For Tester)
> Tester is skipped for this task — Developer is the last agent and handles cleanup.

### 1. File Structure
- [ ] File `test/yellow_cube_button.dart` exists
- [ ] Class is named `YellowCubeButton` and extends `StatelessWidget`

### 2. Visual Behavior
- [ ] Widget renders as 80x80 container
- [ ] Background color is `Colors.yellow` via `BoxDecoration`
- [ ] White star icon (`Icons.star`, size 32) centered inside

### 3. Interaction
- [ ] Tapping the widget calls `print('Yellow pressed')`
- [ ] Uses `GestureDetector` (or `InkWell`) for tap detection

### 4. Constraints
- [ ] No external dependencies beyond `package:flutter/material.dart`
- [ ] No debug output or TODO comments
- [ ] Build/lint passes (or note if unavailable)
