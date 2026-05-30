---
id: 8
title: "Changelog/ADR watcher: cron flags architectural-shape merges → ticket → human runs /document"
status: closed
priority: low
horizon: future
hitl: false
type: feature
source: research
created: 2026-05-30
updated: 2026-05-30
prs: []
refs: []
depends_on: []
---

Closed: this is a pure agent, not an app feature. Implement as
`.agents/changelog-watcher.sh` in `project-template` when needed —
uses existing harness helpers (`terminal-cli state mark-main` for
cadence, `terminal-cli ticket` for output). No app code required.

When ready to ship: write the script in project-template/.agents/,
opt repos into it via the existing schedule UI. Heuristic catalog +
state contract are documented below as a build guide for that day.

## When to write the script

When a repo accumulates enough merged MRs that "did anyone write the
ADR for X?" becomes a real question. Until then, manual `/document`
in-session is fine.

## Build guide for the eventual .sh

```bash
#!/usr/bin/env bash
# .agents/changelog-watcher.sh
set -uo pipefail

last=$(terminal-cli state get-sha)
git -C "$TERMINAL_REPO" fetch --quiet origin || true
head=$(git -C "$TERMINAL_REPO" rev-parse origin/main 2>/dev/null \
    || git -C "$TERMINAL_REPO" rev-parse HEAD)
[ "$head" = "$last" ] && exit 0

range="${last:-HEAD~50}..$head"
changed=$(git -C "$TERMINAL_REPO" diff --name-only "$range")

# Heuristics: flag architectural-shape signals
flagged=""
echo "$changed" | grep -qE '^src/[^/]+/$' && flagged+="new top-level src dir\n"
echo "$changed" | grep -qE '(package\.json|Cargo\.toml|go\.mod|pyproject\.toml)$' \
  && flagged+="dependency change\n"
echo "$changed" | grep -qE '(migrations/|\.sql$|prisma/schema\.prisma)' \
  && flagged+="schema/migration touch\n"
echo "$changed" | grep -qE 'docs/decisions/' && flagged+="ADR file touched\n"

if [ -n "$flagged" ]; then
  terminal-cli ticket "Consider ADR for $range" \
    "Architectural-shape signals detected:\n\n$flagged\n\nDiff: $range\n\nRun /document when ready."
fi

terminal-cli state mark-main
```

That's the whole thing. No app ticket needed.
