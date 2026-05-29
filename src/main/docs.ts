import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { join, relative, basename, sep } from 'node:path'

// GitBook-style docs surface for a repo. Lists every markdown file under
// docs/ + a root CHANGELOG.md, grouped by category for the renderer's sidebar.
//
// Categories (per project-template convention):
//   - changelog   — root CHANGELOG.md only (pinned)
//   - maintainer  — docs/maintainer/**.md
//   - developer   — docs/developer/**.md
//   - personal    — docs/personal/**.md
//   - other       — everything else under docs/**.md (human-authored runbooks,
//                   ADRs, architecture.md at root, etc.)

export type DocCategory = 'changelog' | 'maintainer' | 'developer' | 'personal' | 'other'

export type DocEntry = {
  path: string // relative to repoRoot, forward slashes
  title: string // first H1 or filename basename
  category: DocCategory
  managedBy?: string // agent name if a "managed by:" header is present
}

export type DocsTree = {
  categories: { id: DocCategory; label: string; items: DocEntry[] }[]
}

const CATEGORY_LABEL: Record<DocCategory, string> = {
  changelog: 'Changelog',
  maintainer: 'Maintainer',
  developer: 'Developer',
  personal: 'Personal',
  other: 'Other',
}

// Order in the sidebar.
const CATEGORY_ORDER: DocCategory[] = ['changelog', 'maintainer', 'developer', 'personal', 'other']

const MARKDOWN_RE = /\.(md|mdx|markdown)$/i
const MANAGED_BY_RE = /<!--\s*managed by:\s*([a-z0-9-]+)/i

function readTitle(content: string, fallback: string): string {
  const h1 = content.match(/^#\s+(.+?)\s*$/m)
  if (h1) return h1[1].trim()
  return fallback
}

function categorize(rel: string): DocCategory {
  const norm = rel.split(sep).join('/')
  if (norm === 'CHANGELOG.md') return 'changelog'
  if (norm.startsWith('docs/maintainer/')) return 'maintainer'
  if (norm.startsWith('docs/developer/')) return 'developer'
  if (norm.startsWith('docs/personal/')) return 'personal'
  return 'other'
}

function walk(root: string, dir: string, out: string[]): void {
  let names: string[]
  try {
    names = readdirSync(dir)
  } catch {
    return
  }
  for (const name of names) {
    if (name.startsWith('.')) continue
    const full = join(dir, name)
    let st
    try {
      st = statSync(full)
    } catch {
      continue
    }
    if (st.isDirectory()) walk(root, full, out)
    else if (st.isFile() && MARKDOWN_RE.test(name)) out.push(relative(root, full))
  }
}

export function listDocs(repoRoot: string): DocsTree {
  const empty: DocsTree = { categories: CATEGORY_ORDER.map((id) => ({ id, label: CATEGORY_LABEL[id], items: [] })) }
  if (!repoRoot || !existsSync(repoRoot)) return empty
  const paths: string[] = []
  const docsDir = join(repoRoot, 'docs')
  if (existsSync(docsDir) && statSync(docsDir).isDirectory()) walk(repoRoot, docsDir, paths)
  const changelog = join(repoRoot, 'CHANGELOG.md')
  if (existsSync(changelog)) paths.push('CHANGELOG.md')

  const entries: DocEntry[] = []
  for (const rel of paths) {
    const norm = rel.split(sep).join('/')
    let content = ''
    try {
      content = readFileSync(join(repoRoot, rel), 'utf8')
    } catch {
      /* skip */
    }
    const managed = content.match(MANAGED_BY_RE)
    entries.push({
      path: norm,
      title: readTitle(content, basename(norm, '.md')),
      category: categorize(norm),
      managedBy: managed ? managed[1] : undefined,
    })
  }

  const byCategory = new Map<DocCategory, DocEntry[]>()
  for (const e of entries) {
    const list = byCategory.get(e.category) ?? []
    list.push(e)
    byCategory.set(e.category, list)
  }
  for (const list of byCategory.values()) list.sort((a, b) => a.path.localeCompare(b.path))

  return {
    categories: CATEGORY_ORDER.map((id) => ({
      id,
      label: CATEGORY_LABEL[id],
      items: byCategory.get(id) ?? [],
    })),
  }
}

// Path-guarded read: only files inside repoRoot, only markdown.
export function readDoc(repoRoot: string, relPath: string): string {
  if (!repoRoot || !relPath) return ''
  if (!MARKDOWN_RE.test(relPath)) return ''
  const norm = relPath.split('/').join(sep)
  const full = join(repoRoot, norm)
  // prevent path traversal
  if (!full.startsWith(repoRoot + sep) && full !== join(repoRoot, basename(norm))) return ''
  try {
    return readFileSync(full, 'utf8')
  } catch {
    return ''
  }
}
