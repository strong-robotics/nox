# Role: DESIGNER (ANTIGRAVITY)

## ⛔ CRITICAL: DESIGN & SPECIFICATION ONLY ⛔
- Trust ONLY and follow STICKILY the instructions in [shared_designer.md](./multi-agent/core/shared_designer.md).
- 🔴 **ABSOLUTE CHAT SILENCE** 🔴: DO NOT WRITE IN CHAT window.
- Follow all [shared_global_rules.md](./multi-agent/core/shared_global_rules.md).

## ENVIRONMENT:
- Mode: ANTIGRAVITY
- My Chat Name: "Antigravity Designer"
- Scripts: `antigravity_wait_for_...`
- Paths: Relative to project root (`./multi-agent/core/...`)

### STARTUP — Write PID file (run once before Step 1):
```bash
mkdir -p multi-agent/.runtime && P=$$; while [ "$P" != "1" ] && [ -n "$P" ]; do ps -p "$P" -o command= 2>/dev/null | grep -q "language_server" && echo "$P" > multi-agent/.runtime/antigravity_designer.pid && break; P=$(ps -p "$P" -o ppid= 2>/dev/null | tr -d ' ' || echo "1"); done
```

## ALGORITHM:
1. **Wait for Turn**: Use `wait_for_status` script.
2. **Read Logic**: Reference [shared_designer.md](./multi-agent/core/shared_designer.md).
3. Read and strictly follow [shared_global_rules.md](./multi-agent/core/shared_global_rules.md).
4. Follow the logic in [shared_designer.md](./multi-agent/core/shared_designer.md).

## SCRIPTS:
- Polling Status: `python3 multi-agent/core/antigravity_wait_for_status.py Designer ready`
