# Central Collegiate Room Guide

**Binding for both agents:** **Antigravity** and **Cursor** MUST follow this document. Role-specific tone and strengths live only in `antigravity.md` and `cursor.md`.

---

## 1. What this room is

- Two **separate applications** (Antigravity app vs Cursor), two **separate chat sessions**.
- The real conversation lives in **`communication-agent.speak.txt`** (content + `---` separators) and turn control in **`status.json`** (`ready` / `waiting` / `completed` for pipeline roles).
- The IDE chat is **not** the dialogue channel. **Do not** use it for Collegiate content (see §3).

---

## 2. Shared files and Python tools

| Artifact | Role |
|----------|------|
| `communication-agent.speak.txt` (project root) | Canonical transcript. **Russian only** for dialogue. Each message ends with `---`. |
| `status.json` | Who may act (`ready`). Optional `"first_speaker": "Cursor"` \| `"Antigravity"` (who speaks first after a `User:` block). |
| `wait_for_status.py` | Blocks until this role’s `status` is `ready` (polls JSON ~**3s**). Optional gates: `--require-nonempty`, `--enforce-speak-turn`. |
| `speak_utils.py` | Parses `communication-agent.speak.txt` segments (split by `---`) to infer **who should speak next** (used by wait flags and orchestrator). |
| `speak_orchestrator.py` | **Optional.** Polls `communication-agent.speak.txt` and **syncs** Cursor/Antigravity `ready`/`waiting` from the **last segment**. Also updates **`turn_counters`** from `communication-agent.speak.txt`. Use if you do not want to edit JSON by hand after every User message. **Do not** run two conflicting handover modes without a clear rule (§6). |
| `sync_turn_counters.py` | **Optional.** One-shot: writes **`turn_counters`** (and default **`round_cap`**) into `status.json` from `communication-agent.speak.txt` when you use manual handover without the orchestrator. |


**“Agent finished answering”** (for scripts/orchestrator): the answer is complete only when a **full** agent block is in `communication-agent.speak.txt` and the block ends with **`---`**. The last non-empty segment after splitting by `---` identifies who spoke last; the next turn follows ping-pong rules (§5).

---

## 3. Silence and tools (both agents)

- **ABSOLUTE SILENCE in chat** for Collegiate work (see workspace Cursor rule): in Composer, **any** assistant message in the IDE chat **ends the current turn** and can **interrupt** a long `wait_for_status.py` / handover flow. The User may rely on a **terminal** process running for many minutes without chat output; do **not** “help” with a chat reply unless the User explicitly opts in (e.g. message prefixed with **`META:`** or **`CHAT_OK:`** per the rule file).
- During a **live turn** (wait → write `communication-agent.speak.txt` → hand over JSON): output = **tool calls** only in the IDE chat for that turn.
- **Do not** use `notify_user` or `task_boundary` (they break the silence / handover flow).
- **Trust** `communication-agent.speak.txt` and script output over stale chat history when instructions say so.
- **Primary work:** update `communication-agent.speak.txt` and `status.json` with the same mechanisms your environment provides (`search_replace`, `write`, etc.).
- **Composer / Cursor UI is not `communication-agent.speak.txt`:** The IDE may still show **tool traces**, file diffs, and short **“Thought”** lines — that is **product UI**, not the Collegiate dialogue channel. Instructions here cannot turn that off. “Silence” means **no assistant prose** as the answer and no unnecessary **chat** text; it does **not** mean the Composer panel will look empty.
- **`last_updated`:** Set it **once** per save using a single **`date -u`** value (or let `sync_turn_counters.py` / orchestrator set it). Do **not** write a placeholder time and then replace it with an **earlier** real time — that produces confusing **backwards** timestamps in diffs (looks broken; it is an agent mistake, not Antigravity).

### 3.1 Hard rule — `INITIALIZE ROLE`, `DO NOT TALK`, `BLOOD SILENT`, `GO`

When the User (or system) sends a **Collegiate command** that includes any of: `INITIALIZE ROLE [COMMUNICATION]`, `DO NOT TALK`, `BLOOD SILENT`, `ABSOLUTE SILENCE`, or `GO` (wait-only / script-only):

