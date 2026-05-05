# Implementation Plan: Create Blue Cube Button Widget

## Task
Create a Flutter StatelessWidget named `BlueCubeButton`.

## Target File
`test/blue_cube_button.dart`

## Requirements
- Widget class: `BlueCubeButton` extends `StatelessWidget`
- An 80x80 square using `BoxDecoration` with `color: Colors.blue`
- Centered white `Text` label `"B"`
- On tap: prints `"Blue pressed"` to console via `print()`
- No external dependencies (only `package:flutter/material.dart`)

## Implementation

```dart
import 'package:flutter/material.dart';

class BlueCubeButton extends StatelessWidget {
  const BlueCubeButton({super.key});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => print('Blue pressed'),
      child: Container(
        width: 80,
        height: 80,
        decoration: const BoxDecoration(
          color: Colors.blue,
        ),
        alignment: Alignment.center,
        child: const Text(
          'B',
          style: TextStyle(color: Colors.white),
        ),
      ),
    );
  }
}
```

## Notes
- Use `BoxDecoration` consistent with prior tasks
- White "B" label centered inside the square
- `test/` directory already exists
