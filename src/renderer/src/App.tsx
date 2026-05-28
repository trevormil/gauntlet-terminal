import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { TerminalPane } from './components/Terminal'
import { PluginWidget } from './components/PluginWidget'
import { PluginDrawer } from './components/PluginDrawer'
import { EntryScreen, type Choice } from './components/EntryScreen'
import { ALL_PLUGINS } from './plugins/registry'
import { commandWidgetToPlugin } from './lib/commandWidget'
import type { Plugin } from './lib/types'

const drag = { WebkitAppRegion: 'drag' } as CSSProperties
const noDrag = { WebkitAppRegion: 'no-drag' } as CSSProperties
const tilde = (p: string) => p.replace(/^\/Users\/[^/]+/, '~')

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw) as T
  } catch {
    /* fall through */
  }
  return fallback
}

export default function App() {
  const [choice, setChoice] = useState<Choice | null>(null)
  const [info, setInfo] = useState<{ sessionId: string; cwd: string }>({ sessionId: '', cwd: '' })
  const [branch, setBranch] = useState('')
  const [cmdPlugins, setCmdPlugins] = useState<Plugin[]>([])
  const [enabled, setEnabled] = useState<string[]>(() => load('gt.enabled', []))
  const [known, setKnown] = useState<string[]>(() => load('gt.known', []))
  const [drawer, setDrawer] = useState(false)
  const [collapsed, setCollapsed] = useState<boolean>(() => load('gt.collapsed', false))

  const allPlugins = useMemo(
    () => [...ALL_PLUGINS, ...cmdPlugins].sort((a, b) => (a.order ?? 99) - (b.order ?? 99)),
    [cmdPlugins],
  )

  useEffect(() => localStorage.setItem('gt.enabled', JSON.stringify(enabled)), [enabled])
  useEffect(() => localStorage.setItem('gt.known', JSON.stringify(known)), [known])
  useEffect(() => localStorage.setItem('gt.collapsed', JSON.stringify(collapsed)), [collapsed])

  // First time we see any plugin (code folder or command widget), record it and
  // enable it if it asks to be on by default. User toggles win thereafter.
  useEffect(() => {
    const fresh = allPlugins.filter((p) => !known.includes(p.id))
    if (fresh.length === 0) return
    setKnown((k) => [...k, ...fresh.map((p) => p.id)])
    setEnabled((e) => [...e, ...fresh.filter((p) => p.defaultEnabled).map((p) => p.id)])
  }, [allPlugins, known])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawer(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // once attached: pull git branch for the header + load per-repo command widgets
  useEffect(() => {
    if (!info.sessionId) return
    window.gt.transcript().then((t) => t.gitBranch && setBranch(t.gitBranch))
    window.gt
      .listCommandWidgets()
      .then((ws) => setCmdPlugins(ws.map(commandWidgetToPlugin)))
      .catch(() => {})
  }, [info.sessionId])

  if (!choice) return <EntryScreen onChoose={setChoice} />

  const toggle = (id: string) =>
    setEnabled((e) => (e.includes(id) ? e.filter((x) => x !== id) : [...e, id]))
  const active = allPlugins.filter((p) => enabled.includes(p.id))

  return (
    <div className="flex h-full flex-col">
      <header
        style={drag}
        className="flex h-9 shrink-0 items-center gap-2 border-b border-[var(--gt-border)] bg-[var(--gt-bg)] pl-[78px] pr-2 text-zinc-300"
      >
        <span className="text-[13px] font-bold tracking-tight text-[var(--gt-accent)]">◆</span>
        <span className="text-[12px] font-semibold">Gauntlet Terminal</span>
        <span
          className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
            choice.mode === 'new'
              ? 'bg-[var(--gt-accent)]/20 text-[var(--gt-accent)]'
              : 'bg-[var(--gt-accent-2)]/15 text-[var(--gt-accent-2)]'
          }`}
        >
          {choice.mode}
        </span>
        <span className="truncate text-[11px] text-zinc-500">
          {tilde(info.cwd || choice.cwd || '~')}
          {branch && <span className="text-zinc-600"> · ⎇ {branch}</span>}
          {info.sessionId && (
            <span className="ml-1 font-mono text-zinc-700">{info.sessionId.slice(0, 8)}</span>
          )}
        </span>
        <div className="flex-1" />
        <button
          style={noDrag}
          onClick={() => {
            setInfo({ sessionId: '', cwd: '' })
            setBranch('')
            setCmdPlugins([])
            setChoice(null)
          }}
          className="rounded-md px-2 py-1 text-[11px] text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
        >
          ↩ sessions
        </button>
        <button
          style={noDrag}
          onClick={() => setDrawer(true)}
          className="rounded-md border border-[var(--gt-border)] bg-[var(--gt-panel)] px-2.5 py-1 text-[11px] font-medium text-zinc-300 hover:border-[var(--gt-accent)]/60 hover:text-white"
        >
          ⧉ Plugins · {enabled.length}
        </button>
        <button
          style={noDrag}
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? 'Expand cockpit' : 'Collapse cockpit'}
          className="rounded-md px-2 py-1 text-[13px] text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
        >
          {collapsed ? '⟨' : '⟩'}
        </button>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <main className="min-w-0 flex-1 bg-[var(--gt-bg)]">
          <TerminalPane choice={choice} onStarted={setInfo} />
        </main>

        {collapsed ? (
          <button
            onClick={() => setCollapsed(false)}
            title="Expand cockpit"
            className="flex w-8 shrink-0 cursor-pointer flex-col items-center gap-3 border-l border-[var(--gt-border)] bg-[var(--gt-bg)] pt-3 text-zinc-500 hover:text-zinc-300"
          >
            <span className="text-[13px]">⟨</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] [writing-mode:vertical-rl]">
              Cockpit · {active.length}
            </span>
          </button>
        ) : (
          <aside className="w-[320px] shrink-0 overflow-y-auto border-l border-[var(--gt-border)] bg-[var(--gt-bg)] p-3">
            <div className="mb-2 flex items-center justify-between px-0.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-600">
                Cockpit
              </span>
              <span className="text-[10px] text-zinc-600">{active.length} live</span>
            </div>
            {active.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--gt-border)] p-4 text-center text-[12px] text-zinc-600">
                No plugins enabled.
                <br />
                Open <span className="text-zinc-400">⧉ Plugins</span> to add some.
              </div>
            ) : (
              active.map((p) => (
                <PluginWidget
                  key={p.id}
                  plugin={p}
                  onHide={(id) => setEnabled((e) => e.filter((x) => x !== id))}
                />
              ))
            )}
          </aside>
        )}

        {drawer && (
          <PluginDrawer
            plugins={allPlugins}
            enabled={enabled}
            onToggle={toggle}
            onClose={() => setDrawer(false)}
          />
        )}
      </div>
    </div>
  )
}
