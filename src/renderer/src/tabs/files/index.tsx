import { useEffect, useState } from 'react'
import { langs } from '@uiw/codemirror-extensions-langs'
import type { Extension } from '@codemirror/state'
import { CodeEditor } from '../../components/CodeEditor'
import type { Tab, TabContext, FileEntry, SearchHit } from '../../lib/types'

const EXT: Record<string, keyof typeof langs> = {
  ts: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  jsx: 'jsx',
  mjs: 'javascript',
  cjs: 'javascript',
  json: 'json',
  md: 'markdown',
  mdx: 'markdown',
  css: 'css',
  scss: 'sass',
  less: 'less',
  html: 'html',
  py: 'python',
  rs: 'rust',
  go: 'go',
  yaml: 'yaml',
  yml: 'yaml',
  sql: 'sql',
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  hpp: 'cpp',
  java: 'java',
  php: 'php',
  rb: 'ruby',
  toml: 'toml',
  xml: 'xml',
}
function langFor(path: string): Extension[] {
  const ext = path.split('.').pop()?.toLowerCase() || ''
  const key = EXT[ext]
  try {
    return key && langs[key] ? [langs[key]()] : []
  } catch {
    return []
  }
}

function TreeNode({
  entry,
  depth,
  onOpen,
  active,
}: {
  entry: FileEntry
  depth: number
  onOpen: (p: string) => void
  active: string | null
}) {
  const [open, setOpen] = useState(false)
  const [children, setChildren] = useState<FileEntry[] | null>(null)
  const click = async () => {
    if (!entry.dir) return onOpen(entry.path)
    if (!open && children === null) setChildren(await window.gt.files.list(entry.path))
    setOpen((o) => !o)
  }
  return (
    <>
      <div
        onClick={click}
        style={{ paddingLeft: depth * 12 + 8 }}
        className={`flex cursor-pointer items-center gap-1 py-[3px] pr-2 text-[12px] hover:bg-white/5 ${
          active === entry.path ? 'bg-[var(--gt-accent)]/12 text-zinc-100' : 'text-zinc-300'
        }`}
      >
        <span className="w-3 shrink-0 text-[9px] text-zinc-600">
          {entry.dir ? (open ? '▾' : '▸') : ''}
        </span>
        <span className={`truncate ${entry.dir ? 'text-zinc-300' : ''}`}>{entry.name}</span>
      </div>
      {entry.dir &&
        open &&
        children?.map((c) => (
          <TreeNode key={c.path} entry={c} depth={depth + 1} onOpen={onOpen} active={active} />
        ))}
    </>
  )
}

function FilesTab({ ctx }: { ctx: TabContext }) {
  const [roots, setRoots] = useState<FileEntry[] | null>(null)
  const [openPath, setOpenPath] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [readErr, setReadErr] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [scrollLine, setScrollLine] = useState<number | undefined>()
  const [sidebar, setSidebar] = useState<'files' | 'search'>('files')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchHit[] | null>(null)

  useEffect(() => {
    window.gt.files.list('').then(setRoots)
  }, [ctx.repoRoot])

  const open = async (path: string, line?: number) => {
    const r = await window.gt.files.read(path)
    setOpenPath(path)
    if (r.ok) {
      setContent(r.content)
      setReadErr(null)
      setDirty(false)
      setScrollLine(line)
    } else {
      setContent('')
      setReadErr(r.reason || 'cannot open')
    }
  }
  const save = async () => {
    if (openPath === null || readErr) return
    if (await window.gt.files.write(openPath, content)) setDirty(false)
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        save()
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        setSidebar('search')
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }) // re-bind each render so save() closes over latest content

  const runSearch = async () => {
    setResults(null)
    setResults(await window.gt.files.search(query))
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--gt-bg)]">
      {/* top bar */}
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-[var(--gt-border)] px-4 text-[12px]">
        {openPath ? (
          <>
            <span className="truncate font-mono text-zinc-300">{openPath}</span>
            {dirty && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" title="unsaved" />}
            <button
              onClick={save}
              disabled={!dirty || !!readErr}
              className="rounded-md border border-[var(--gt-border)] px-2 py-0.5 text-[11px] text-zinc-300 hover:border-[var(--gt-accent)]/60 disabled:opacity-30"
            >
              Save ⌘S
            </button>
          </>
        ) : (
          <span className="text-zinc-600">Open a file from the tree →</span>
        )}
        <div className="flex-1" />
        <span className="text-[10.5px] text-zinc-600">⌘F find · ⌘⇧F project search</span>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* editor (left) */}
        <div className="min-w-0 flex-1 overflow-hidden">
          {openPath === null ? (
            <div className="flex h-full items-center justify-center text-[12px] text-zinc-600">
              Select a file to edit.
            </div>
          ) : readErr ? (
            <div className="p-6 text-[12px] text-zinc-600">Can't open {openPath} — {readErr}</div>
          ) : (
            <CodeEditor
              value={content}
              onChange={(v) => {
                setContent(v)
                setDirty(true)
              }}
              extensions={langFor(openPath)}
              scrollToLine={scrollLine}
            />
          )}
        </div>

        {/* sidebar (right): files tree / search */}
        <aside className="flex w-72 shrink-0 flex-col border-l border-[var(--gt-border)]">
          <div className="flex shrink-0 border-b border-[var(--gt-border)] p-1.5">
            <button
              onClick={() => setSidebar('files')}
              className={`flex-1 rounded-md px-2 py-1 text-[11px] font-medium ${
                sidebar === 'files' ? 'bg-white/10 text-zinc-100' : 'text-zinc-500 hover:text-zinc-200'
              }`}
            >
              📁 Files
            </button>
            <button
              onClick={() => setSidebar('search')}
              className={`flex-1 rounded-md px-2 py-1 text-[11px] font-medium ${
                sidebar === 'search' ? 'bg-white/10 text-zinc-100' : 'text-zinc-500 hover:text-zinc-200'
              }`}
            >
              🔍 Search
            </button>
          </div>

          {sidebar === 'files' ? (
            <div className="min-h-0 flex-1 overflow-y-auto py-1">
              {roots === null ? (
                <div className="p-3 text-[12px] text-zinc-600">Loading…</div>
              ) : (
                roots.map((e) => (
                  <TreeNode key={e.path} entry={e} depth={0} onOpen={(p) => open(p)} active={openPath} />
                ))
              )}
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="shrink-0 p-2">
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && runSearch()}
                  placeholder="search repo (Enter)"
                  className="w-full rounded-md border border-[var(--gt-border)] bg-black/30 px-2 py-1 text-[12px] text-zinc-200 outline-none focus:border-[var(--gt-accent)]/60"
                />
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {results === null ? (
                  <div className="p-3 text-[12px] text-zinc-600">Searching…</div>
                ) : results.length === 0 ? (
                  <div className="p-3 text-[12px] text-zinc-600">
                    {query ? 'No matches.' : 'Type a query and press Enter.'}
                  </div>
                ) : (
                  results.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => open(r.file, r.line)}
                      className="block w-full border-b border-[var(--gt-border)]/50 px-3 py-1.5 text-left hover:bg-white/5"
                    >
                      <div className="truncate font-mono text-[11px] text-zinc-400">
                        {r.file}:{r.line}
                      </div>
                      <div className="truncate font-mono text-[11px] text-zinc-500">{r.text.trim()}</div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

const tab: Tab = {
  id: 'files',
  title: 'Files',
  icon: '📂',
  order: 3,
  appliesTo: (ctx) => !!(ctx.repoRoot || ctx.cwd),
  Component: FilesTab,
}
export default tab
