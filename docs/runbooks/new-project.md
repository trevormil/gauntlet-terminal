---
title: Spin up a new project from project-template
last-verified: 2026-05-28
---

# New project from project-template

Gauntlet Terminal vendors
[project-template](https://github.com/trevormil/project-template) as a git
submodule at `templates/project-template` and can scaffold a brand-new repo from
it. Scaffolding **never** touches an existing directory — the target must be a
new path.

## From the app (session picker)

1. Launch (`bun run dev` or the installed app) → the session picker.
2. **New project from template** card: type a project name, optionally pick a
   parent folder (default: your configured projects dir, else `~`), hit **Create**.
3. It copies the template into `<parent>/<name>`, runs `git init` + a first
   commit, and opens a Claude session there.

If the name already exists in that folder you get an error and nothing is
written — pick a new name.

## From the terminal

```bash
bin/new-project my-app                  # → <your projects dir>/my-app
bin/new-project my-app /path/to/parent  # custom parent
```

Then create the remote when ready:

```bash
cd <dest>
# fill the CLAUDE.md placeholders first
gh repo create <name> --source=. --private --push
```

## Keeping the template in sync

Both scaffolders `git pull --ff-only` the submodule before copying, so a fresh
scaffold tracks the latest upstream even if the pinned commit is behind. To bump
the committed submodule pointer in this repo:

```bash
git submodule update --remote templates/project-template
git add templates/project-template && git commit -m "chore: bump project-template"
```

## How it resolves the template

- **Dev / from source** — uses the bundled submodule at
  `templates/project-template`.
- **Packaged app** — the submodule isn't bundled, so `scaffoldProject` falls
  back to a shallow `git clone` of the upstream repo (always latest).

Both paths skip `.git`, `.gitmodules`, and `node_modules` when copying.
