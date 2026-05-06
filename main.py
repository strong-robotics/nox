import asyncio
import json
import os
import subprocess
import threading
import time
import numpy as np
import sounddevice as sd
import whisper
import ollama
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Enable CORS for Next.js dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- CONFIGURATION ---
PROJECT_ROOT = "/Users/yevhenvasylenko/Documents/Projects/Jarvis"
TASKS_FILE = os.path.join(PROJECT_ROOT, "multi-agent.tasks.txt")
STATUS_FILE = os.path.join(PROJECT_ROOT, "multi-agent/status.json")
PIPER_MODEL = os.path.join(PROJECT_ROOT, "piper_models/en_GB-alan-medium.onnx")
PIPER_EXE = os.path.join(PROJECT_ROOT, "venv/bin/piper")
TEMP_WAV = "/tmp/nox_raw.wav"
EFFECT_WAV = "/tmp/nox_fx.wav"

MEMORY_FILE = os.path.join(PROJECT_ROOT, "database", "brain_memory.json")
HISTORY_FILE = os.path.join(PROJECT_ROOT, "database", "chat_history.json")

# State Management
class NoxState:
    IDLE = "idle"
    LISTENING = "listening"
    PROCESSING = "processing"
    SPEAKING = "speaking"

current_state = NoxState.IDLE
active_connections = []
is_running = False

def load_memory():
    try:
        with open(MEMORY_FILE, 'r') as f:
            return json.load(f)
    except:
        return {"user_preferences": [], "learned_facts": []}

def save_memory(memory):
    try:
        with open(MEMORY_FILE, 'w') as f:
            json.dump(memory, f, indent=2)
    except Exception as e:
        print(f"Memory save error: {e}")

def load_history():
    try:
        with open(HISTORY_FILE, 'r') as f:
            return json.load(f)
    except:
        return []

def save_history(history):
    try:
        with open(HISTORY_FILE, 'w') as f:
            json.dump(history, f, indent=2)
    except:
        pass

conversation_history = load_history() # Persistent memory

# Load models (Using 'base' for speed and reliability)
print("Loading Whisper model (base)...")
stt_model = whisper.load_model("base")

async def broadcast_state(state: str):
    global current_state
    current_state = state
    message = json.dumps({"state": state})
    for connection in active_connections:
        try:
            await connection.send_text(message)
        except:
            pass

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    # Send initial state
    await websocket.send_text(json.dumps({"state": current_state}))
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        active_connections.remove(websocket)

def get_system_context():
    context = {"status": {}, "tasks": []}
    try:
        if os.path.exists(STATUS_FILE):
            with open(STATUS_FILE, 'r') as f:
                context["status"] = json.load(f)
    except: pass
    
    try:
        if os.path.exists(TASKS_FILE):
            with open(TASKS_FILE, 'r') as f:
                content = f.read()
                # Simple parsing of '--- task X' blocks
                tasks = content.split("--- task")
                for t in tasks[1:]: # Skip preamble
                    lines = t.strip().split("\n")
                    action = "Unknown"
                    for l in lines:
                        if l.startswith("Action:"):
                            action = l.replace("Action:", "").strip()
                            break
                    context["tasks"].append(action)
    except: pass
    
    try:
        # Read Architect Logs
        arch_log = os.path.join(PROJECT_ROOT, "multi-agent/.runtime/cursor_architect.log")
        if os.path.exists(arch_log):
            with open(arch_log, 'r') as f:
                context["architect_logs"] = f.readlines()[-5:]
        
        # Read Codex Logs
        codex_log = os.path.join(PROJECT_ROOT, "multi-agent/.runtime/codex_developer_supervisor.log")
        if os.path.exists(codex_log):
            with open(codex_log, 'r') as f:
                context["codex_logs"] = f.readlines()[-5:]
    except: pass

    return context

