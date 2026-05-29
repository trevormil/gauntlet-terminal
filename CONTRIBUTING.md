# Contributing

Thanks for taking a look. TerMinal is a small, hackable Electron app —
contributions of all sizes are welcome.

## Dev setup

Requires [bun](https://bun.sh) and the `claude` CLI on your `PATH`.

```bash
git clone https://github.com/trevormil/TerMinal.git
cd TerMinal
git submodule update --init   # vendors project-template (for scaffolding)
bun install                   # rebuilds node-pty against Electron's ABI
bun run dev                   # launch the dev build with HMR
```

See [`docs/setup.md`](docs/setup.md) for the optional bits (GitHub/GitLab CLIs,
Telegram, engines).

## The shape of the code

- **`src/main/`** — Electron main process (ESM bundle — **no `__dirname` /
  `require`**; use `import.meta`). Node-only logic lives here; keep pure,
  testable logic in its own module (`forge.ts`, `settings.ts`,
  `telegram-api.ts`, `lib/ci.ts`, …) with a sibling `*.test.ts`.
- **`src/preload/index.ts`** — the single `window.gt` bridge. Add an IPC handler
  in `main/index.ts` and expose it here.
- **`src/renderer/`** — React + Tailwind. **Tabs** auto-discover from
  `tabs/<id>/index.tsx`; **plugins** (cockpit widgets) from `plugins/<id>/`. Drop
  a folder in — no registry edits. See the README "Writing a plugin / tab".

## Before you open a PR

```bash
bunx tsc --noEmit    # type gate
bun test             # unit tests (pure logic)
bun run build        # bundles cleanly
```

- Add/adjust tests for behavior changes (pure logic is the easy win to cover).
- Match the existing style; the project uses Prettier defaults and
  [Conventional Commits](https://www.conventionalcommits.org)
  (`feat:` / `fix:` / `docs:` / `refactor:` / `test:` / `chore:`).
- A green build is **not** a working app — for changes to `main/`, launch the
  packaged build and confirm the window actually opens (`bun run dist`, or
  `bun run release` on macOS).

Keep changes surgical and the dashboard/app intentionally thin. Open an issue
first if you're planning something large.
