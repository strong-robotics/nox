import asyncio
import json
import os
import subprocess
import threading
import time
import sys
import numpy as np
import sounddevice as sd
import whisper
import ollama
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn

# Inject monitor path
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(PROJECT_ROOT, "multi-agent/core"))
import monitor # type: ignore

@asynccontextmanager
async def lifespan(app: FastAPI):
    global main_loop
    main_loop = asyncio.get_event_loop()
    asyncio.create_task(background_monitor())
    yield

app = FastAPI(lifespan=lifespan)

# Enable CORS for Next.js dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- CONFIGURATION ---
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
main_loop: asyncio.AbstractEventLoop | None = None

def load_memory():
    try:
        with open(MEMORY_FILE, 'r') as f:
            data = json.load(f)
        # migrate old format
        if "memories" not in data:
            memories = []
            for p in data.get("user_preferences", []):
                memories.append({"category": "behavior", "text": p})
            for f_ in data.get("learned_facts", []):
                memories.append({"category": "fact", "text": f_})
            return {"memories": memories}
        return data
    except:
        return {"memories": []}

def save_memory(memory):
    try:
        with open(MEMORY_FILE, 'w') as f:
            json.dump(memory, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Memory save error: {e}")

def add_memory(category: str, text: str):
    memory = load_memory()
    existing = [m["text"] for m in memory["memories"]]
    if text and text not in existing:
        memory["memories"].append({"category": category, "text": text})
        save_memory(memory)
        print(f"[MEMORY SAVED] [{category}] {text}")

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

async def broadcast_state(state):
    try:
        data = monitor.get_full_system_state()
        data["state"] = state
        message = json.dumps(data)
        dead = []
        for connection in active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                dead.append(connection)
        for c in dead:
            active_connections.remove(c)
    except Exception as e:
        print(f"Broadcast error: {e}")

def broadcast_state_sync(state: str):
    """Thread-safe broadcast: schedules into the main uvicorn event loop."""
    if main_loop and main_loop.is_running():
        asyncio.run_coroutine_threadsafe(broadcast_state(state), main_loop)

async def background_monitor():
    """Periodically pushes state to UI and keeps Ollama model warm."""
    tick = 0
    while True:
        await broadcast_state(current_nox_state)
        tick += 1
        # Every 5 minutes ping Ollama so model stays loaded in memory
        if tick % 150 == 0:
            try:
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(None, lambda: ollama.chat(
                    model='llama3.2',
                    messages=[{'role': 'user', 'content': '.'}],
                    options={'temperature': 0, 'num_predict': 1}
                ))
            except Exception:
                pass
        await asyncio.sleep(2)

current_nox_state = "idle"


@app.post("/kill-agent")
async def kill_agent(request: dict):
    pid = request.get("pid")
    role = request.get("role", "")
    if not pid:
        return {"ok": False, "error": "no pid"}
    try:
        os.kill(int(pid), 15)  # SIGTERM
        # immediately remove heartbeat so monitor doesn't wait 15s to mark dead
        if role:
            hb = os.path.join(PROJECT_ROOT, f"multi-agent/.runtime/heartbeat_{role.lower()}.json")
            try:
                os.remove(hb)
            except FileNotFoundError:
                pass
        await asyncio.sleep(0.5)
        await broadcast_state(current_nox_state)
        return {"ok": True, "pid": pid}
    except Exception as e:
        return {"ok": False, "error": str(e)}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    try:
        data = monitor.get_full_system_state()
        data["state"] = current_nox_state
        await websocket.send_text(json.dumps(data))
    except Exception as e:
        print(f"Initial state error: {e}")
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        if websocket in active_connections:
            active_connections.remove(websocket)

def get_system_context() -> dict:
    try:
        return monitor.get_full_system_state()
    except Exception as e:
        print(f"Monitor error: {e}")
        return {
            "status": {}, 
            "tasks": {"completed": 0, "queued": 0, "all_queued": []}, 
            "pipeline": [],
            "codex": {"state": "ERROR", "model": "N/A"}
        }

def nox_say(text):
    # Remove memory tags from speech
    clean_text = text.split("[MEMORY:")[0].split("###")[0].strip()
    print(f"NOX: {clean_text}")
    
    # Clean up text for speech
    speech_text = clean_text.replace('"', '\\"').replace('*', '')
    
    # Generate speech using Piper, apply FX, play — all in one pipeline
    try:
        cmd = (
            f'echo "{speech_text}" | {PIPER_EXE} -m {PIPER_MODEL} --output-raw | '
            f'sox -t raw -r 22050 -e signed -b 16 -c 1 - {EFFECT_WAV} '
            f'vol 0.8 pitch -80 highpass 150 overdrive 7 '
            f'echo 0.8 0.8 25 0.4 50 0.25 compand 0.05,0.2 6:-70,-60,-20 -5 -90 0.1 treble +3'
        )
        subprocess.run(cmd, shell=True, check=True)

        global current_nox_state
        current_nox_state = "speaking"
        broadcast_state_sync("speaking")
        subprocess.run(["afplay", EFFECT_WAV if os.path.exists(EFFECT_WAV) else TEMP_WAV])
    except Exception as e:
        print(f"Audio error: {e}")
        current_nox_state = "speaking"
        broadcast_state_sync("speaking")
        subprocess.run(["say", "-v", "Serena", speech_text])

    current_nox_state = "idle"
    broadcast_state_sync("idle")

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

    global current_nox_state
    current_nox_state = "processing"
    broadcast_state_sync("processing")
    context = get_system_context()
    memory = load_memory()
    
    memories = memory.get("memories", [])
    memory_block = ""
    if memories:
        memory_block = "\nWHAT YOU REMEMBER ABOUT EUGENE:\n"
        for m in memories[-30:]:  # last 30 memories
            memory_block += f"- [{m['category']}] {m['text']}\n"
        memory_block += "These are facts and preferences — follow them strictly.\n"

    system_prompt = f"""
You are NOX, a sharp-witted AI assistant. Eugene is your creator.
RULES:
1. Keep it simple and natural. No jargon.
2. BREVITY: Be concise but informative. If asked about status, give a full overview.
3. PERSONALITY: Cool, direct, slightly sarcastic.
4. LANGUAGE: ALWAYS respond in English, even if Eugene speaks another language.
5. FACTS: Use the data below to answer Eugene about tasks and agents.

REAL-TIME SYSTEM STATE:
- Tasks: {context.get('tasks', {}).get('completed', 0)} completed, {context.get('tasks', {}).get('queued', 0)} in queue.
- Current Task: {context.get('current_task', 'N/A')}
- Pipeline Status: {", ".join([f"{a.get('role', 'Unknown')}: {a.get('status', 'unknown')}" for a in context.get('pipeline', []) if isinstance(a, dict)])}
- Live Agents (Processes): {", ".join([f"{a.get('role')} ({a.get('env')})" for a in context.get('live_agents', []) if a.get('alive')]) or "None"}
- Codex: {context.get('codex', {}).get('state', 'OFF')} / {context.get('codex', {}).get('model', 'N/A')}

{memory_block}

When reporting status, ALWAYS mention:
- The NAME of the current task.
- Which agent is currently active or whose turn it is.
- How many tasks are remaining in the queue.

HOW TO SAVE MEMORIES:
If Eugene tells you something worth remembering — about himself, his life, work, habits, preferences, or instructions for you — add ONE tag at the end of your response:
[MEM:category|text]
Categories: behavior (how you should act), personal (about Eugene), work (project/job), habit (routines), other
Only add a tag when something genuinely new was said. Never repeat what is already in memory.
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
        
        if "[MEM:" in answer:
            tag = answer.split("[MEM:")[1].split("]")[0].strip()
            if "|" in tag:
                category, text = tag.split("|", 1)
                add_memory(category.strip(), text.strip())
            else:
                add_memory("other", tag)

        conversation_history.append({"role": "assistant", "content": answer})
        save_history(conversation_history)
        
        nox_say(answer)
    except Exception as e:
        print(f"Ollama error: {e}")
        nox_say("Sir, my neural grid is flickering.")

_cached_input_device: int | None = None

def find_input_device() -> int | None:
    """Find a working mic device index once and cache it."""
    global _cached_input_device
    if _cached_input_device is not None:
        return _cached_input_device
    devices = sd.query_devices()
    candidates = [i for i, d in enumerate(devices) if d['max_input_channels'] > 0]
    for idx in candidates:
        try:
            with sd.InputStream(samplerate=16000, device=idx, channels=1, blocksize=512):
                pass
            print(f"--- Using audio device [{idx}]: {devices[idx]['name']} ---")
            _cached_input_device = idx
            return idx
        except Exception:
            continue
    return None


def voice_loop():
    global is_running, is_awake
    target_fs = 16000
    chunk_size = 1024
    silence_duration_limit = 1.0

    while is_running:
        try:
            device_idx = find_input_device()
            if device_idx is None:
                print("--- No working input device found. Retrying in 5s... ---")
                time.sleep(5)
                continue

            device_info = sd.query_devices(device_idx)
            print(f"--- Audio Input: {device_info['name']} ({target_fs}Hz) ---")

            broadcast_state_sync(NoxState.LISTENING if is_awake else NoxState.IDLE)

            SPEECH_THRESHOLD = 0.02   # ignore background noise below this
            MIN_SPEECH_CHUNKS = 8     # ~0.5s minimum to avoid tiny noise bursts

            audio_buffer = []
            speech_chunks = []
            silent_chunks = 0
            has_started_talking = False

            with sd.InputStream(samplerate=target_fs, device=device_idx, channels=1, blocksize=chunk_size) as stream:
                print(f"--- Listening (16kHz, Ready for command)... ---")
                while is_running:
                    data, _ = stream.read(chunk_size)
                    audio_buffer.append(data.copy())

                    volume_norm = np.linalg.norm(data) / np.sqrt(len(data))

                    if volume_norm > SPEECH_THRESHOLD:
                        if not has_started_talking:
                            print(f"--- Signal detected (Vol: {volume_norm:.5f}) ---")
                        has_started_talking = True
                        silent_chunks = 0
                        speech_chunks.append(data.copy())
                    elif has_started_talking:
                        silent_chunks += 1
                        speech_chunks.append(data.copy())

                    if has_started_talking and (silent_chunks * chunk_size / target_fs) > silence_duration_limit:
                        print(f"--- End of speech detected. Captured {len(speech_chunks)} chunks. ---")
                        break
                    if len(audio_buffer) * chunk_size / target_fs > 15:
                        break

            actual_speech = len(speech_chunks) - silent_chunks
            if has_started_talking and actual_speech >= MIN_SPEECH_CHUNKS:
                print("--- Transcribing... ---")
                audio_resampled = np.concatenate(speech_chunks).flatten()

                max_vol = np.max(np.abs(audio_resampled))
                if max_vol > 0:
                    audio_resampled = audio_resampled / max_vol

                result = stt_model.transcribe(
                    audio_resampled,
                    language='en',
                    condition_on_previous_text=False,
                    no_speech_threshold=0.5,
                    logprob_threshold=-1.0,
                )
                text = result["text"].strip()
                no_speech = result["segments"][0]["no_speech_prob"] if result["segments"] else 1.0

                print(f"DEBUG: Heard: '{text}' | no_speech_prob={no_speech:.2f}")

                if no_speech > 0.5:
                    print(f"--- Likely not speech (no_speech_prob={no_speech:.2f}), ignoring ---")
                    broadcast_state_sync(current_nox_state)
                elif len(text) > 3:
                    process_voice_command(text)
                else:
                    broadcast_state_sync(current_nox_state)
            elif has_started_talking:
                print(f"--- Too short ({actual_speech} chunks), ignoring ---")
            
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
    uvicorn.run(app, host="0.0.0.0", port=777)
