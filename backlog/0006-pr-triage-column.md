---
id: 6
title: "PR triage column: risk_tier in /code-review frontmatter + sortable PRs queue"
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

Add a single `risk_tier: low|medium|high` field to the `/code-review`
artifact frontmatter, then surface it as a sortable column on the
dashboard's PRs tab. Cross-repo queue ordering for the only reviewer
(human) who'd ever look at it.

**Filter applied:** per-PR classification is already what `/code-review`
does — building a separate triage agent would duplicate that work. The
only harness-shaped slice is the cross-PR queue view across N repos. So
this is a frontmatter line + a column, not a new agent.

## Mechanism

### Spec change

Extend `.agents/code-review.md` schema (lives in project-template):

```yaml
---
# existing
verdict: approve | request-changes | blocked
overall: 87
correctness: 90
security: 85
architecture: 88
conformance: 92
quality: 85
dependencies: 90
test_status: pass
# new
risk_tier: low | medium | high
# (codex is already analyzing along security/architecture/correctness — risk
# is implicit in those scores; we make it explicit for queue sorting)
---
```

Codex assigns:
- `high` — any axis < 70, OR test_status: fail, OR verdict: blocked, OR
  touches auth/payments/migrations/external APIs
- `medium` — verdict: request-changes, OR any axis 70-79
- `low` — verdict: approve AND all axes ≥ 80

The spec change is one paragraph in `.agents/code-review.md` describing the
rules. Codex follows it on the next review.

### Dashboard surface

PRs tab columns become:
```
status · repo · risk · MR · title · verdict · score · age
```

`risk` column shows a colored pill:
- 🔴 high   (sortable to top by default)
- 🟡 medium
- 🟢 low
- — unscored (no review artifact yet)

Click the column header to sort. Default sort: status=opened, risk=high
first, then by MR age desc. Filter chip set:
- `[ all  risk:high  risk:medium  unscored ]`

Existing artifacts without the field show as "unscored" and sort to the
bottom — graceful fallback while reviews regenerate.

### Telegram

`/prs risk:high` — filtered list
`/prs @repo risk:high` — per-repo
`/prs unscored` — needs review

## What this is NOT

- No separate triage agent. `/code-review` already classifies the relevant
  signals; we just give it a name (`risk_tier`) and a way for the
  dashboard to sort by it.
- No "estimated review time" — too noisy a signal to be useful without
  per-repo calibration.
- No auto-assignment / reviewer routing. Single human reviewer.
- No "blocks other PRs" detection. Would need real dep analysis; not worth
  it for the marginal value.
- No retroactive backfill of old review artifacts. They sort to the bottom
  as `unscored` until the next regeneration.

## Stage plan

**Stage 1** — Update `.agents/code-review.md` spec in project-template. The
spec change is the contract; codex follows it on the next run.

**Stage 2** — Dashboard PRs tab gets the column + sort + filter chips.
Backward compat: missing field → `unscored`.

**Stage 3** — Telegram `/prs` filters.

## Non-goals

- No new schema for the review artifact storage layer (`prs/<host>/<repo>/
  <num>/<sha>.md` stays unchanged structurally — just one new YAML key).
- No model upgrade for triage classification. Codex's existing review pass
  picks `risk_tier` along the way.

## Risk

Very low. One frontmatter field + a column. Existing artifacts gracefully
degrade. If codex's risk assignment turns out noisy, we tune the spec
rules; no infra change.
