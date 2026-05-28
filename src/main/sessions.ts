import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { parseFrontmatter } from './frontmatter'

// Project sessions: <repoRoot>/sessions/NNNN-slug/session.md (project-template
// convention). Distinct from Claude Code sessions — these are the repo's live
// work-session docs.
export type ProjectSession = {
  slug: string
  id: number
  title: string
  status: string // active | closed | abandoned
  goal: string
  started: string
  ended: string
  anchor: string
  tickets: string[]
  branches: string[]
  prs: string[]
  body?: string
}

const sessionsDir = (repoRoot: string) => join(repoRoot, 'sessions')

function toSession(slug: string, md: string, withBody = false): ProjectSession {
  const { fm, body } = parseFrontmatter(md)
  const arr = (v: unknown) => (Array.isArray(v) ? (v as string[]) : [])
  const str = (v: unknown) => (typeof v === 'string' ? v : '')
  const ended = str(fm.ended)
  return {
    slug,
    id: Number(fm.id) || 0,
    title: str(fm.title) || slug,
    status: str(fm.status) || 'active',
    goal: str(fm.goal),
    started: str(fm.started),
    ended: ended === 'null' ? '' : ended,
    anchor: str(fm.anchor),
    tickets: arr(fm.tickets),
    branches: arr(fm.branches),
    prs: arr(fm.prs),
    ...(withBody ? { body: body.trim() } : {}),
  }
}

export function hasSessions(repoRoot: string): boolean {
  return !!repoRoot && existsSync(sessionsDir(repoRoot))
}

export function listProjectSessions(repoRoot: string): ProjectSession[] {
  const dir = sessionsDir(repoRoot)
  if (!existsSync(dir)) return []
  const out: ProjectSession[] = []
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return []
  }
  for (const d of entries) {
    if (!/^\d+-/.test(d)) continue
    const sm = join(dir, d, 'session.md')
    if (!existsSync(sm)) continue
    try {
      out.push(toSession(d, readFileSync(sm, 'utf8')))
    } catch {
      /* skip */
    }
  }
  return out.sort((a, b) => b.id - a.id)
}

export function getProjectSession(repoRoot: string, slug: string): ProjectSession | null {
  const safe = slug.replace(/[^\w-]/g, '')
  const sm = join(sessionsDir(repoRoot), safe, 'session.md')
  if (!existsSync(sm)) return null
  try {
    return toSession(safe, readFileSync(sm, 'utf8'), true)
  } catch {
    return null
  }
}
