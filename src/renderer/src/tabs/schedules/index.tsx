import { useEffect, useState } from 'react'
import {
  CalendarClock,
  Plus,
  Play,
  Power,
  Trash2,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  FileText,
} from 'lucide-react'
import { Badge } from '../../components/ui'
import type { BadgeTone } from '../../components/ui'
import type { Tab, TabContext, Agent, Schedule, ScheduleSpec, CronRun, Engine } from '../../lib/types'

const WD = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const FIELD =
  'rounded-lg border border-[var(--gt-border)] bg-black/30 px-2 py-1.5 text-[12px] text-zinc-200 outline-none focus:border-[var(--gt-accent)]/60'

function fmtWhen(ts?: number | null): string {
  if (!ts) return '—'
  const d = new Date(ts)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  const t = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  return sameDay ? t : `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${t}`
}
function reltime(ts?: number): string {
  if (!ts) return ''
  const s = (Date.now() - ts) / 1000
  if (s < 60) return `${Math.floor(s)}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}
const statusTone = (s?: string): BadgeTone =>
  s === 'done' ? 'green' : s === 'failed' ? 'red' : s === 'running' ? 'blue' : 'mute'

// The structured + advanced-cron builder. Produces a ScheduleSpec.
function ScheduleForm({
  agents,
  onCancel,
  onSave,
}: {
  agents: Agent[]
  onCancel: () => void
  onSave: (agentId: string, engine: Engine, spec: ScheduleSpec) => Promise<void>
}) {
  const [agentId, setAgentId] = useState(agents[0]?.id || '')
  const [engine, setEngine] = useState<Engine>('codex')
  const [kind, setKind] = useState<'interval' | 'calendar' | 'cron'>('calendar')
  const [everyN, setEveryN] = useState(1)
  const [unit, setUnit] = useState<'minutes' | 'hours'>('hours')
  const [time, setTime] = useState('09:00')
  const [weekdays, setWeekdays] = useState<number[]>([])
  const [cron, setCron] = useState('30 9 * * 1-5')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const toggleWd = (d: number) =>
    setWeekdays((w) => (w.includes(d) ? w.filter((x) => x !== d) : [...w, d].sort((a, b) => a - b)))

  const buildSpec = (): ScheduleSpec => {
    if (kind === 'interval') return { kind: 'interval', everyMinutes: Math.max(1, unit === 'hours' ? everyN * 60 : everyN) }
    if (kind === 'cron') return { kind: 'cron', expr: cron.trim() }
    const [h, m] = time.split(':').map(Number)
    return { kind: 'calendar', minute: m || 0, hour: h || 0, weekdays: weekdays.length ? weekdays : undefined }
  }

  const submit = async () => {
    if (!agentId) return
    setBusy(true)
    setErr('')
    try {
      await onSave(agentId, engine, buildSpec())
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-[var(--gt-border)] bg-[var(--gt-panel)] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-zinc-500">Run</span>
        <select value={agentId} onChange={(e) => setAgentId(e.target.value)} className={FIELD}>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.title}
            </option>
          ))}
        </select>
        <span className="text-[11px] text-zinc-500">via</span>
        <select value={engine} onChange={(e) => setEngine(e.target.value as Engine)} className={FIELD}>
          <option value="codex">codex</option>
          <option value="claude">claude</option>
        </select>
      </div>

      <div className="flex items-center gap-1">
        {(['calendar', 'interval', 'cron'] as const).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`rounded-full border px-2.5 py-0.5 text-[11px] capitalize ${
              kind === k
                ? 'border-[var(--gt-accent)] bg-[var(--gt-accent)]/15 text-zinc-100'
                : 'border-[var(--gt-border)] text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {k === 'calendar' ? 'at a time' : k === 'interval' ? 'every N' : 'cron'}
          </button>
        ))}
      </div>

      {kind === 'interval' && (
        <div className="flex items-center gap-2 text-[12px] text-zinc-400">
          every
          <input
            type="number"
            min={1}
            value={everyN}
            onChange={(e) => setEveryN(Math.max(1, Number(e.target.value)))}
            className={`${FIELD} w-16`}
          />
          <select value={unit} onChange={(e) => setUnit(e.target.value as 'minutes' | 'hours')} className={FIELD}>
            <option value="minutes">minutes</option>
            <option value="hours">hours</option>
          </select>
        </div>
      )}
      {kind === 'calendar' && (
        <div className="flex flex-wrap items-center gap-2 text-[12px] text-zinc-400">
          at
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={FIELD} />
          <span className="text-zinc-600">on</span>
          {WD.map((w, i) => (
            <button
              key={w}
              onClick={() => toggleWd(i)}
              className={`h-6 w-7 rounded text-[10px] ${
                weekdays.includes(i)
                  ? 'bg-[var(--gt-accent)]/25 text-zinc-100'
                  : 'border border-[var(--gt-border)] text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {w}
            </button>
          ))}
          <span className="text-[10px] text-zinc-600">{weekdays.length ? '' : '(every day)'}</span>
        </div>
      )}
      {kind === 'cron' && (
        <div className="space-y-1">
          <input
            value={cron}
            onChange={(e) => setCron(e.target.value)}
            placeholder="min hour dom month dow  (e.g. 30 9 * * 1-5)"
            className={`${FIELD} w-full font-mono`}
          />
          <div className="text-[10px] text-zinc-600">5-field cron — ranges/lists/steps ok (e.g. */15, 1-5, 9,17).</div>
        </div>
      )}

      {err && <div className="text-[11px] text-[var(--gt-red)]">{err}</div>}
      <div className="flex items-center gap-2">
        <button
          onClick={submit}
          disabled={busy || !agentId}
          className="rounded-lg bg-[var(--gt-accent)] px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-40"
        >
          {busy ? 'Saving…' : 'Schedule it'}
        </button>
        <button onClick={onCancel} className="rounded-md px-2 py-1 text-[11px] text-zinc-400 hover:bg-white/5">
          cancel
        </button>
      </div>
    </div>
  )
}

function SchedulesTab({ ctx }: { ctx: TabContext }) {
  const [schedules, setSchedules] = useState<Schedule[] | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [creating, setCreating] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [runs, setRuns] = useState<CronRun[]>([])
  const [log, setLog] = useState<{ runId: string; text: string } | null>(null)
  const [msg, setMsg] = useState('')

  const reload = () => window.gt.schedules.list().then(setSchedules)
  useEffect(() => {
    reload()
    window.gt.agents.list().then(setAgents)
  }, [ctx.sessionId])

  const openRuns = async (id: string) => {
    if (expanded === id) {
      setExpanded(null)
      return
    }
    setExpanded(id)
    setLog(null)
    setRuns(await window.gt.schedules.runs(id))
  }

  const save = async (agentId: string, engine: Engine, spec: ScheduleSpec) => {
    const r = await window.gt.schedules.save({ agentId, engine, spec })
    if (r && 'error' in r) throw new Error(r.error)
    setCreating(false)
    reload()
  }
  const flash = (m: string) => {
    setMsg(m)
    setTimeout(() => setMsg(''), 5000)
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--gt-bg)]">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--gt-border)] px-4 py-2">
        <CalendarClock size={14} strokeWidth={2} className="text-[var(--gt-accent-2)]" />
        <span className="text-[12px] font-semibold text-zinc-200">Schedules</span>
        <span className="text-[11px] text-zinc-600">real launchd cron · fires even when TerMinal is closed</span>
        <div className="flex-1" />
        <button
          onClick={async () => {
            const r = await window.gt.schedules.reconcile()
            flash(`reconciled · ${r.loaded} loaded, ${r.removed} orphans removed`)
            reload()
          }}
          title="Re-sync launchd with the schedule list (removes orphans)"
          className="inline-flex items-center gap-1 rounded-md border border-[var(--gt-border)] px-2 py-1 text-[11px] text-zinc-400 hover:border-[var(--gt-accent)]/60"
        >
          <RefreshCw size={11} strokeWidth={2} />
          Reconcile
        </button>
        <button
          onClick={() => {
            setCreating((v) => !v)
            setExpanded(null)
          }}
          className="inline-flex items-center gap-1 rounded-lg bg-[var(--gt-accent)] px-3 py-1 text-[12px] font-semibold text-white"
        >
          <Plus size={13} strokeWidth={2.5} />
          New schedule
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {msg && <div className="px-1 text-[11px] text-[var(--gt-green)]">{msg}</div>}
        {creating &&
          (agents.length ? (
            <ScheduleForm agents={agents} onCancel={() => setCreating(false)} onSave={save} />
          ) : (
            <div className="rounded-lg border border-[var(--gt-border)] p-3 text-[12px] text-zinc-600">
              No agents in this repo to schedule.
            </div>
          ))}

        {schedules === null ? (
          <div className="p-3 text-[12px] text-zinc-600">Loading…</div>
        ) : schedules.length === 0 ? (
          <div className="p-3 text-[12px] text-zinc-600">
            No schedules yet. “New schedule” registers a real macOS launchd job that runs an agent on your
            cadence — even when TerMinal is closed.
          </div>
        ) : (
          schedules.map((s) => (
            <div key={s.id} className="rounded-xl border border-[var(--gt-border)] bg-[var(--gt-panel)] p-3">
              <div className="flex items-start gap-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[13px] font-semibold text-zinc-100">{s.agentTitle}</span>
                    <Badge tone="blue">{s.describe || ''}</Badge>
                    <span className="text-[10px] uppercase text-zinc-600">{s.engine}</span>
                    {s.lastStatus && s.lastStatus !== 'never' && (
                      <Badge tone={statusTone(s.lastStatus)}>{s.lastStatus}</Badge>
                    )}
                  </div>
                  <div className="mt-0.5 text-[11px] text-zinc-500">
                    {s.repoLabel} · next {fmtWhen(s.nextRun)}
                    {s.lastRun ? ` · last ${reltime(s.lastRun)}` : ''}
                  </div>
                </div>
                <label className="flex shrink-0 items-center gap-1 text-[10px] text-zinc-500">
                  <input
                    type="checkbox"
                    checked={s.enabled}
                    onChange={async (e) => {
                      await window.gt.schedules.toggle(s.id, e.target.checked)
                      reload()
                    }}
                  />
                  <Power size={11} strokeWidth={2} />
                </label>
              </div>
              <div className="mt-2 flex items-center gap-3 text-[11px]">
                <button
                  onClick={() => openRuns(s.id)}
                  className="inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-300"
                >
                  {expanded === s.id ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  runs
                </button>
                <button
                  onClick={async () => {
                    await window.gt.schedules.runNow(s.id)
                    flash(`${s.agentTitle} started — see runs / Activity`)
                  }}
                  className="inline-flex items-center gap-1 text-zinc-500 hover:text-[var(--gt-accent-light)]"
                >
                  <Play size={11} strokeWidth={2.5} />
                  run now
                </button>
                <button
                  onClick={async () => {
                    await window.gt.schedules.remove(s.id)
                    reload()
                  }}
                  className="inline-flex items-center gap-1 text-zinc-500 hover:text-[var(--gt-red)]"
                >
                  <Trash2 size={11} strokeWidth={2} />
                  remove
                </button>
              </div>

              {expanded === s.id && (
                <div className="mt-2 space-y-1 border-t border-[var(--gt-border)]/50 pt-2">
                  {runs.length === 0 ? (
                    <div className="text-[11px] text-zinc-600">No runs yet.</div>
                  ) : (
                    runs.map((r) => (
                      <div key={r.id} className="flex items-center gap-2 text-[11px]">
                        <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                        <span className="text-zinc-500">{fmtWhen(r.startedAt)}</span>
                        <span className="font-mono text-[10px] text-zinc-600">{r.branch}</span>
                        <div className="flex-1" />
                        <button
                          onClick={async () => setLog({ runId: r.id, text: await window.gt.schedules.runLog(r.id) })}
                          className="inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-300"
                        >
                          <FileText size={11} strokeWidth={2} />
                          log
                        </button>
                      </div>
                    ))
                  )}
                  {log && (
                    <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-[#0c0c11] p-2 font-mono text-[10.5px] leading-relaxed text-zinc-300">
                      {log.text || '… (no output yet)'}
                    </pre>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

const tab: Tab = {
  id: 'schedules',
  title: 'Schedules',
  icon: CalendarClock,
  order: 3.5, // right after Agents — the software-factory backbone
  appliesTo: () => true,
  // badge = cron runs that failed in the last 24h
  badge: async (gt) => {
    const day = Date.now() - 86_400_000
    return (await gt.schedules.runs()).filter((r) => r.status === 'failed' && r.startedAt >= day).length
  },
  Component: SchedulesTab,
}
export default tab