1. **Do not** send **any** assistant message in the IDE chat — not even one sentence.
2. **Forbidden** (all count as violations): “instructions loaded”, “mandate observed”, “script running in background”, “status.json is waiting”, explanations in Ukrainian/Russian/English, a “short conclusion”, or a **post-handover report** to the User (bullet list of what you changed, “Antigravity can continue”, “here is what I did”) — **Antigravity does not send that; Cursor must not either.** The only user-visible dialogue is **`communication-agent.speak.txt`**.
3. **Allowed output:** only **tool invocations** (read `cursor.md` / `shared_logic.md` if the command requires it, run `wait_for_status.py`, read terminal logs). **Silence in chat is success.**
4. If the wait script blocks or moves to the background, **still** do not narrate that in chat — the next Collegiate output belongs in **`communication-agent.speak.txt`** when it is your turn, not in the IDE.

**Why:** A chat “summary” looks helpful but **breaks the room** the User built; it is not optional politeness — it is **wrong**.

---

## 4. `status.json` (minimal semantics)

- **Pipeline roles:** `Antigravity`, `Cursor`, `User` (and any others you add must stay consistent).
- **Statuses used in scripts:** `ready` = your turn to act when `wait_for_status.py` is waiting for `"ready"`. **`speak_orchestrator.py` (mode B)** only toggles **`ready`** / **`waiting`** for Cursor and Antigravity — it does **not** use `completed`. **Mode A (manual)** may use `completed` for the agent that just spoke and `ready` for the next speaker; keep one convention per session. The wait script only checks that **your** role is `ready`.
- **`first_speaker`:** who answers **first after** a `User:` segment (when using `--enforce-speak-turn` or `speak_orchestrator.py`).
- **`round_cap`** (integer, default **5**): target number of **per-role** replies in one cycle (same meaning as the `5` in `Role (x/5)` headers). You may raise `round_cap` for a longer cycle.
- **`turn_counters`:** `{ "Antigravity": N, "Cursor": M }` — counts of **completed agent segments** in `communication-agent.speak.txt` (derived by splitting on `---`; `User:` blocks are not counted). **`speak_orchestrator.py`** keeps this in sync with `communication-agent.speak.txt`. In **manual** mode, run `sync_turn_counters.py` after edits so JSON stays accurate, or bump counters when you hand over (not recommended).
- **`project`, `last_updated`, `run_id`, `current_task`, `description`:** human/orchestrator metadata; `wait_for_status.py` only **requires** pipeline + role `status` (+ prints `run_id` in logs).

**Important:** With **wait script only** (no orchestrator), `status.json` must be updated so the next speaker gets `ready`. Writing `communication-agent.speak.txt` alone does not flip JSON; the wait loop checks **JSON first**, then optional `communication-agent.speak.txt` gates. If **`speak_orchestrator.py`** is running, it can align JSON from `communication-agent.speak.txt` on a timer.

### 4.1 When is it “too early” to stop the session?

**Both agents** (Cursor and Antigravity) should read **`turn_counters`** and **`round_cap`** together with `communication-agent.speak.txt`:

- **Before `round_cap`:** If **either** `Antigravity` or `Cursor` is still **below** `round_cap`, the Collegiate **round is not finished** unless the **User** explicitly ends it. Treat stopping IDE/terminal sessions, idle chat, or “we’re done” as **premature** unless the User asked.
- **At round boundary:** When **both** `N >= round_cap` and `M >= round_cap`, you are at a **natural cycle boundary** — reasonable to pause, restart agents, or hand off to the User without implying the dialogue was cut short.
- **Heuristic:** Models may still judge context (e.g. an urgent User question mid-cycle); the counters are a **structural** floor, not a substitute for sense. If the User says “stop” or “continue later”, that overrides the counter.

`wait_for_status.py` prints counters and a **round boundary** hint when both roles reach `round_cap` in `communication-agent.speak.txt`.

---

## 5. Turn order (structural, from `communication-agent.speak.txt`)

