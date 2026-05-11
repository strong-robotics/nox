# Implementation Plan: Yellow Cube Button Widget with Icon

## Task
Create a Flutter `YellowCubeButton` StatelessWidget in `test/yellow_cube_button.dart`.

## Reference
- `test/blue_cube_button.dart` — centered child inside Container pattern

## File to Create
`test/yellow_cube_button.dart`

## Requirements
- Widget class: `YellowCubeButton` (StatelessWidget)
- Dimensions: 80×80
- Appearance: solid yellow square via `BoxDecoration(color: Colors.yellow)`
- Centered `Icons.star` icon, color: Colors.white, size: 32
- Behavior: on tap → `print("Yellow pressed")`
- No external package dependencies (Flutter SDK only)

## Implementation

```dart
import 'package:flutter/material.dart';

class YellowCubeButton extends StatelessWidget {
  const YellowCubeButton({super.key});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => print('Yellow pressed'),
      child: Container(
        width: 80,
        height: 80,
        decoration: const BoxDecoration(
          color: Colors.yellow,
        ),
        child: const Center(
          child: Icon(
            Icons.star,
            color: Colors.white,
            size: 32,
          ),
        ),
      ),
    );
  }
}
```

## Notes
- Use `Icon` widget (not `Text`) for the centered child.
- `Icons.star` available via `package:flutter/material.dart` — no extra imports.
- Same GestureDetector + Container pattern as previous tasks.
