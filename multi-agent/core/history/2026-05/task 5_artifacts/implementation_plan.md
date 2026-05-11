# Implementation Plan: Purple Cube Button with Disable After 3 Taps

## Task
Create a Flutter `PurpleCubeButton` StatefulWidget in `test/purple_cube_button.dart`.

## Reference
- `test/green_cube_button.dart` — StatefulWidget + counter pattern (direct template)

## File to Create
`test/purple_cube_button.dart`

## Requirements
- Widget class: `PurpleCubeButton` (StatefulWidget)
- Dimensions: 80×80
- Initial appearance: solid purple square (`Colors.purple`)
- Internal tap counter starting at 0, displayed as centered white text
- After 3 taps: background turns grey (`Colors.grey`), further taps ignored
- `GestureDetector.onTap` set to `null` when `_count >= 3`
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
    final bool disabled = _count >= 3;
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
- `disabled` flag from `_count >= 3` — single source of truth for color and tap handler.
- `onTap: disabled ? null : ...` disables GestureDetector when limit reached.
- Counter shows "3" when disabled.
