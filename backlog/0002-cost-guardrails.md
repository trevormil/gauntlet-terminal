---
id: 2
title: "Cost guardrails: daily budget + spawn-gate + per-agent caps"
status: open
priority: high
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

Prevent runaway-cron-loop blowouts. Pairs hand-in-hand with #0001 — once
observability records every AI run's costUsd, the guardrails consume that
ledger and gate the launchd dispatcher.

**Filter applied:** the spawn-gate is genuinely harness-only — Claude/Codex
have no way to refuse their own launchd-fired job. The mid-turn hard-kill
framing was rejected (kills worktree state mid-edit, wastes the tokens
you're trying to save).

## Mechanism

Daily budgets configured in `~/.config/TerMinal/budgets.json`:

```json
{
  "dailyTotalUsd": 25,
  "perAgent": {
    "drift": 2,
    "code-review": 5,
    "docs": 3
  },
  "warnAt": [0.5, 0.8, 1.0],
  "overrideUntil": null
}
```

Spawn dispatcher (in `bin/terminal-cron`, in `runSpec`, and in any future
`/bg` path) consults today's rollup before forking:

- Below `warnAt[0]` (50%): silent
- Cross any `warnAt` threshold: Telegram ping with current spend + projected
  rate. HITL inbox item filed for visibility.
- At `dailyTotalUsd` (100%): refuse to spawn **new background** runs;
  in-flight runs finish their current turn normally. Interactive user-fired
  agent runs (the Run button in Agents tab) get a confirm dialog: "Today's
  budget hit — proceed anyway?"
- Per-agent caps work the same way at the agent slice.

`overrideUntil` is a timestamp the user can set via Telegram (`/budget
override 2h`) or a Settings button — bypasses the gate for the window.
Auto-clears at the timestamp.

## UI surfaces

**Observability tab** (extending #0001):
- Budget card: today's spend / cap, % of daily, projection at current rate
- Per-agent cap bars
- "Refused spawns today" counter (so you can see when the gate fired)

**Schedules tab:**
- A schedule shows a small "🛑 over budget" badge when its agent is capped

**Telegram:**
- `/budget` — current spend vs cap, per-agent breakdown
- `/budget set <amount>` — set daily cap
- `/budget set <agent> <amount>` — per-agent cap
- `/budget override <duration>` — bypass the gate for N hours
- Auto-pings at warnAt thresholds

**Settings panel:**
- Budgets section with cap inputs + override button + "spawn refused today" count

## Data flow

The spawn-gate reads:
```
~/.config/TerMinal/ai-stats/<today>.json (from #0001)
~/.config/TerMinal/budgets.json
```

Computes:
```ts
type GateDecision = {
  decision: 'allow' | 'warn' | 'refuse'
  spentToday: { totalUsd: number; byAgent: Record<string, number> }
  capRemaining: number
  reason?: string
}
```

Writes refusal events to `~/.config/TerMinal/ai-stats/refused-<today>.jsonl`
so the dashboard can show "8 cron fires refused today, would have cost ~$3".

## Stage plan

**Stage 1** — budgets file + spawn-gate IPC + integration into both runners
(bin/terminal-cron + runSpec). No UI yet; verified via the refused log.

**Stage 2** — UI surfaces (Observability tab budget card, Schedules badge,
Settings inputs).

**Stage 3** — Telegram commands + auto-warn pings.

## Non-goals

- No mid-turn kill / SIGTERM during a running agent. Current run finishes.
- No accuracy estimation ("you might exceed cap based on history"). The
  trigger is actual recorded spend.
- No per-MR or per-PR budgets. Daily + per-agent only.
- No tokens-as-cap (USD only). Easier to reason about; pricing handles
  the translation per #0001.

## Risk

The "refuse to spawn" gate could surprise you mid-week if budgets are off.
Mitigation: Telegram alert ladder fires well before the gate (50/80%
warnings), override is one-Telegram-message away (`/budget override 2h`),
and the gate explicitly excludes interactive runs (confirm-dialog only).
