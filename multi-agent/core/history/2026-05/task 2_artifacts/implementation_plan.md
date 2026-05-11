# Implementation Plan: Blue Cube Button Widget

## Task
Create a Flutter `BlueCubeButton` StatelessWidget in `test/blue_cube_button.dart`.

## Reference
`test/red_cube_button.dart` — same GestureDetector + Container pattern, change color and add centered label.

## File to Create
`test/blue_cube_button.dart`

## Requirements
- Widget class: `BlueCubeButton` (StatelessWidget)
- Dimensions: 80×80
- Appearance: solid blue square via `BoxDecoration(color: Colors.blue)`
- Centered white "B" text label inside
- Behavior: on tap → `print("Blue pressed")`
- No external package dependencies (Flutter SDK only)

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
        child: const Center(
          child: Text(
            'B',
            style: TextStyle(
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
- Add `child: Center(child: Text('B', ...))` inside the Container.
- No imports beyond `package:flutter/material.dart`.
