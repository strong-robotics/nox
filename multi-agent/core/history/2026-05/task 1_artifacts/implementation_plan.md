# Implementation Plan: Create Red Cube Button Widget

## Task
Create a Flutter StatelessWidget named `RedCubeButton`.

## Target File
`test/red_cube_button.dart` (create `test/` directory if not present)

## Requirements
- Widget class: `RedCubeButton` extends `StatelessWidget`
- An 80x80 square using `BoxDecoration` with `color: Colors.red`
- On tap: prints `"Red pressed"` to console via `print()`
- No external dependencies (only `package:flutter/material.dart`)

## Implementation

```dart
import 'package:flutter/material.dart';

class RedCubeButton extends StatelessWidget {
  const RedCubeButton({super.key});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => print('Red pressed'),
      child: Container(
        width: 80,
        height: 80,
        decoration: const BoxDecoration(
          color: Colors.red,
        ),
      ),
    );
  }
}
```

## Notes
- Use `BoxDecoration` as specified
- No pubspec changes needed
- Create `test/` directory if it does not exist
- Tester is skipped — Developer is the last agent and must run `archive_task.py` + `pop_task.py` after completion