def nox_say(text):
    asyncio.run(broadcast_state(NoxState.SPEAKING))
    # Remove memory tags from speech
    clean_text = text.split("[MEMORY:")[0].split("###")[0].strip()
    print(f"NOX: {clean_text}")
    
    # Clean up text for speech
    speech_text = clean_text.replace('"', '\\"').replace('*', '')
    
    # Generate speech using Piper
    try:
        # 1. Raw Synthesis
        cmd_synth = f'echo "{speech_text}" | {PIPER_EXE} -m {PIPER_MODEL} -f {TEMP_WAV}'
        subprocess.run(cmd_synth, shell=True, check=True)
        
        # 2. Balanced Cyber Echo FX (Electronic but Clean)
        cmd_fx = f'sox {TEMP_WAV} {EFFECT_WAV} vol 0.8 pitch -80 highpass 150 overdrive 7 echo 0.8 0.8 25 0.4 50 0.25 compand 0.05,0.2 6:-70,-60,-20 -5 -90 0.1 treble +3'
        subprocess.run(cmd_fx, shell=True, check=False)
        
        # 3. Play the FX WAV
        subprocess.run(["afplay", EFFECT_WAV if os.path.exists(EFFECT_WAV) else TEMP_WAV])
    except Exception as e:
        print(f"Audio error: {e}")
        subprocess.run(["say", "-v", "Serena", speech_text])
        
    asyncio.run(broadcast_state(NoxState.IDLE))

def get_directory_structure(root_dir):
    structure = []
    ignored = {'.git', 'node_modules', 'venv', '__pycache__', '.next', 'piper_models'}
    try:
        for root, dirs, files in os.walk(root_dir):
            # Filter ignored directories
            dirs[:] = [d for d in dirs if d not in ignored]
            rel_path = os.path.relpath(root, root_dir)
            if rel_path == ".":
                rel_path = ""
            
            for f in files:
                if f.startswith('.'): continue
                structure.append(os.path.join(rel_path, f))
        return structure[:50] # Limit to 50 files for context sanity
    except:
        return []

is_awake = False # Nox starts in dormant mode

def process_voice_command(text, is_greeting=False):
    global conversation_history, is_awake
    
    # Check for Wake Word
    text_lower = text.lower()
    wake_triggers = ["wake up", "hey", "nox", "hello nox"]
    
    if not is_awake and not is_greeting:
        if any(trigger in text_lower for trigger in wake_triggers):
            is_awake = True
            print("--- NOX IS NOW AWAKE ---")
            # Try to catch the actual command if it follows the wake word
            for trigger in wake_triggers:
                if trigger in text_lower:
                    text = text_lower.split(trigger)[-1].strip()
                    break
            if not text:
                text = "Hello, I am here." 
        else:
            return # Stay dormant

    asyncio.run(broadcast_state(NoxState.PROCESSING))
    context = get_system_context()
    files = get_directory_structure(PROJECT_ROOT)
    memory = load_memory()
    
    system_prompt = f"""
You are NOX, a sharp-witted AI assistant. Eugene is your creator.
RULES:
1. Keep it simple and natural. No jargon.
2. BREVITY: Max 2 short sentences. 
3. PERSONALITY: Cool, direct, slightly sarcastic.
4. FACTS: Use the provided data below to answer Eugene's questions about tasks and agents.

REAL-TIME DATA:
- Tasks in Queue: {len(context['tasks'])}
- Active Task: {context['status'].get('current_task', 'None')}
- Agent Statuses: {", ".join([f"{a['role']}: {a['status']}" for a in context['status'].get('pipeline', [])])}
- Recent Logs: { (context.get('architect_logs', []) + context.get('codex_logs', []))[-5:] }
- Task List: {", ".join(context['tasks'][:5])}
"""

    if is_greeting:
        prompt = "System initialized. Greet Eugene as NOX."
    else:
        prompt = text

    conversation_history.append({"role": "user", "content": prompt})
    if len(conversation_history) > 15:
        conversation_history = conversation_history[-15:]
    save_history(conversation_history)

    try:
        messages = [{"role": "system", "content": system_prompt}] + conversation_history
        response = ollama.chat(model='llama3.2', messages=messages, options={"temperature": 0.8})
        answer = response['message']['content']
        
        if "[MEMORY:" in answer:
            new_fact = answer.split("[MEMORY:")[1].split("]")[0].strip()
            memory = load_memory()
            if new_fact not in memory["learned_facts"]:
                memory["learned_facts"].append(new_fact)
                save_memory(memory)

        conversation_history.append({"role": "assistant", "content": answer})
        save_history(conversation_history)
        
        nox_say(answer)
    except Exception as e:
        print(f"Ollama error: {e}")
        nox_say("Sir, my neural grid is flickering.")