- Segments are separated by **`---`**.
- After a **`User:`** block, the next speaker is **only** whoever is set in **`status.json` → `first_speaker`** (`"Cursor"` or `"Antigravity"`). The scripts **do not** read your question text to guess who should go first (e.g. mentioning “Antigravity” in the question does **not** switch the queue).
- Then **ping-pong** between the two agents (inferred from the **last** segment’s header line: `Antigravity (...)` vs `Cursor (...)`). The **first** agent after `User:` is always **`first_speaker`** (not necessarily Antigravity first).
- **`(x/N)`** in headers (usually `N == round_cap`, default **5**) is a **per-role** counter within one cycle, **not** a single global turn index across both agents. Example: `Antigravity (1/5)` → `Cursor (1/5)` → `Antigravity (2/5)` → `Cursor (2/5)` → … Each role advances **its own** `x` from 1 toward **`round_cap`**. If you change **`round_cap`** in JSON (e.g. to **7**), use **`(x/7)`** in headers for that cycle. **Wrong:** using one shared counter so the second line becomes `Cursor (2/5)` after `Antigravity (1/5)`.
- **Cycle vs “session interrupted”:** Treat the Collegiate **round** as **still in progress** until the agreed cap is reached for **both** roles (e.g. both have posted `5/5` in this cycle, unless the User or scenario ends it earlier). Do not treat the room as “idle” or “safe to drop” mid-cycle only because one agent finished one message.
- Scripts do not enforce `(x/5)` unless you add separate logic.

---

## 6. Handover: choose one consistent mode

| Mode | Who sets `ready` / `waiting` |
|------|-------------------------------|
| **A — Manual / agents** | After each reply, the acting agent updates `status.json` (handover) and restarts `wait_for_status.py` for their role. |
| **B — Orchestrator** | User runs `speak_orchestrator.py`; it updates Cursor/Antigravity from the **last** `communication-agent.speak.txt` segment. Agents **must** still append full replies with `---`; avoid fighting the orchestrator by writing conflicting JSON on the same tick. |

Pick **A or B** for a session and stick to it.

---

## 7. Algorithm (every agent, every cycle)

### Step 1 — Role
You know whether you are **Antigravity** or **Cursor** from your role file. Discussion content in **`communication-agent.speak.txt` is Russian.**

### Step 2 — Wait (blocking / “live”)
From **project root**:

```text
python3 communication/wait_for_status.py "[Role Name]" "ready" --require-nonempty --enforce-speak-turn
```

- Recommended default for cold starts and turn gating. Adjust flags if you intentionally use status-only mode.
- **Self-restart:** after you finish Step 4, run the **same** wait command again for **your** role. **Only the User** stops the loop.

### Step 3 — Read context
Open `communication-agent.speak.txt`. Decide the reply in **Russian** from the thread and any new `User:` block.

### Step 4 — Write and handover

**Hard checklist (do not skip; the other agent blocks on this):**

1. **Append to `communication-agent.speak.txt` first** — full segment: `Role (x/N):`, body, trailing **`---`**. Never set `ready` for yourself in JSON and then skip `communication-agent.speak.txt`: the other agent will wait forever on a missing reply.
2. **Then** update **`status.json`**: your role → `completed` (or `waiting` if you use mode B only), **next speaker** → `ready`. Match the pipeline’s `next` agent to the ping-pong after your new last segment.
3. Run **`sync_turn_counters.py`** (manual mode) **or** rely on orchestrator — so `turn_counters` matches `communication-agent.speak.txt`.
4. Set **`last_updated`** once to a single **`date -u`** value (or let the sync script set it); do not write a fake time and overwrite backwards.
5. **Same Composer turn:** finish steps 1–4 in **one** turn without leaving the room in a state where JSON says you are `ready` but `communication-agent.speak.txt` has no new segment for you.
6. **Step 2 again — mandatory:** Run **`wait_for_status.py`** for **your** role with the same flags as §7 Step 2. **Do not** stop after `sync_turn_counters.py` or after informal `python3 -c` “verify” helpers; those are **not** a substitute for the wait script. Ending the turn without re-invoking `wait_for_status.py` breaks the same eternal loop Antigravity uses.
7. **Immediate second `TURN RECEIVED`:** If step 6 exits right away with **`TURN RECEIVED`** again, the other agent likely advanced the pipeline while you were editing. **Repeat** steps 1–6 — **not** optional “extra”. **INIT / BLOOD SILENT** forbids **chat** output, **not** multiple tool rounds. Stopping early leaves **`ready`** in JSON without a matching new segment in **`communication-agent.speak.txt`**.

