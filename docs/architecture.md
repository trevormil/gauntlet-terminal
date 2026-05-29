# Architecture

Evergreen overview of how TerMinal is put together. Edit in place as
the system changes.

## Shape

An Electron app in three layers, built with **electron-vite**:

- **main** (`src/main/`) — Node. Spawns PTYs, owns all filesystem/CLI reads,
  exposes everything over IPC. No DOM.
- **preload** (`src/preload/index.ts`) — the single `gt` bridge, published to the
  renderer via `contextBridge`. Every renderer↔main call goes through it.
- **renderer** (`src/renderer/src/`) — React 19 + Tailwind v4. The UI: the
  multi-session shell, per-session cockpit + tabs, plugins, editors.

```
renderer  ──(window.gt.*)──►  preload  ──(ipcRenderer/ipcMain)──►  main  ──►  fs / pty / gh·glab / git
```

## Multi-session model

One window hosts N Claude sessions. `App.tsx` keeps a list of sessions and a
top **session tab bar**; each session is rendered by a `SessionView` that stays
mounted (so its terminal/scrollback survives backgrounding) and is shown/hidden
by visibility.

In **main**, sessions live in a `Map<key, { pty, pinned }>` with an `activeKey`.
PTY IPC (`pty:input/resize/data/exit`) is routed by session key; the data IPC
(`data:*`, tickets, notes, files…) reads the **active** session via `cur()`. The
renderer calls `session:setActive(key)` whenever the active tab changes.

Each `SessionView` mounts:

- a **TerminalPane** (xterm.js) — always mounted; its PTY runs `claude`.
- a **cockpit** aside — the widget stack (rendered only when the session is
  active, so backgrounded sessions don't poll).
- the **tab** overlay — full-screen surfaces that sit over the terminal grid.

## Plugins & tabs (auto-discovery)

Both are "just a folder" discovered with Vite `import.meta.glob`:

- **Plugins** — `src/renderer/src/plugins/<id>/index.tsx` default-exporting a
  `Plugin` (`{ id, title, icon, intervalMs, poll, render, … }`). `PluginWidget`
  runs each one's `poll` loop (interval + optional transcript-tick) and renders
  its card. Enable/hide state persists in `localStorage`.
- **Tabs** — `src/renderer/src/tabs/<id>/index.tsx` default-exporting a `Tab`
  (`{ id, title, icon, order, appliesTo(ctx), badge?, Component }`).
  `SessionView` filters by `appliesTo(tabContext)` and polls `badge(gt)` for the
  live count pill (HITL).

`icon` is a `lucide-react` component in both. **Command widgets**
(`lib/commandWidget.tsx`) wrap a declarative JSON shell-command spec as a Plugin.

## Data sources (main)

- `data.ts` — parses the session transcript
  `~/.claude/projects/<cwd-hash>/<session-id>.jsonl` (context, tokens, model,
  branch, last action, ai-title, permission mode, tool counts) and
  `~/.claude/tasks/<id>/*.json` (todos). Also computes the harness TDD/review.
- `usage.ts` — `GET /api/oauth/usage` with the keychain OAuth token; cached
  (rate-limited).
- `backlog.ts` — tickets from `<repo>/backlog/*.md` (frontmatter incl.
  `horizon`/`hitl`); create/update write back.
- `mrs.ts` — merge/pull requests via `glab` (GitLab), enriched with review state.
- `review.ts` — resolves code-review artifacts from in-repo `.reviews/<pr>/`
  (project-template) **or** the legacy autopilot-harness `prs/` store; handles
  the meta.json (commit-ordered) and no-meta (mtime) cases, with staleness.
- `sessions.ts` — per-repo session docs `<repo>/sessions/NNNN-slug/session.md`.
- `files.ts` — path-guarded dir/read/write/search (`git grep`), with
  `git check-ignore` marking for the dimmed tree.
- `scaffold.ts` — new-repo scaffolding from the project-template submodule (or a
  clone fallback in the packaged app).
- `repo.ts` — `repoForCwd` (origin → host/owner/repo), `repoRootOf`, git status.

## Styling

Dark theme, tokens in `src/renderer/src/index.css` (`--gt-*`). Type is **IBM
Plex Sans** (chrome) + **IBM Plex Mono** (numerics/code/editor) via `@fontsource`
+ Tailwind `@theme`. Icons are **lucide-react**. The CodeMirror editor uses the
oneDark *highlight* style over a custom dark surface.

### CodeMirror single-instance constraint

CodeMirror breaks silently if any core package resolves to more than one copy
(the editor and the language parsers get different `state`/`view`/facet
instances → no highlighting). `package.json` `overrides` pin
`@codemirror/state` + `@codemirror/view` to single versions, and
`electron.vite.config.ts` `resolve.dedupe` covers the whole core
(`state`, `view`, `language`, `@lezer/common`, `@lezer/highlight`). Keep both in
sync if you touch CodeMirror deps.

## Packaging

`bun run dist` = `electron-vite build` → `electron-builder --mac` (config in
`electron-builder.yml`). Produces an unsigned `.app` + `.dmg`; `node-pty` is
`asarUnpack`'d (native `.node` can't live in the asar). arm64 needs a deep
ad-hoc re-sign to launch cleanly — see `runbooks/build-and-release.md`.
