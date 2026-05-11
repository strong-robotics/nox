# Implementation Plan: Purple Cube Button Disables After 4 Taps

## Task
Create a Flutter `PurpleCubeButton` StatefulWidget in `test/white_cube_button.dart`.

## Reference
- `test/purple_cube_button.dart` (task 5) — same pattern, threshold 3→4

## File to Create
`test/white_cube_button.dart`

## Requirements
- Widget class: `PurpleCubeButton` (StatefulWidget)
- File name: `test/white_cube_button.dart` (per instructions)
- Dimensions: 80×80
- Initial appearance: solid purple square (`Colors.purple`)
- Internal tap counter starting at 0, displayed as centered white text
- After 4 taps: background turns grey (`Colors.grey`), further taps ignored
- `GestureDetector.onTap` set to `null` when `_count >= 4`
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
    final bool disabled = _count >= 4;
    return GestureDetector(
      onTap: disabled ? null : () => setState(() => _count++),
      child: Container(
        width: 80,
        height: 80,
        decoration: BoxDecoration(
          color: disabled ? Colors.grey : Colors.purple,
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
- Identical to task 5 pattern but threshold is `_count >= 4`.
- File name is `white_cube_button.dart` despite containing `PurpleCubeButton`.
- Counter shows "4" when disabled.
