---
id: 8
title: "Changelog/ADR watcher: cron flags architectural-shape merges → ticket → human runs /document"
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

A cron that watches merged MRs across the fleet and, when it sees an
architectural-shape change, drops a backlog ticket "consider ADR for MR
!N" with the diff URL. The human (or a later session) runs `/document`
when ready. **No autonomous ADR writes** — violates global §7's "ADRs
evolve via supersede, never silently rewritten" rule.

**Filter applied:** writing the ADR / changelog entry is foundation-model
territory (`/document` already does it well in-session). The only
harness-shaped slice is noticing the merge happened across N repos
without a human-launched session.

## Mechanism

### Trigger

Two paths, depending on what's already deployed:

**Cron** (default): scheduled launchd job, daily ~9am local. Runs the
watcher script.

**Webhook** (when #0005's webhook receiver lands): on `merge_request.merged`
to main, fire the watcher synchronously for that MR.

### Detection heuristics

For each merged MR since last run, fetch the diff via
`glab mr diff <iid>` / `gh pr diff <num>`. Flag if any of:

| Signal | Match |
|---|---|
| New top-level src dir | New file at `src/<NEW-DIR>/...` |
| New top-level repo dir | New file at `<NEW-DIR>/<anything>` outside known dirs |
| Dependency added | `package.json` / `Cargo.toml` / `go.mod` / `pyproject.toml` deps diff non-trivially |
| Schema/migration touch | File under `migrations/`, `db/`, `prisma/schema.prisma`, `*.sql` migration |
| Architecture doc touch | Modifies `docs/architecture.md`, `docs/decisions/*.md` — already ADR-aware, but flag it for ticket linkage |
| New CI workflow | Adds `.github/workflows/*.yml` or `.gitlab-ci.yml` job |
| New service entry point | Adds `bin/<name>`, `cmd/<name>/main.go`, or a top-level entrypoint file |

Heuristics are intentionally conservative — over-flagging is easy to tune;
under-flagging silently misses the case the watcher exists for.

### Output: backlog ticket

For each flagged MR, file (via `terminal-cli ticket`) into the target repo's
`backlog/`:

```yaml
---
title: "Consider ADR for !72 — added schema migration"
status: open
priority: medium
horizon: future
type: docs
source: changelog-watcher
prs: ["<MR URL>"]
---

Merged MR !72 introduced architectural-shape changes:
- migrations/2026-05-30_add_run_costs.sql (new)
- src/main/observability/ (new top-level dir)
- 2 new top-level src files: cost-rollup.ts, pricing-table.ts

This is a candidate for an ADR (or a runbook update). Run `/document` from
inside this repo when you're ready to write it up. Close this ticket if no
doc is needed.
```

The body includes the actual changed-file list so the human (or
`/document` agent later) doesn't have to refetch the diff.

### Activity + Telegram

- Activity event: `kind: doc` (or new `doc-needed`?), title "ADR candidate
  · MR !72", repo, runId
- Telegram: silent by default (this is low-urgency). Add a digest in the
  daily summary if/when we add one — never a one-off ping.

## Storage

State per (repo, watcher):
```
~/.config/TerMinal/agent-state/<repo-basename>/changelog-watcher.json
{
  "lastScannedSha": "<sha-of-main>",
  "lastRunAt": 1700000000000,
  "lastFlaggedCount": 3
}
```

Reuses the existing per-(repo, agent) state convention. Next run scans
`<lastScannedSha>..main`.

## Dashboard surface

No new tab. Flagged MRs show up as backlog tickets in the existing Tickets
tab with `type: docs` + `source: changelog-watcher`. Filter chip on the
Tickets tab can isolate watcher-filed tickets.

## What this does NOT do

- No autonomous ADR writes. Violates global §7 (no silently-written
  decision history).
- No autonomous CHANGELOG.md edits. Same reason — and CHANGELOG entries
  benefit from human-judged "user-facing yes/no" tags.
- No agent-trigger of `/document` skill. Human starts the session.
- No "summarize this PR for the team" output. That's `/document` in-session.
- No retroactive scan beyond `lastScannedSha`. First run starts a new
  watermark; old merges aren't backfilled.

## Stage plan

**Stage 1** — Watcher script as a scheduled agent (`.agents/changelog-
watcher.sh`) installed via project-template. Reuses
`terminal-cli state mark-main` for cadence. Uses heuristics above.

**Stage 2** — Schedule it on the harness for one repo manually first
(probably vellum-project as the test). Iterate heuristics for a week.

**Stage 3** — Roll out via project-template's bootstrap (any repo opted
into the watcher gets one ticket per architectural-shape merge).

## Non-goals

- No ML-classified "is this architectural" model. Heuristics over LLM
  classification — predictable, cheap, easy to tune.
- No PR-time hook. Post-merge cron is enough; PRs evolve mid-review and
  flagging them while still open creates churn.

## Risk

Very low. Over-flagging → noise in the Tickets tab (tunable). Under-flagging
→ misses the case the watcher exists for (also tunable). No mutation
beyond filing tickets.
