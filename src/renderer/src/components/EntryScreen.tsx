import { useEffect, useState } from 'react'
import type { SessionMeta } from '../lib/types'

export type Choice = { mode: 'new' | 'resume'; sessionId?: string; cwd?: string; name?: string }

function rel(ms: number): string {
  const s = (Date.now() - ms) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}
const tilde = (p: string) => p.replace(/^\/Users\/[^/]+/, '~')

export function EntryScreen({ onChoose }: { onChoose: (c: Choice) => void }) {
  const [sessions, setSessions] = useState<SessionMeta[] | null>(null)
  const [cwd, setCwd] = useState('')
  const [name, setName] = useState('')

  useEffect(() => {
    window.gt.listSessions().then((s) => {
      setSessions(s)
      if (s[0]?.cwd) setCwd(s[0].cwd)
    })
  }, [])

  const browse = async () => {
    const dir = await window.gt.pickDir()
    if (dir) setCwd(dir)
  }

  return (
    <div className="h-full w-full overflow-y-auto bg-[var(--gt-bg)]">
      <div className="mx-auto max-w-2xl px-8 py-10">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-2xl text-[var(--gt-accent)]">◆</span>
          <h1 className="text-2xl font-bold tracking-tight">Gauntlet Terminal</h1>
        </div>
        <p className="mb-8 text-sm text-zinc-500">
          Attach to a Claude session. This window pins to it — context, cost, and telemetry all
          track that one session.
        </p>

        {/* start new */}
        <div className="mb-6 rounded-2xl border border-[var(--gt-border)] bg-[var(--gt-panel)] p-4">
          <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-400">
            Start a new session
          </div>
          <div className="mb-2 flex items-center gap-2">
            <button
              onClick={browse}
              className="shrink-0 rounded-lg border border-[var(--gt-border)] bg-black/30 px-3 py-2 text-[12px] text-zinc-300 hover:border-[var(--gt-accent)]/60"
            >
              📁 Folder
            </button>
            <input
              value={cwd}
              onChange={(e) => setCwd(e.target.value)}
              placeholder="~ (home)"
              spellCheck={false}
              className="min-w-0 flex-1 rounded-lg border border-[var(--gt-border)] bg-black/30 px-3 py-2 font-mono text-[12px] text-zinc-200 outline-none focus:border-[var(--gt-accent)]/60"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="session name (optional)"
              className="min-w-0 flex-1 rounded-lg border border-[var(--gt-border)] bg-black/30 px-3 py-2 text-[12px] text-zinc-200 outline-none focus:border-[var(--gt-accent)]/60"
            />
            <button
              onClick={() =>
                onChoose({
                  mode: 'new',
                  cwd: cwd.trim() || undefined,
                  name: name.trim() || undefined,
                })
              }
              className="shrink-0 rounded-lg bg-[var(--gt-accent)] px-4 py-2 text-[12px] font-semibold text-white hover:opacity-90"
            >
              + New session
            </button>
          </div>
        </div>

        {/* resume */}
        <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-400">
          Resume {sessions ? `(${sessions.length})` : ''}
        </div>
        {sessions === null ? (
          <div className="py-6 text-center text-[12px] text-zinc-600">Scanning sessions…</div>
        ) : sessions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--gt-border)] p-6 text-center text-[12px] text-zinc-600">
            No prior Claude sessions found.
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.slice(0, 300).map((s) => (
              <button
                key={s.id}
                onClick={() => onChoose({ mode: 'resume', sessionId: s.id, cwd: s.cwd })}
                className="flex w-full items-center gap-3 rounded-xl border border-[var(--gt-border)] bg-[var(--gt-panel)] p-3 text-left hover:border-[var(--gt-accent)]/60 hover:bg-white/5"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] text-zinc-100">
                    {s.firstUserText || (
                      <span className="italic text-zinc-500">untitled session</span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 truncate text-[11px] text-zinc-500">
                    <span className="font-mono">{tilde(s.cwd) || '~'}</span>
                    {s.gitBranch && <span className="text-zinc-600">⎇ {s.gitBranch}</span>}
                    <span className="text-zinc-600">· {s.turns} turns</span>
                  </div>
                </div>
                <div className="shrink-0 text-right text-[10.5px] text-zinc-500">
                  <div>{rel(s.mtime)}</div>
                  <div className="font-mono text-zinc-600">{s.id.slice(0, 8)}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
