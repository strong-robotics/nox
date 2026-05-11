# Implementation Plan: Orange Cube Button Disables After 5 Taps

## Task
Create a Flutter `PurpleCubeButton` StatefulWidget in `test/orange_cube_button.dart`.

## Reference
- `test/purple_cube_button.dart` (task 5) / `test/white_cube_button.dart` (task 6) — same pattern, threshold 4→5, color purple→orange

## File to Create
`test/orange_cube_button.dart`

## Requirements
- Widget class: `PurpleCubeButton` (StatefulWidget) — per instructions
- File name: `test/orange_cube_button.dart`
- Dimensions: 80×80
- Initial appearance: solid orange square (`Colors.orange`)
- Internal tap counter starting at 0, displayed as centered white text
- After 5 taps: background turns grey (`Colors.grey`), further taps ignored
- `GestureDetector.onTap` set to `null` when `_count >= 5`
- No external package dependencies (Flutter SDK only)

## Implementation

```dart
import 'package:flutter/material.dart';

class PurpleCubeButton extends StatefulWidget {
  const PurpleCubeButton({super.key});

  @override
  State<PurpleCubeButton> createState() => _PurpleCubeButtonState();
}

class _PurpleCubeButtonState extends State<PurpleCubeButton> {
  int _count = 0;

  @override
  Widget build(BuildContext context) {
    final bool disabled = _count >= 5;
    return GestureDetector(
      onTap: disabled ? null : () => setState(() => _count++),
      child: Container(
        width: 80,
        height: 80,
        decoration: BoxDecoration(
          color: disabled ? Colors.grey : Colors.orange,
        ),
        child: Center(
          child: Text(
            '$_count',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      ),
    );
  }
}
```

## Notes
- Same pattern as tasks 5 & 6 — only color (`Colors.orange`) and threshold (`>= 5`) differ.
- Class name is `PurpleCubeButton` per instructions despite orange color.
- Counter shows "5" when disabled.
