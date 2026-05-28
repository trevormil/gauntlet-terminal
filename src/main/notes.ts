import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { homedir } from 'node:os'

// Notes:
//   global → ~/.config/gauntlet-terminal/notes.md  (unbound, spans all repos)
//   repo   → <repoRoot>/.gauntlet-terminal/notes.md (bound to the repo, gitignored)
// Both persist on disk, so they survive across sessions.

export type NotesScope = 'repo' | 'global'

const GLOBAL = join(homedir(), '.config', 'gauntlet-terminal', 'notes.md')
const repoNotesPath = (repoRoot: string) => join(repoRoot, '.gauntlet-terminal', 'notes.md')

// keep notes.md out of git without touching the committed widgets.json
function ensureGitignored(repoRoot: string) {
  const gi = join(repoRoot, '.gitignore')
  const entry = '.gauntlet-terminal/notes.md'
  try {
    let content = existsSync(gi) ? readFileSync(gi, 'utf8') : ''
    if (content.split('\n').some((l) => l.trim() === entry)) return
    if (content && !content.endsWith('\n')) content += '\n'
    writeFileSync(gi, content + entry + '\n')
  } catch {
    /* best effort — note still works, just not auto-ignored */
  }
}

function pathFor(scope: NotesScope, repoRoot: string): string {
  return scope === 'global' ? GLOBAL : repoRoot ? repoNotesPath(repoRoot) : ''
}

export function readNotes(scope: NotesScope, repoRoot: string): string {
  const p = pathFor(scope, repoRoot)
  if (!p || !existsSync(p)) return ''
  try {
    return readFileSync(p, 'utf8')
  } catch {
    return ''
  }
}

export function writeNotes(scope: NotesScope, content: string, repoRoot: string): boolean {
  const p = pathFor(scope, repoRoot)
  if (!p) return false
  if (scope === 'repo') ensureGitignored(repoRoot)
  try {
    mkdirSync(dirname(p), { recursive: true })
    writeFileSync(p, content)
    return true
  } catch {
    return false
  }
}
