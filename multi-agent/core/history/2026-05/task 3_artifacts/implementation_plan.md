# Implementation Plan: Green Cube Button Widget with Counter

## Task
Create a Flutter `GreenCubeButton` StatefulWidget in `test/green_cube_button.dart`.

## Reference
- `test/blue_cube_button.dart` — centered child pattern
- `test/red_cube_button.dart` — GestureDetector + Container base

## File to Create
`test/green_cube_button.dart`

## Requirements
- Widget class: `GreenCubeButton` (StatefulWidget)
- Dimensions: 80×80
- Appearance: solid green square (`Colors.green`)
- Internal counter starting at 0
- Tap increments counter via `setState`
- Counter displayed as centered white text inside cube
- No external package dependencies (Flutter SDK only)

## Implementation

```dart
import 'package:flutter/material.dart';

class GreenCubeButton extends StatefulWidget {
  const GreenCubeButton({super.key});

  @override
  State<GreenCubeButton> createState() => _GreenCubeButtonState();
}

class _GreenCubeButtonState extends State<GreenCubeButton> {
  int _count = 0;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => setState(() => _count++),
      child: Container(
        width: 80,
        height: 80,
        decoration: const BoxDecoration(
          color: Colors.green,
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
- `StatefulWidget` + `_GreenCubeButtonState` — different from tasks 1 & 2 (StatelessWidget).
- `setState(() => _count++)` triggers rebuild with updated counter.
- No `print()` call — counter display is the tap feedback.
