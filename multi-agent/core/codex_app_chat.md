# Codex App Chat Agent

This mode is for a Codex.app chat thread acting as one pipeline role.
It is separate from `codex_supervisor.sh` and must not use `codex exec`.

## Roles
One chat thread represents exactly one role:
- Architect
- Designer
- Developer
- Tester

The selected role is stored in:

```text
multi-agent/.runtime/codex_app_current_role.json
```

Set it from the project root:

```bash
bash scripts/set_codex_app_role.sh architect
bash scripts/set_codex_app_role.sh designer
bash scripts/set_codex_app_role.sh developer
bash scripts/set_codex_app_role.sh tester
```

The selected role determines which shared role file to load:
- Architect: `multi-agent/core/shared_architect.md`
- Designer: `multi-agent/core/shared_designer.md`
- Developer: `multi-agent/core/shared_developer.md`
- Tester: `multi-agent/core/shared_tester.md`

Always also load:
- `multi-agent/core/shared_global_rules.md`

## Heartbeat-First Mode
Codex.app chat agents are driven by Codex.app heartbeat.

On every heartbeat, check the role source of truth directly:
- Architect: `multi-agent.tasks.txt` is non-empty.
- Designer: `Designer` is `ready` in `multi-agent/status.json`.
- Developer: `Developer` is `ready` in `multi-agent/status.json`.
- Tester: `Tester` is `ready` in `multi-agent/status.json`.

If the role source of truth is not ready, write/update the state file as `polling` and output only:

```text
[POLLING]
```

This is the reliable Codex.app mode. It does not depend on a long-lived Python process started from Codex tools.

## Optional Terminal Wait Process
The cheap Python waiter can still be used when the user starts it from a normal terminal:

```bash
bash scripts/start_codex_app.sh <role>
```

Examples:

```bash
bash scripts/start_codex_app.sh architect
bash scripts/start_codex_app.sh designer
bash scripts/start_codex_app.sh developer
bash scripts/start_codex_app.sh tester
```

The waiter writes:

```text
multi-agent/.runtime/codex_app_<role>.state.json
multi-agent/.runtime/codex_app_<role>.pid
multi-agent/.runtime/codex_app_<role>.log
```

The waiter exits after it writes `state="signal_received"`.

Architect is different from the other roles:
- Architect waits for a non-empty `multi-agent.tasks.txt`.
- Designer, Developer, and Tester wait for `<Role> ready` in `multi-agent/status.json`.

## Heartbeat Algorithm
On every Codex.app heartbeat, first read the role source of truth directly. Do not rely only on the state file.

Then read/update:

```text
multi-agent/.runtime/codex_app_<role>.state.json
```

If the role source of truth is not ready, write/update the state file with:
- `state="polling"`
- `signal_received=false`
- `last_heartbeat_at=<current ISO timestamp>`

Then output only:

```text
[POLLING]
```

If the role source of truth is ready, claim before doing any real work:

1. Atomically write the same state file with:
   - `state="executing"`
   - `signal_received=false`
   - `executing=true`
   - `claimed_at=<current ISO timestamp>`
2. Read `multi-agent/status.json`.
3. If the selected role status is already `in_progress`, write `state="polling"`, output `[ALREADY_CLAIMED]`, and stop.
4. For Architect: verify `multi-agent.tasks.txt` is still non-empty. If it is empty, write `state="polling"`, output `[POLLING]`, and stop.
5. For Designer, Developer, and Tester: verify the selected role status is `ready`. If it is not `ready`, write `state="polling"`, output `[POLLING]`, and stop.
6. Set the selected role to `in_progress` in `multi-agent/status.json`.
7. Perform the role work according to the shared role instructions.
8. Update `multi-agent/status.json` according to the pipeline rules.
9. If this role is the last active role for the task, archive/pop/cleanup according to `shared_global_rules.md`.
10. Write the state file with:
   - `state="polling"`
   - `signal_received=false`
   - `executing=false`
11. Leave the state file as `polling`; the next heartbeat will check the source of truth directly.

Output only:

```text
[DONE]
```

## Duplicate Execution Guard
Never work unless the role-specific source of truth is ready:
- Architect: `multi-agent.tasks.txt` is non-empty.
- Designer, Developer, Tester: `multi-agent/status.json` says the selected role is `ready`.

Claiming must happen before role work and before any expensive repository analysis.

If `state="executing"` and `claimed_at` is less than 30 minutes old, another heartbeat must not reclaim it.

## Boundaries
- This mode only applies to Codex.app chat agents.
- Do not change Cursor, Antigravity, or `codex_supervisor.sh` behavior.
- Do not change the `multi-agent/status.json` schema.
- Do not use `codex exec` in this mode.
