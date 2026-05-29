# TerMinal — setup

TerMinal is self-configuring: it works on first launch with sensible
defaults and **detects** what's installed on your machine. Nothing here is
required to start — missing tools just disable the features that need them, with
a clear hint in Settings. Everything below is also reachable from the in-app
**Settings** panel (gear icon, top-right) and the first-run **Onboarding**.

> Tip: you already have a Claude instance — use it. Settings → **Setup &
> integrations → Copy global-skills setup prompt** copies a prompt you can paste
> into Claude to have it walk you through the rest (CLI auth, global skills,
> Telegram). The fastest path is to let Claude do it.

## 1. Engines (required: one of)

Agents and sessions run through an engine CLI:

- **`claude`** — required for terminal sessions; one of the two agent engines.
- **`codex`** — optional second agent engine.

Install at least one. The app finds them on your `PATH`; if yours lives
somewhere unusual, set an explicit path in **Settings → Engines**. Pick your
default engine there too. (A Finder/Dock-launched app gets a minimal `PATH`, so
the app re-resolves your login shell's `PATH` at startup to find Homebrew CLIs.)

## 2. Code forge (optional: GitHub and/or GitLab)

The PRs/MRs tab, CI status, and the merge button work for **both** forges. The
app picks the right CLI per repo from its `origin` remote:

| Remote host | CLI | Vocabulary |
|-------------|-----|------------|
| `github.com` | `gh` | "PR", `#123` |
| anything else (GitLab) | `glab` | "MR", `!123` |

Install + authenticate whichever you use:

```sh
brew install gh    # then: gh auth login
brew install glab  # then: glab auth login
```

**Settings → Code forge** shows install + auth state per CLI, and lets you force
`github`/`gitlab` instead of auto-detect.

## 3. Global agent skills (recommended)

Agents the app spins out are plain `claude -p` / `codex exec` processes, so they
**inherit your global config** — `~/.claude/CLAUDE.md`, `~/.codex/`, and any
skills you've installed. A richer global setup → better agent runs. The
project-template workflow uses skills like `code-review`, `iterate`,
`test-suite`, `document`, `pr-creation`, `stacked-mr`, and `notify`.

Two ways to set them up:

- **Let Claude do it (recommended):** Settings → **Copy global-skills setup
  prompt**, paste into a Claude session. It checks what you have and installs the
  rest from your template repo into `~/.claude/skills` (and `~/.codex/skills`).
- **Manual:** clone your template repo (default
  `https://github.com/trevormil/project-template`, configurable in
  **Settings → Projects & worktrees**) and follow its setup docs to symlink its
  skills into `~/.claude/skills` / `~/.codex/skills`.

The app works without these — they enhance the agent/PR workflow, they don't
gate sessions.

## 4. Telegram (optional — notifications + AFK control)

Native Bot API, no scripts required:

1. Message **@BotFather** on Telegram → `/newbot` → copy the token.
2. Find your numeric **chat id** (e.g. message **@userinfobot**).
3. **Settings → Telegram**: paste the token + chat id, hit **Test** (you should
   get a message), then toggle **Mirror notifications** and/or **Remote
   control** (launch/cancel agents by texting the bot — that one chat id is the
   auth boundary).

If you leave the token blank but have the legacy `~/.claude/bin/telegram-*.sh`
scripts, the app falls back to those.

## 5. Activity feed hook (`gt-notify`)

Anything can surface in the **Activity** tab + notifications by appending one
JSON line to `~/.config/TerMinal/activity.jsonl`:

```json
{"id":"...","ts":1700000000000,"kind":"task-complete","title":"...","detail":"...","repo":"...","repoRoot":"...","sessionId":"..."}
```

`kind` is one of `task-complete | ticket-filed | pr-verdict | session-start |
agent-run | error | info`. The portable helper does the escaping for you:

```sh
gt-notify task-complete "Build passed" --detail "all green" --repo owner/proj
```

Install it from **Settings → Setup & integrations → Install gt-notify** (writes
to `~/.local/bin`), or run `bin/gt-notify` from this repo directly. Skills, CI
steps, and git hooks can call it to push events into the cockpit.

## Where settings live

`~/.config/TerMinal/settings.json` — created/migrated automatically.
Re-run the first-time walkthrough anytime via **Settings → Re-run first-time
setup**.
