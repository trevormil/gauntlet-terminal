---
id: 12
title: "Reports tab: browse repo reports/ directories + view .md files inline"
status: open
priority: low
horizon: now
hitl: false
type: ux
source: dogfood
created: 2026-05-30
updated: 2026-05-30
prs: []
refs: []
depends_on: []
---

The Reports tab is a placeholder today. Real use case is unambiguous:
agents (drift, code-review, /test-suite, checks/*, etc.) drop their
output markdown into `reports/<kind>/<sha>.md` per the project-template
convention — the harness needs a way to view them. No new artifact
shape, no aggregation, no synthesis — just a file browser scoped to the
managed repos' reports/ trees, with inline .md rendering.

**Filter applied:** real UI feature, the existing tab is a stub, and
this matches what agents already write. Strictly an app surface, not a
workflow.

## What it shows

Left rail: tree of report directories across the active workspace's
repo, optionally toggleable to span ALL managed repos.

```
trevormiller/vellum-project
  reports/
    drift/
      abc1234.md          2h ago
      9b3de89.md          3d ago
    code-review/
      ...
    checks/
      dead-code/
        ...
```

Right pane: rendered markdown of the selected file.

Cross-repo toggle in the header: `[ this repo · all repos ]` — when all,
the tree prefixes each entry with the repo basename.

## Sources scanned

Per managed repo:
- `<repo>/reports/<kind>/<filename>.md`
- `<repo>/checks/<kind>/<filename>.md` (already convention for repo-level
  inspections like dead-code; surface them here too)

Globs:
```
reports/**/*.md
checks/**/*.md
```

Sort within each kind: newest mtime first.

## Markdown rendering

Reuse the existing markdown renderer (TicketsBrowser / DocsTab uses
something — same component). YAML frontmatter parsed and shown as a
compact metadata strip above the body (kind, generated, sha, findings
count, etc.).

Anchors in the rendered output → scrollable, `<h2>` anchors clickable to
copy a deep link `<repo>/reports/<kind>/<sha>.md#<anchor>`.

## Filters

Header chips:
- `kind: all | drift | code-review | dead-code | flakes | ...` —
  populated from observed dirnames
- `repo: all | this | <picker>` (only when cross-repo toggle is on)
- Search input over the title (first H1 of each .md)

## Actions per file

- 📂 Reveal in Finder (existing `open:external` IPC)
- 📋 Copy path
- ✏️ Open in editor (existing `open:in-editor` IPC)

## Empty state

When no reports/ or checks/ dirs exist in the active repo:

> No reports yet. Agents that drop their output here will show up
> automatically — e.g., `/drift`, `/code-review`, `/dead-code`, custom
> checks. See `.agents/scripts.md` for the convention.

## Implementation

- New IPC `reports:tree(repoRoot?, allRepos?)` → returns the file tree
  with mtimes
- New IPC `reports:read(absPath)` → returns the markdown body + parsed
  frontmatter (gray-matter)
- Tab Component uses existing markdown renderer; tree is a simple
  recursive list

## Non-goals

- No new "report" artifact format. Just whatever .md files exist.
- No synthesis / digest / "report-of-reports."
- No editing — viewer only. Agents write; humans read.
- No file watching / auto-refresh. A manual "↻" button + the existing
  activity-feed onEvent listener (kind: `check`) to reload when a fresh
  report lands.
- No tab-badge count (would be noisy as reports accumulate).

## Risk

None. Read-only file browser over existing on-disk artifacts.
