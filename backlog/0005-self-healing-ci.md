---
id: 5
title: "Self-healing CI: webhook → classify → cheap-class auto-fix or HITL"
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

Detect red CI on tracked MRs across the fleet and either auto-fix the
narrowest cheap classes (prettier first, lint/typecheck later if v0 proves
out) or route to the HITL inbox with the parsed log excerpt. The repair
intelligence stays in codex exec / claude; the harness owns the trigger +
queue + isolation.

**Filter applied:** repair brain is foundation-model territory (don't
rebuild). What's harness-only: wake-on-event trigger, cross-repo CI
awareness, HITL routing, worktree isolation. Without those, this is just
codex exec; with them, it's a fleet-level safety net.

**Conflict with global §8:** auto-fix-and-push to a feature branch is fine
(pre-merge, human gates main). Never extends to main. The "real test
failure" class explicitly routes to HITL, not auto-push, to avoid silently
papering over actual bugs.

## Mechanism

**1. Webhook listener** — extend the dashboard's existing Hono server on
:4848 with `POST /api/ci-webhook`. GitLab / GitHub project webhooks point
at it. Lightweight; verifies the signature header against a configured
secret per repo (`prs/config.yml` extended).

**2. Triage** — on `pipeline.status === 'failed'` for an open MR:
- Pull CI log via `glab ci view --log <pipeline-id>` or `gh run view --log`
- Determine the failing stage (`prettier --check`, `tsc`, `bun test`,
  `vite build`, etc.)
- Run a tiny classifier prompt (haiku/cheap model): "Given this log excerpt
  + the failing stage name, classify as one of: prettier-formatting,
  eslint-fixable, typecheck-isolated, snapshot-mismatch, test-real,
  build-config, deploy-infra, ambiguous. Return only the label."

**3. Cheap-class auto-fix** — for the v0 allowlist (initially just
`prettier-formatting`):
- Worktree at `~/CompSci/gauntlet/.worktrees/<repo>/ci-fix-<short-id>/` on
  the MR's source branch
- One-shot `codex exec` with a narrow prompt: "The CI ran prettier --check
  and these files failed. Run prettier --write on them, commit, push."
- Comment on the MR: "🤖 Auto-fixed prettier on N file(s). See <commit-url>."
- File an activity event (`check` kind) so it shows up in the Activity tab
- Also file an INFO-level HITL item (or activity event with `runId`) so
  the operator can verify

**4. Non-cheap classes → HITL** — drop a HITL item with:
- Title: "CI red on <MR> · <stage>"
- Action: "Investigate why <stage> failed"
- Detail: classification + first ~30 lines of the failure
- runId / MR pointer for tap-to-view in Telegram

## Allowlist evolution

v0: `prettier-formatting` only.

After 1 week of clean operation in real use, evaluate adding (in this
order, one at a time):
- `eslint-fixable` (auto-fixable lint rules only — `--fix` flag)
- `typecheck-isolated` (typecheck error confined to one file, no
  cross-file refactor)
- `snapshot-mismatch` (only when the snapshot is non-functional, e.g. a
  CSS-only diff; never for behavior assertions)

Test-real, build-config, deploy-infra, ambiguous — never auto-fix. Always
HITL.

Each broadening step requires:
1. A week of v0 running cleanly
2. Manual review of every classifier decision the week prior
3. An explicit ticket bumping the allowlist

## Storage

`~/.config/TerMinal/ci-fixes/<id>.json`:
```json
{
  "id": "uuid",
  "repo": "trevormiller/vellum-project",
  "mrIid": 72,
  "pipelineId": 1234,
  "classification": "prettier-formatting",
  "outcome": "fixed" | "hitl" | "skipped",
  "fixSha": "abc1234",
  "hitlId": null,
  "startedAt": 1700000000000,
  "endedAt": 1700000060000
}
```

Pairs with #0001 — the classifier + fix runs count as AI spend.

## Dashboard surface

New section on the **PRs tab** (above the MR list):

```
🩺 CI watchdog (this week)
   3 auto-fixed (prettier) · 2 HITL-routed · 0 misclassified
```

Each red MR row gets a small status badge:
- 🤖 "auto-fixed prettier" (with commit link)
- ⛔ "HITL filed" (with link to the HITL item)
- — "ignored (ambiguous)" (manual review needed)

## Telegram

- New auto-fix push: silent (just an Activity event)
- New HITL from CI: standard HITL ping with [✅ Resolve] [🪵 Tail]
- `/ci` — last 10 CI fixes/HITLs with status

## Dry-run mode

v0 ships with `dryRun: true` default in `~/.config/TerMinal/ci-watchdog.json`.
Classifier still runs, results recorded to `ci-fixes/<id>.json`, but NO
push to the MR branch. Operator reviews the would-have-fixed records for a
week before flipping `dryRun: false`.

## Failure modes

| Failure | Mitigation |
|---|---|
| Misclassifies real bug as prettier | Allowlist is tiny; prettier-only changes are visible in MR diff |
| Auto-fix breaks the build | Pre-merge — feature branch, not main. Human reviewer catches |
| Webhook receives a forged payload | Verify signature; require shared secret per repo |
| Watchdog itself crashes mid-fix | Tasks are stateless; next webhook re-evaluates |
| Multiple webhooks for same pipeline | Dedup on `pipelineId` |
| Loops (auto-fix triggers new CI which fails for a different reason) | Per-MR fix cap (e.g. 3 auto-fixes per MR before forcing HITL) |

## Stage plan

**Stage 1** — webhook receiver + signature verify + log fetch + classifier
(`dryRun: true`). No fix path yet. Just log what WOULD happen.

**Stage 2** — Activity events + dashboard CI watchdog section. Operator
reviews the dry-run record for a week.

**Stage 3** — HITL routing for non-cheap classes (still no auto-fix yet).
Telegram pings.

**Stage 4** — Flip `dryRun: false` for prettier-formatting only. Verify a
week.

**Stage 5+** — Broaden allowlist one class at a time, each gated on a
new ticket.

## Non-goals

- Never auto-fix `main`. Feature branches only.
- No new agent runtime — just `codex exec` with narrow prompts in
  worktrees.
- No retry-on-failure for the fix itself. One shot, then HITL.
- No auto-rerun-CI button. Use `glab ci retry` / `gh run rerun` directly.
- No queue depth limits in v1; revisit if it becomes a problem.

## Risk

Medium. Mitigated by:
- Tiny allowlist (prettier only at v0)
- Mandatory dry-run week before each broadening
- All auto-fixes file activity events for visibility
- Feature-branch-only blast radius
- Per-MR fix cap to prevent loops
