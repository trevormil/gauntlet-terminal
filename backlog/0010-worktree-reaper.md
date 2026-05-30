---
id: 10
title: "Worktree reaper: classify + reap stale/orphaned worktrees across the fleet"
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
depends_on: []
---

Hourly cron + on-session-exit hook scans `~/CompSci/gauntlet/.worktrees/`
across every managed repo, classifies worktrees (live / idle / stale /
orphan), surfaces them in the dashboard, and one-click-reaps the dead
ones. Disk-bloat answer requires a fleet view that no individual session
has.

**Filter applied:** Only the harness sees worktrees across N repos and
the live-session map. Sessions know nothing about their siblings'
checkouts. The accumulation problem (stacked MRs, cron-fired runs, /bg
tasks all leaving worktrees behind) is exactly the fleet-level dirt
nobody else cleans up.

## Classification

For each `~/CompSci/gauntlet/.worktrees/<repo>/<branch>/`:

| Status | Definition |
|---|---|
| **live** | A TerMinal session OR running cron PID has cwd inside this path |
| **idle** | Branch exists, no live process, last commit ≤ 14 days ago |
| **stale** | Branch deleted/merged on remote, OR no commit > 14 days |
| **orphan** | No matching branch at all (crashed cron leftover, dangling `git worktree`) |

Detection:
- live: walk `getRepos()` from main + check cron-runs JSON for `worktree` field matching this path AND `status: running`
- branch existence: `git -C <worktree> symbolic-ref HEAD` (cheap)
- merged check: `git -C <repo> branch --merged origin/main` to find candidates
- last commit: `git log -1 --format=%ct` per worktree

## Storage

`~/.config/TerMinal/worktree-scan.json` — most recent scan result, used
by dashboard for instant rendering:

```json
{
  "scannedAt": 1700000000000,
  "worktrees": [
    {
      "path": "~/CompSci/gauntlet/.worktrees/vellum-project/code-review-abc1234",
      "repo": "trevormiller/vellum-project",
      "branch": "code-review-abc1234",
      "status": "stale",
      "diskBytes": 41943040,
      "lastCommitAt": 1690000000000,
      "owningAgent": "code-review",
      "owningRunId": null,
      "remoteBranchGone": true
    }
  ],
  "totals": {
    "count": 47,
    "diskBytes": 2147483648,
    "byStatus": { "live": 3, "idle": 6, "stale": 32, "orphan": 6 }
  }
}
```

Disk size via `du -sh` (one shell per worktree — acceptable for an hourly
cron).

## Triggers

Three:
1. **Hourly launchd cron** — scheduled scan
2. **On session exit** — when a TerMinal pane closes, scan THAT repo's
   worktrees only (cheap)
3. **Manual button** in the dashboard ("Rescan now")

## Dashboard surface

New section on the **Runs tab** (above the unified runs list) OR a new
"Worktrees" subview on the Workspaces tab:

```
🌿 Worktrees · 47 · 2.0 GB total
  live: 3 · idle: 6 · stale: 32 · orphan: 6
  ─────────────────────────────────────────────────────
  status   age      size    repo / branch
  stale    72d      890 MB  vellum-project / code-review-abc1234
  orphan   18d      120 MB  agentforge / iterate-def5678
  stale    34d      78 MB   helios / drift-xyz9012
  ...
  [☐ Select all stale] [☐ Select all orphan] [Reap selected]
```

Sort by size (default), or status, or age.

Per-row buttons:
- 🗑 **Reap** — `git worktree remove <path>` then `rm -rf <path>` then
  `git worktree prune` on the parent repo. Refuses if `git status
  --porcelain <path>` is non-empty (override with [Force]).
- 📁 **Open** — reveal in Finder (existing `open:external` IPC)
- 💻 **Open as session** — spawn a TerMinal session here (one-click
  resume of a worktree-in-progress)

## Safety

Never reap a worktree with uncommitted changes unless explicitly forced.
Detection via `git status --porcelain <worktree>` — if non-empty, the
row gets a 🛡 lock badge and Reap is disabled. The [Force] flag is a
separate click + confirm dialog.

Never reap a worktree currently mapped to a live session (status: live
is filtered out of bulk-select).

## Activity events

On reap:
- `{ kind: 'check', title: 'Reaped 6 worktrees', detail: '320 MB reclaimed' }`
- Per-worktree details available via drill-down to the scan record

## Telegram

- `/worktrees` — count + total disk across the fleet
- `/worktrees stale` — list stale ones
- `/worktrees reap stale` — confirm dialog → bulk reap

## Stage plan

**Stage 1** — Scanner + classification + scan-result JSON. No UI yet;
verifiable via the JSON file.

**Stage 2** — Dashboard worktrees panel + reap action + safety checks.

**Stage 3** — Hourly cron + on-session-exit trigger.

**Stage 4** — Telegram commands.

## Non-goals

- No auto-reap without user confirmation. Disk pressure is rarely
  urgent enough to risk silent loss.
- No worktree creation UI. Worktrees come from agents + skills + manual
  use; the reaper is one-way.
- No cross-machine worktree state. Single-machine assumption.

## Risk

Very low. The classification is deterministic. The reap action is
narrow — `git worktree remove` + `rm -rf`. Worst-case (uncommitted
work in a worktree we force-reap) is guarded by the porcelain check +
force-flag UI.
