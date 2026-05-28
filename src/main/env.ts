import { execFileSync } from 'node:child_process'
import { homedir } from 'node:os'

// Finder/dock-launched macOS apps inherit only a minimal PATH
// (/usr/bin:/bin:/usr/sbin:/sbin), so Homebrew-installed CLIs (glab, gh, codex,
// claude) aren't found by execFile/spawn — the MRs/CI/merge features silently
// no-op as "not authenticated". Resolve the real login-shell PATH once at
// startup and merge in the well-known bin dirs as a fallback.
export function fixPath(): void {
  let resolved = ''
  try {
    const shell = process.env.SHELL || '/bin/zsh'
    const out = execFileSync(shell, ['-ilc', 'echo "__GT_PATH__:$PATH"'], {
      encoding: 'utf8',
      timeout: 5000,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    const line = out.split('\n').find((l) => l.startsWith('__GT_PATH__:'))
    resolved = line ? line.slice('__GT_PATH__:'.length).trim() : ''
  } catch {
    /* fall back to the well-known dirs below */
  }
  const fallback = ['/opt/homebrew/bin', '/opt/homebrew/sbin', '/usr/local/bin', `${homedir()}/.local/bin`]
  const merged = [
    ...(resolved ? resolved.split(':') : []),
    ...(process.env.PATH ? process.env.PATH.split(':') : []),
    ...fallback,
  ].filter(Boolean)
  process.env.PATH = [...new Set(merged)].join(':')
}