def voice_loop():
    global is_running, is_awake
    target_fs = 16000
    chunk_size = 1024
    silence_threshold = 0.01
    silence_duration_limit = 1.0
    
    while is_running:
        try:
            # Dynamically discover default device each time we start listening
            try:
                device_info = sd.query_devices(kind='input')
                native_fs = int(device_info['default_samplerate'])
                print(f"--- Audio Input: {device_info['name']} ({native_fs}Hz) ---")
            except Exception as e:
                print(f"Audio Device Error: {e}")
                time.sleep(2)
                continue

            asyncio.run(broadcast_state(NoxState.LISTENING if is_awake else NoxState.IDLE))
            
            audio_buffer = []
            silent_chunks = 0
            has_started_talking = False
            
            target_fs = 16000
            # Use hardware resampling by requesting target_fs directly
            with sd.InputStream(samplerate=target_fs, device=None, channels=1, blocksize=chunk_size) as stream:
                print(f"--- Listening (16kHz, Ready for command)... ---")
                while is_running:
                    data, _ = stream.read(chunk_size)
                    # CRITICAL: Always copy the data as sounddevice might reuse the buffer
                    audio_buffer.append(data.copy())
                    
                    volume_norm = np.linalg.norm(data) / np.sqrt(len(data))
                    
                    # Periodic debug print for volume
                    if len(audio_buffer) % 50 == 0:
                        print(f"DEBUG: Current Vol: {volume_norm:.5f} (Target > 0.001)")

                    if volume_norm > 0.001: # Extreme sensitivity
                        if not has_started_talking:
                            print(f"--- Signal detected (Vol: {volume_norm:.5f}) ---")
                        has_started_talking = True
                        silent_chunks = 0
                    elif has_started_talking:
                        silent_chunks += 1
                    
                    if has_started_talking and (silent_chunks * chunk_size / target_fs) > silence_duration_limit:
                        print(f"--- End of speech detected. Captured {len(audio_buffer)} chunks. ---")
                        break
                    if len(audio_buffer) * chunk_size / target_fs > 15: break 

            if len(audio_buffer) > 0 and has_started_talking:
                print("--- Transcribing... ---")
                audio_resampled = np.concatenate(audio_buffer).flatten()

                # Normalize audio to boost signal for Whisper
                max_vol = np.max(np.abs(audio_resampled))
                if max_vol > 0:
                    audio_resampled = audio_resampled / max_vol

                # DEBUG: Save recorded audio to check what Whisper sees
                import soundfile as sf
                sf.write('/tmp/nox_debug_input.wav', audio_resampled, target_fs)

                # Use English as requested by user
                result = stt_model.transcribe(audio_resampled, language='en')
                text = result["text"].strip()
                
                print(f"DEBUG: Heard text: '{text}'")
                if len(text) > 1:
                    process_voice_command(text)
            
            time.sleep(0.1)
        except Exception as e:
            print(f"Loop Error: {e}")
            time.sleep(1)

@app.post("/start")
async def start_nox():
    global is_running
    if not is_running:
        is_running = True
        threading.Thread(target=voice_loop, daemon=True).start()
        return {"status": "started"}
    return {"status": "already_running"}

@app.post("/stop")
async def stop_nox():
    global is_running
    is_running = False
    await broadcast_state(NoxState.IDLE)
    return {"status": "stopped"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=777)
