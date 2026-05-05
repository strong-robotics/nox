# Implementation Plan: Create Green Cube Button Widget with Counter

## Task
Create a Flutter StatefulWidget named `GreenCubeButton`.

## Target File
`test/green_cube_button.dart`

## Requirements
- Widget class: `GreenCubeButton` extends `StatefulWidget` with `_GreenCubeButtonState`
- An 80x80 square using `BoxDecoration` with `color: Colors.green`
- Internal `int _count = 0` state variable
- Each tap calls `setState` to increment `_count`
- Centered white `Text` displaying current `_count`
- No external dependencies (only `package:flutter/material.dart`)

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
        alignment: Alignment.center,
        child: Text(
          '$_count',
          style: const TextStyle(color: Colors.white),
        ),
      ),
    );
  }
}
```

## Notes
- StatefulWidget required for counter state
- Counter starts at 0, increments on each tap
- `test/` directory already exists
