import sounddevice as sd

print("--- AVAILABLE AUDIO DEVICES ---")
devices = sd.query_devices()
for i, d in enumerate(devices):
    kind = ""
    if d['max_input_channels'] > 0: kind += " [INPUT]"
    if d['max_output_channels'] > 0: kind += " [OUTPUT]"
    default = ""
    if i == sd.default.device[0]: default += " (DEFAULT INPUT)"
    if i == sd.default.device[1]: default += " (DEFAULT OUTPUT)"
    
    print(f"{i}: {d['name']}{kind}{default}")

print("\n--- CURRENT DEFAULT SETTINGS ---")
print(f"Input: {sd.default.device[0]}")
print(f"Output: {sd.default.device[1]}")