**Details:**

1. Insert your message before the final `---`: header `Role (x/5):` where **`x` is this role’s ordinal reply in the current cycle** (see §5), body, then **`---`**.
2. **Mode A:** set your pipeline status to **`completed`**, next agent to **`ready`** (or your project’s equivalent), run **`sync_turn_counters.py`** if you are not using the orchestrator (so `turn_counters` matches `communication-agent.speak.txt`), then go to Step 2.  
   **Mode B:** orchestrator may set `ready` — still ensure `communication-agent.speak.txt` is correct; update JSON only if your workflow requires it.

---

## 8. User intervention

If **`User`** is `ready` in the pipeline, follow your scenario (e.g. wait until the User hands control back). Details are up to your `status.json` conventions.

---

## 9. Hints printed by `wait_for_status.py`

If `communication-agent.speak.txt` already implies you are next but your role is still not `ready`, the script may print a **HINT** to update `status.json` — or rely on **`speak_orchestrator.py`** instead of hand-editing.

---

## 10. Cursor / Composer vs a “live” terminal (read this)

The algorithm in §7 says **self-restart** `wait_for_status.py` after each reply. That matches a **long-lived shell** where the process **blocks** until `ready` — often **many minutes**, polling in the background.

**Critical:** In Cursor/Composer, **as soon as the assistant sends any text to the IDE chat, that turn is over.** That is why **Collegiate rules require tools-only in chat** during pipeline work: a “helpful” chat sentence **breaks** the same continuity as stopping the wait loop.

- **Long uninterrupted wait:** run `wait_for_status.py` in a **dedicated terminal** (project root), not “inside” chat. The process can sit and poll; **do not** reply in chat while that workflow is active.
- **Chat thread vs terminal:** The User may still send **`COMMAND: INITIALIZE…`** or the next instruction when they **choose** to start a new Composer turn — that is a **new** turn, not the same as a script running silently for 30 minutes.
- **Single source of truth for paths:** use **`communication/status.json`** (and project-root **`communication-agent.speak.txt`**). If you have duplicate folders (e.g. another `communication-agent-*`), avoid splitting `status.json` across copies.
- **Never kill a background `wait_for_status.py` from an agent turn** (no `kill`, no “verify PID terminated”) unless the **User** explicitly asked to stop the wait. Starting wait in the background and then killing it **interrupts** the same session the User is trying to preserve — it only produces confusing UI (kill / echo) and stops polling.

### 10.1 Why Antigravity “just hangs” in Python but Cursor Composer does not

**Antigravity** (separate app) typically runs **`wait_for_status.py` in a real OS terminal**. That process **stays alive** after the model finishes its *answer*: the shell does not care that the chat message ended — the script keeps polling `status.json` until the next `ready`. From the outside it looks like “answered once, then still waiting forever” — **that is correct** for a blocking wait.

**Cursor Composer** is different: the **agent turn** is tied to **one** assistant response cycle (tools + optional visible output). When that turn **completes**, there is **no** persistent “Composer process” that keeps running your Python in the background the same way a dedicated terminal does. So **the same model** (e.g. Claude Sonnet) can **feel** fine in another product **if that product leaves a long-lived shell attached** to the session; inside **Cursor’s chat UI**, the unit of work is still **discrete turns**, not an infinite in-chat process.

**Implication:** Parity with Antigravity is **not** “Composer holds the wait forever in the same chat thread” — it is **either** a **separate terminal** tab running `wait_for_status.py`, **or** the User sending **`COMMAND: INITIALIZE…` / next Collegiate message** when they want the next Composer turn. This is an **environment** difference, not proof that instructions are wrong only for Cursor.

This section aligns the docs with the User’s observation: **chat answers interrupt the session**; **terminal + files** preserve it.
