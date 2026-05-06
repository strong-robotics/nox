import sounddevice as sd
import numpy as np
import whisper
import ollama
import json
import os
import subprocess
import time
import wave
import tempfile

# --- CONFIGURATION ---
PROJECT_ROOT = "/Users/yevhenvasylenko/Documents/Projects/Jarvis"
TASKS_FILE = os.path.join(PROJECT_ROOT, "multi-agent.tasks.txt")
STATUS_FILE = os.path.join(PROJECT_ROOT, "multi-agent/status.json")
LOG_DIR = os.path.join(PROJECT_ROOT, "multi-agent/.runtime")

# Voice Settings
FS = 16000  # Sample rate
SILENCE_THRESHOLD = 0.01  # Energy threshold for silence
SILENCE_DURATION = 2.0    # Seconds of silence before stopping recording

print("--- NOX: Initializing Brain ---")
# Load Whisper (base is good for Mac M-series)
stt_model = whisper.load_model("base")

def get_system_context():
    context = {}
    try:
        with open(STATUS_FILE, 'r') as f:
            context['status'] = json.load(f)
    except Exception as e:
        context['status'] = "Unknown"
    
    try:
        # Read last few lines of architect log for flavor
        log_path = os.path.join(LOG_DIR, "cursor_architect.log")
        if os.path.exists(log_path):
            with open(log_path, 'r') as f:
                context['recent_logs'] = f.readlines()[-5:]
    except:
        context['recent_logs'] = []
        
    return context

def nox_say(text):
    print(f"NOX: {text}")
    # Remove technical tags from speech
    speech_text = text.split("###")[0].strip()
    subprocess.run(["say", "-v", "Yuri", speech_text])

def process_command(text):
    context = get_system_context()
    
    system_prompt = f"""
Ты NOX — высокомерный, но преданный ИИ-ассистент проекта Nox.
Твой создатель — Тони Старк (разработчик). Общайся с ним с иронией и легким сарказмом.
Отвечай коротко (1-3 предложения).

ТЕКУЩИЙ КОНТЕКСТ ПРОЕКТА:
{json.dumps(context, indent=2, ensure_ascii=False)}

ТВОИ ВОЗМОЖНОСТИ:
1. Если пользователь хочет добавить задачу, ты должен:
   - Сформулировать её четко.
   - Оформить в блоке:
     ### NEW TASK ###
     Goal: [цель]
     Steps:
     - [шаг 1]
     - [шаг 2]
     ################
2. Если пользователь просит статус — расскажи, что делают агенты сейчас (на основе контекста).
3. Если это просто разговор — шути и иронизируй.

ВАЖНО: Никогда не объясняй, что ты делаешь. Просто делай.
"""

    try:
        response = ollama.generate(
            model='llama3.2',
            system=system_prompt,
            prompt=text
        )
        answer = response['response']
        
        # Check for task creation
        if "### NEW TASK ###" in answer:
            task_part = answer.split("### NEW TASK ###")[1].split("################")[0].strip()
            with open(TASKS_FILE, 'a') as f:
                f.write(f"\n\n# Task from Voice ({time.ctime()})\n{task_part}\n")
            
        nox_say(answer)
        
    except Exception as e:
        print(f"Error calling Ollama: {e}")
        nox_say("Сэр, мой мозг (Ollama) временно недоступен. Проверьте, запущен ли сервис.")

def record_audio():
    # Dynamically find default device info
    try:
        device_info = sd.query_devices(kind='input')
        current_fs = int(device_info['default_samplerate'])
        print(f"\n[СЛУШАЮ: {device_info['name']} ({current_fs}Hz)... Нажми Ctrl+C для выхода]")
    except Exception as e:
        print(f"Audio Device Error: {e}")
        return np.array([], dtype=np.float32)

    recording = []
    
    def callback(indata, frames, time, status):
        if status:
            print(f"SD Status: {status}")
        recording.append(indata.copy())

    # Use device=None to follow system default
    with sd.InputStream(samplerate=current_fs, channels=1, callback=callback, device=None):
        # record for a fixed duration
        time.sleep(5) 
    
    if not recording:
        return np.array([], dtype=np.float32)
        
    audio_data = np.concatenate(recording, axis=0)
    return audio_data.flatten()

def main_loop():
    nox_say("Системы инициализированы. Слушаю вас, сэр.")
    
    while True:
        try:
            # Simple interaction: Press Enter to speak
            input("\n>>> Нажми ENTER, чтобы сказать (или Ctrl+C для выхода)...")
            audio = record_audio()
            
            print("[ОБРАБОТКА РЕЧИ...]")
            result = stt_model.transcribe(audio, language='ru')
            text = result["text"].strip()
            
            if len(text) > 2:
                print(f"Вы: {text}")
                process_command(text)
            else:
                print("...ничего не услышал...")
                
        except KeyboardInterrupt:
            nox_say("Отключаюсь. Не разнесите тут всё без меня.")
            break

if __name__ == "__main__":
    main_loop()
