---
id: 7
title: "Deploy ledger: persist (sha, repo, env, at, deployer) + cross-repo 'what's live' view"
status: open
priority: low
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

A thin ledger that records every deploy event across managed repos so the
harness can answer "which SHAs are live where, since when" without
re-deriving it each session.

**Filter applied:** Claude/Codex sessions forget Tuesday's deploy by
Friday. The harness uniquely persists cross-session + cross-repo state.
APM / Sentry / Datadog territory is OUT of scope — this is just a log of
"who shipped what when," not regression detection.

## Storage

`~/.config/TerMinal/deploys.jsonl` — append-only:

```jsonl
{"id":"uuid","sha":"abc1234","repo":"trevormiller/vellum-project","env":"prod","at":1700000000000,"deployer":"trevor","note":"optional"}
{"id":"uuid","sha":"def5678","repo":"trevormiller/agentforge","env":"staging","at":1700000010000,"deployer":"trevor"}
```

JSONL not SQLite — greppable, no migration. Edits are by hand if you log
something wrong.

## Logging endpoints

**1. CLI** (primary — fits into deploy scripts):
```bash
terminal-cli deploy log <repo> <env> [sha] [--note "<text>"]
# Examples:
#   terminal-cli deploy log vellum-project prod
#       # records HEAD of cwd's git repo
#   terminal-cli deploy log agentforge staging abc1234 --note "hotfix"
```

Env can be any string (`prod`, `staging`, `canary`, `eu-west-1`, etc.) —
no enum. The user/script decides.

**2. Telegram:**
```
/deploy <repo> <env> [sha]
```

Useful for "I just bumped the digit on the prod box from my phone" cases.

**3. Dashboard button** (Stage 3): "+ Deploy" on the new Deploys tab — opens
a form (repo + env + optional sha + note). Submits to the same logging
path.

## Auto-detect: explicitly skipped

Every repo ships differently (kubectl apply, rsync+restart, docker push,
GitLab Pages, Heroku, custom scripts). Auto-detection requires per-repo
adapters that drift. Manual / scripted log is the simpler invariant — when
you ship, you log.

The exception path: if a `deploy:` activity event lands (from a
project-template-installed `/deploy` skill), the ledger records it
automatically. Skills opt in by emitting the event; nothing assumes.

## Dashboard surface

**New tab: Deploys** (order ~3.6 — after Schedules):

```
Cross-repo · what's live
┌────────────────────────────────────────────────────────────┐
│ repo                  · env     · sha     · at      · note │
├────────────────────────────────────────────────────────────┤
│ vellum-project        · prod    · abc1234 · 2h ago  ·      │
│ vellum-project        · staging · def5678 · 3h ago  · hotfix│
│ agentforge            · prod    · ghi9012 · 1d ago  ·      │
│ ...                                                        │
└────────────────────────────────────────────────────────────┘
```

Filter chips: env (prod/staging/all), repo (sourced from ledger + tracked
repos).

Click a row → drill-down shows:
- The deploy event raw record
- PR/MR links for merges between this SHA and the previous deploy SHA in
  the same (repo, env) — "what shipped"
- (When #0001 lands) AI-authored commits highlighted in that range

## Cross-repo "live in prod" view

A sub-section on the same tab showing the latest deploy per (repo, env):

```
What's live in prod
  vellum-project   · abc1234 · 2h ago
  agentforge       · ghi9012 · 1d ago
  helios           · pqr3456 · 5d ago
  ...
```

This is the answer to "what's currently running across my fleet" — one
glance, no SSH-ing, no remote logs.

## Telegram

- `/deploy <repo> <env> [sha]` — log
- `/deploys` — last 10 across all repos
- `/deploys @repo` — repo-only
- `/deploys prod` — env-filter ("what's live in prod right now")
- `/whatsLive <repo>` — current SHA per env for one repo

## Pairs with #0001 (eventually)

Once observability lands, deploys can carry a "spent_on_authoring_this_sha"
roll-up — the cumulative cost of AI runs that contributed commits between
the previous deploy SHA and this one. Answers "what's the dollar cost of
the code I just shipped?"

## Stage plan

**Stage 1** — JSONL + `terminal-cli deploy log` + Telegram `/deploy` +
`/deploys`. No UI yet; verifiable via the ledger file.

**Stage 2** — Deploys tab on dashboard with the cross-repo + per-repo
views.

**Stage 3** — Drill-down join with PR/MR artifacts ("what shipped").

**Stage 4** — Add `/deploy` skill in project-template that emits a
`deploy:` activity event after a successful deploy (so the ledger auto-
populates without manual call).

## Non-goals

- No regression detection. No error-rate joins. No rollback. APM/SaaS
  territory.
- No environment topology / inventory. Just a ledger of events, not a
  description of the world.
- No auto-detect across N deploy scripts.
- No write-tracking by individual humans across a team (single-user).

## Risk

Very low. Append-only JSONL; edits are manual file-level. No live system
depends on it being correct — it's a memory aid + a dashboard view.
