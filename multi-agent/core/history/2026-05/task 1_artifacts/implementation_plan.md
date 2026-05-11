# Implementation Plan: Red Cube Button Widget

## Task
Create a Flutter `RedCubeButton` StatelessWidget in `test/red_cube_button.dart`.

## File to Create
`test/red_cube_button.dart`

## Requirements
- Widget class: `RedCubeButton` (StatelessWidget)
- Dimensions: 80×80
- Appearance: solid red square via `BoxDecoration(color: Colors.red)`
- Behavior: on tap → `print("Red pressed")`
- No external package dependencies (Flutter SDK only)

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
- Use `GestureDetector` wrapping a `Container` for tap + visual.
- `print()` is acceptable per instructions.
- No imports beyond `package:flutter/material.dart`.
