---
id: 9
title: "Crash-loop / blocked-session detector: PTY heartbeat + fs-write + restart counter"
status: open
priority: medium
horizon: next
hitl: false
type: feature
source: research
created: 2026-05-30
updated: 2026-05-30
prs: []
refs: []
depends_on: [0001]
---

Detect wedged Claude/Codex sessions and crash-looping cron agents that
the system would otherwise silently absorb. Distinguishes "Opus is
genuinely thinking" from "wedged on an unseen permission prompt at 2am."

**Filter applied:** by definition a wedged session can't detect its own
wedge — the very code that would notice is the code that's stuck. Only
an external observer correlating PTY output, fs-writes-by-PID, and the
run ledger can call this out. Telegram + HITL surface is harness-only.

## Two distinct detectors

### Detector A — Wedged interactive session

For each managed terminal pane:

Sample every 30s:
- Last PTY output timestamp (stream from xterm's data buffer)
- Last fs write attributed to the pane's PTY PID
  (poll via `lsof -p <PID>` looking at WRITE-mode file handles, or
  cache from FSEvents stream filtered by PID)
- Last user input timestamp (already tracked for snippets)

A session is **stuck** when ALL THREE are true:
1. No novel PTY output in > 5 min (heartbeat patterns excluded — see
   below)
2. No fs writes from this PID in > 5 min
3. Last user input > 5 min ago

The conjunction is intentional. "Output but no fs writes" = Opus
streaming a long answer (alive). "fs writes but no PTY" = a tool
running off-screen (alive). "User typing" = the human is engaged
(don't alert).

### Heartbeat detection

Claude/Codex emit recognizable spinners. We DON'T treat these as novel
output — they're heartbeats:
- Claude: lines matching `^\s*(✻|✼|✽|✾|✿).*` (the rotating glyph
  status line)
- Codex: lines matching the spinner-frame pattern Codex uses
- Either: `tool_use` blocks rolling stdout

Heartbeat-only output for > 5 min = treated as no output. Real diff
content / file paths / non-spinner text = alive.

### Detector B — Crash-looping cron agent

Reads from the run ledger (#0001). For each scheduled agent:

If > 3 runs in 10 min AND > 50% of them failed (exit ≠ 0) AND the
schedule's cadence doesn't justify that frequency → mark crash-loop.

(The schedule-overdue HITL already covers the inverse case: schedule
fires too rarely. This adds: schedule fires too often + fails.)

## Storage

`~/.config/TerMinal/stuck-sessions.jsonl` — one row per detection event:

```jsonl
{"id":"uuid","detector":"wedged-session","sessionKey":"...","pid":12345,"lastOutputAt":...,"lastFsWriteAt":...,"lastInputAt":...,"detectedAt":...,"firstPromptHint":"document this auth flow","resolved":false,"resolvedAt":null}
{"id":"uuid","detector":"crash-loop","scheduleId":"...","agentId":"docs","recentFailureCount":4,"detectedAt":...,"resolved":false}
```

Resolved when:
- Wedged: user types into the pane OR the pane closes
- Crash-loop: agent succeeds OR is disabled by user OR by circuit breaker

## Surfaces

**Dashboard:**
- Session sub-bar in the Terminal tab: amber dot on stuck panes
  (alongside the existing green/red pulse for working/idle)
- Schedules tab: red badge "crash-loop" on schedules in the state
- Harness status panel (Settings): "1 wedged session, 2 crash-loops"

**Telegram** (only on first detection, not repeated):
- 🪤 Wedged: `vellum-project · S2 · "document the new auth flow" stuck
  for 6m (no output, no fs writes, no input). /tail to see, /cancel
  to kill.`
- 🔁 Crash-loop: `Schedule docs · vellum-project · 4 failures in 8
  min. Watchdog auto-pause? /pause to confirm.`

**HITL** (only crash-loops file HITL — wedged sessions get pinged but
don't pile up in the inbox):
- Source: cron-fail (existing)
- runId pointer to the latest failed run
- One-tap [Cancel & Disable] button (callback handler)

## Auto-actions

**Wedged session:** alert only. Never SIGKILL automatically — user might
be deliberately leaving it idle. (We file the alert + leave it alone.)

**Crash-loop:** if > 6 failures in 20 min, auto-pause the schedule (set
disabled = true). User must explicitly re-enable. Counts as a forceful
circuit-break.

## Implementation notes

- PTY tail: SessionView already streams xterm output. Add a timestamp
  per stream chunk; a small `lastTextAt`/`lastHeartbeatAt` tracker per
  pane.
- fs-write tracking: macOS `fs_usage -e -f filesys -p <PID>` or polling
  `lsof -p <PID>`. The latter is portable, the former real-time. Pick
  poll for v0 (1-Hz is enough for the 5-min window).
- Per-pane state lives in the existing `sessions` map in `src/main/`.

## Stage plan

**Stage 1** — Detector B (crash-loop) only. Reads from #0001's ledger,
fires Telegram + HITL + auto-pause. Zero false-positive risk because
it's data-driven from real exit codes.

**Stage 2** — Detector A (wedged session) without auto-actions. Just
the alert + dashboard amber dot. Tune the heartbeat patterns over a
week.

**Stage 3** — Optional: refine to use FSEvents for sub-second fs-write
tracking if 1-Hz polling produces noisy false positives.

## Non-goals

- No auto-SIGKILL on stuck sessions. User might be leaving them
  intentionally.
- No "summarize what the session was doing" via LLM before alerting.
  The Telegram message just carries the first prompt + the timestamps.
- No cross-session wedge correlation ("session A blocked on output of
  session B"). Out of scope.
- No alerting for sessions in the dock minimized / screen-locked
  context. The detector runs regardless of focus state.

## Risk

Medium. Heartbeat false positives (Opus genuinely thinking long) would
be annoying for Detector A. Mitigations:
- Conjunction of three "no" conditions, not any one
- Configurable thresholds (`stuckMinutes: 5` defaults; bump to 10/15 if
  noisy)
- Heartbeat pattern allowlist tuned against real session logs in week
  one

Crash-loop detector (B) has very low false-positive risk because it's
driven by actual exit codes.

## Pairs with

- #0001 (observability) — restart counter reads the ledger
- Existing watchdog (`sweepStaleCronRuns`) — handles the "> 2h running
  with no live process" case; this fills the gap between minutes and
  the 2-hour threshold
- Existing schedule-overdue HITL — covers the inverse cadence problem
