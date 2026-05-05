# Implementation Plan: Create Yellow Cube Button Widget with Icon

## Task
Create a Flutter StatelessWidget named `YellowCubeButton`.

## Target File
`test/yellow_cube_button.dart`

## Requirements
- Widget class: `YellowCubeButton` extends `StatelessWidget`
- An 80x80 square using `BoxDecoration` with `color: Colors.yellow`
- Centered `Icon(Icons.star, color: Colors.white, size: 32)`
- On tap: prints `"Yellow pressed"` to console via `print()`
- No external dependencies (only `package:flutter/material.dart`)

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
        alignment: Alignment.center,
        child: const Icon(
          Icons.star,
          color: Colors.white,
          size: 32,
        ),
      ),
    );
  }
}
```

## Notes
- Icon replaces text label
- `test/` directory already exists
