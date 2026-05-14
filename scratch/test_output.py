import subprocess
import os

print("--- ТЕСТ АУДИО-ВЫХОДА ---")
test_file = "/System/Library/Sounds/Glass.aiff"

print(f"Attempting to play {test_file} via afplay...")
try:
    subprocess.run(["afplay", test_file], check=True)
    print("Success! You should have heard 'Стекло'.")
except Exception as e:
    print(f"Error during playback: {e}")

print("\nAttempting to play голос через 'say'...")
try:
    subprocess.run(["say", "Test audio output"], check=True)
    print("Успешно! You should have heard the phrase 'Test audio output'.")
except Exception as e:
    print(f"Error 'say': {e}")
