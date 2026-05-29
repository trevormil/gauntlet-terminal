import { useEffect, useRef, useState } from 'react'
import { Factory, Play, Square, TriangleAlert, Hand, GitMerge, ScanSearch, Bot } from 'lucide-react'
import { Badge } from '../../components/ui'
import type { Tab, TabContext, FactoryHealth, AgentRun, Engine, WindowStats } from '../../lib/types'

const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '')
function reltime(ts: number): string {
  const s = (Date.now() - ts) / 1000
  if (s < 60) return `${Math.floor(s)}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="rounded-xl border border-[var(--gt-border)] bg-[var(--gt-panel)] p-3">
      <div className={`text-2xl font-bold tabular-nums ${tone || 'text-zinc-100'}`}>{value}</div>
      <div className="mt-0.5 text-[10.5px] uppercase tracking-wide text-zinc-600">{label}</div>
    </div>
  )
}

const FUNNEL: { key: keyof WindowStats; label: string }[] = [
  { key: 'ticketsFiled', label: 'tickets filed' },
  { key: 'prsOpened', label: 'PRs opened' },
  { key: 'reviews', label: 'reviews' },
  { key: 'prsMerged', label: 'PRs merged' },
  { key: 'ticketsClosed', label: 'tickets closed' },
  { key: 'agentRuns', label: 'agent runs' },
  { key: 'testsFail', label: 'test fails' },
  { key: 'blocked', label: 'HITL raised' },
]

function FactoryTab({ ctx }: { ctx: TabContext }) {
  const [health, setHealth] = useState<FactoryHealth | null>(null)
  const [run, setRun] = useState<AgentRun | null>(null)
  const [log, setLog] = useState('')
  const [engine, setEngine] = useState<Engine>('codex')
  const [starting, setStarting] = useState(false)
  const runIdRef = useRef<string>('')
  const logRef = useRef<HTMLPreElement>(null)

  const loadHealth = () => window.gt.factory.health().then(setHealth)
  const setActive = (r: AgentRun | null) => {
    setRun(r)
    runIdRef.current = r?.id || ''
    if (r) setLog(r.output || '')
  }

  useEffect(() => {
    loadHealth()
    window.gt.agents.runs().then((runs) => {
      const f = runs.find((r) => r.agentId === 'factory' && r.status === 'running') || runs.find((r) => r.agentId === 'factory')
      if (f) setActive(f)
    })
    const t = setInterval(loadHealth, 15_000)
    const offS = window.gt.agents.onStatus((r) => {
      if (r.agentId === 'factory') {
        setActive(r)
        loadHealth()
      }
    })
    const offO = window.gt.agents.onOutput(({ runId, chunk }) => {
      if (runId === runIdRef.current) setLog((l) => l + chunk)
    })
    return () => {
      offS()
      offO()
      clearInterval(t)
    }
  }, [ctx.sessionId])

  useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [log])

  const running = run?.status === 'running'
  const start = async () => {
    setStarting(true)
    const r = await window.gt.factory.start(engine)
    setStarting(false)
    if (r && 'error' in r) {
      setLog(`couldn't start: ${r.error}`)
      return
    }
    setActive(r as AgentRun)
  }
  const stop = () => {
    if (run) window.gt.agents.cancel(run.id)
  }

  const maxDay = Math.max(1, ...(health?.daily.map((d) => d.count) || [1]))

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--gt-bg)]">
      {/* control bar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-[var(--gt-border)] px-4 py-2">
        <Factory size={15} strokeWidth={2} className="text-[var(--gt-accent)]" />
        <span className="text-[12px] font-semibold text-zinc-200">Factory</span>
        <span
          className={`inline-flex items-center gap-1 text-[10px] ${running ? 'text-[var(--gt-green)]' : 'text-zinc-600'}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${running ? 'bg-[var(--gt-green)] gt-pulse' : 'bg-zinc-600'}`} />
          {running ? 'running' : 'idle'}
        </span>
        <span className="text-[11px] text-zinc-600">{ctx.repoPath || ctx.repoRoot.replace(/^.*\//, '')}</span>
        <div className="flex-1" />
        {!running && (
          <select
            value={engine}
            onChange={(e) => setEngine(e.target.value as Engine)}
            className="cursor-pointer rounded-md border border-[var(--gt-border)] bg-black/30 px-1.5 py-1 text-[11px] text-zinc-300 outline-none"
          >
            <option value="codex">codex</option>
            <option value="claude">claude</option>
          </select>
        )}
        {running ? (
          <button
            onClick={stop}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--gt-border)] px-3 py-1.5 text-[12px] font-semibold text-zinc-200 hover:border-[var(--gt-red)]/60 hover:text-[var(--gt-red)]"
          >
            <Square size={12} strokeWidth={2.5} />
            Stop factory
          </button>
        ) : (
          <button
            onClick={start}
            disabled={starting || !ctx.repoRoot}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--gt-accent)] px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-40"
          >
            <Play size={13} strokeWidth={2.5} />
            {starting ? 'Starting…' : 'Start factory'}
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {/* current run log */}
        {run && (
          <div className="mb-5">
            <div className="mb-1.5 flex items-center gap-2 text-[11px] text-zinc-500">
              <span className="font-semibold uppercase tracking-wide">Current run</span>
              <Badge tone={running ? 'blue' : run.status === 'done' ? 'green' : 'red'}>{run.status}</Badge>
              <span className="font-mono text-[10px] text-zinc-600">{run.engine}</span>
              <span className="text-zinc-600">· {reltime(run.startedAt)} ago</span>
            </div>
            <pre
              ref={logRef}
              className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-[var(--gt-border)] bg-[#0c0c11] p-3 font-mono text-[11px] leading-relaxed text-zinc-300"
            >
              {stripAnsi(log) || '…'}
            </pre>
          </div>
        )}

        {!health ? (
          <div className="text-[12px] text-zinc-600">Loading health…</div>
        ) : (
          <>
            {/* headline stats */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <Stat label="PRs merged · 7d" value={health.window7d.prsMerged} tone="text-[var(--gt-green)]" />
              <Stat label="Reviews · 7d" value={health.window7d.reviews} />
              <Stat
                label="Agent success"
                value={`${health.agents.successRate}%`}
                tone={health.agents.successRate >= 80 ? 'text-[var(--gt-green)]' : 'text-[var(--gt-yellow)]'}
              />
              <Stat
                label="Open HITL"
                value={health.hitlOpen}
                tone={health.hitlOpen > 0 ? 'text-[var(--gt-red)]' : 'text-zinc-100'}
              />
            </div>

            {/* throughput 24h vs 7d */}
            <div className="mt-4 rounded-xl border border-[var(--gt-border)] bg-[var(--gt-panel)] p-3">
              <div className="mb-2 flex items-center justify-between text-[10.5px] uppercase tracking-wide text-zinc-600">
                <span>throughput</span>
                <span className="flex gap-4">
                  <span>24h</span>
                  <span>7d</span>
                </span>
              </div>
              <div className="space-y-1">
                {FUNNEL.map((f) => (
                  <div key={f.key} className="flex items-center text-[12px]">
                    <span className="flex-1 text-zinc-400">{f.label}</span>
                    <span className="w-10 text-right tabular-nums text-zinc-300">{health.window24h[f.key]}</span>
                    <span className="w-10 text-right tabular-nums text-zinc-500">{health.window7d[f.key]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* daily activity sparkline */}
            <div className="mt-4 rounded-xl border border-[var(--gt-border)] bg-[var(--gt-panel)] p-3">
              <div className="mb-2 text-[10.5px] uppercase tracking-wide text-zinc-600">activity · 14 days</div>
              <div className="flex h-16 items-end gap-1">
                {health.daily.map((d) => (
                  <div key={d.day} className="flex flex-1 flex-col items-center gap-1" title={`${d.day}: ${d.count}`}>
                    <div
                      className="w-full rounded-sm bg-[var(--gt-accent)]/50"
                      style={{ height: `${Math.max(2, (d.count / maxDay) * 56)}px` }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-1 flex justify-between text-[9px] text-zinc-700">
                <span>{health.daily[0]?.day}</span>
                <span>{health.daily[health.daily.length - 1]?.day}</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* recent failures */}
              <div className="rounded-xl border border-[var(--gt-border)] bg-[var(--gt-panel)] p-3">
                <div className="mb-2 flex items-center gap-1.5 text-[10.5px] uppercase tracking-wide text-zinc-600">
                  <TriangleAlert size={11} strokeWidth={2} className="text-[var(--gt-red)]" />
                  recent failures · 24h
                </div>
                {health.recentFailures.length === 0 ? (
                  <div className="text-[11px] text-zinc-600">None — clean.</div>
                ) : (
                  <div className="space-y-1">
                    {health.recentFailures.slice(0, 8).map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px]">
                        <Badge tone="red">{f.kind}</Badge>
                        <span className="min-w-0 flex-1 truncate text-zinc-300">{f.title}</span>
                        <span className="shrink-0 text-zinc-600">{reltime(f.ts)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* top repos */}
              <div className="rounded-xl border border-[var(--gt-border)] bg-[var(--gt-panel)] p-3">
                <div className="mb-2 text-[10.5px] uppercase tracking-wide text-zinc-600">most active · 7d</div>
                {health.byRepo.length === 0 ? (
                  <div className="text-[11px] text-zinc-600">No activity yet.</div>
                ) : (
                  <div className="space-y-1">
                    {health.byRepo.map((r) => (
                      <div key={r.repo} className="flex items-center gap-2 text-[11px]">
                        <span className="min-w-0 flex-1 truncate font-mono text-zinc-400">{r.repo}</span>
                        <span className="tabular-nums text-zinc-500">{r.events}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* secondary rollups */}
            <div className="mt-4 flex flex-wrap gap-4 text-[11px] text-zinc-500">
              <span className="inline-flex items-center gap-1">
                <Bot size={12} strokeWidth={2} /> agents {health.agents.done}✓ / {health.agents.failed}✗ ({health.agents.running} running)
              </span>
              <span className="inline-flex items-center gap-1">
                <ScanSearch size={12} strokeWidth={2} /> cron {health.cron.done}✓ / {health.cron.failed}✗ ({health.cron.recentFailures} failed 24h)
              </span>
              <span className="inline-flex items-center gap-1">
                <GitMerge size={12} strokeWidth={2} /> {health.window7d.prsMerged} merged · 7d
              </span>
              <span className="inline-flex items-center gap-1">
                <Hand size={12} strokeWidth={2} className={health.hitlOpen ? 'text-[var(--gt-red)]' : ''} /> {health.hitlOpen} HITL open
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const tab: Tab = {
  id: 'factory',
  title: 'Factory',
  icon: Factory,
  order: 3.4, // right after Agents — the headline surface
  appliesTo: () => true,
  Component: FactoryTab,
}
export default tab
