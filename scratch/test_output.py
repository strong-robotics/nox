import subprocess
import os

print("--- ТЕСТ АУДИО-ВЫХОДА ---")
test_file = "/System/Library/Sounds/Glass.aiff"

print(f"Попытка воспроизвести {test_file} через afplay...")
try:
    subprocess.run(["afplay", test_file], check=True)
    print("Успешно! Вы должны были услышать звук 'Стекло'.")
except Exception as e:
    print(f"Ошибка при воспроизведении: {e}")

print("\nПопытка воспроизвести голос через 'say'...")
try:
    subprocess.run(["say", "Test audio output"], check=True)
    print("Успешно! Вы должны были услышать фразу 'Test audio output'.")
except Exception as e:
    print(f"Ошибка 'say': {e}")
