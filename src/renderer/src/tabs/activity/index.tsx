import { useEffect, useRef, useState } from 'react'
import {
  Activity,
  CircleCheck,
  Ticket,
  GitPullRequest,
  Cpu,
  Bot,
  TriangleAlert,
  Info,
  type LucideIcon,
} from 'lucide-react'
import { activityTone } from '../../lib/badges'
import { badgeClasses } from '../../components/ui'
import type { Tab, TabContext, ActivityEvent, ActivityKind } from '../../lib/types'

const ICON: Record<ActivityKind, LucideIcon> = {
  'task-complete': CircleCheck,
  'ticket-filed': Ticket,
  'pr-verdict': GitPullRequest,
  'session-start': Cpu,
  'agent-run': Bot,
  error: TriangleAlert,
  info: Info,
}

const KIND_LABEL: Record<ActivityKind, string> = {
  'task-complete': 'task',
  'ticket-filed': 'ticket',
  'pr-verdict': 'review',
  'session-start': 'session',
  'agent-run': 'agent',
  error: 'error',
  info: 'info',
}

function reltime(ts: number): string {
  const s = (Date.now() - ts) / 1000
  if (s < 10) return 'just now'
  if (s < 60) return `${Math.floor(s)}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

// Day bucket label for the timeline dividers (Today / Yesterday / weekday / date).
function dayLabel(ts: number): string {
  const d = new Date(ts)
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((startOf(new Date()) - startOf(d)) / 86_400_000)
  if (diff <= 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return d.toLocaleDateString(undefined, { weekday: 'long' })
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// Group the (already newest-first) events into consecutive day buckets.
function groupByDay(events: ActivityEvent[]): { label: string; items: ActivityEvent[] }[] {
  const groups: { label: string; items: ActivityEvent[] }[] = []
  for (const e of events) {
    const label = dayLabel(e.ts)
    const last = groups[groups.length - 1]
    if (last && last.label === label) last.items.push(e)
    else groups.push({ label, items: [e] })
  }
  return groups
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-2.5 py-0.5 text-[11px] transition-colors ${
        active
          ? 'border-[var(--gt-accent)] bg-[var(--gt-accent)]/15 text-zinc-100'
          : 'border-[var(--gt-border)] text-zinc-400 hover:text-zinc-200'
      }`}
    >
      {children}
    </button>
  )
}

type Scope = 'all' | 'repo' | 'session'

function ActivityTab({ ctx }: { ctx: TabContext }) {
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [scope, setScope] = useState<Scope>('all')
  const [, force] = useState(0) // re-tick relative times
  const newest = useRef<string>('') // id of the most recent event, for the live flash

  useEffect(() => {
    window.gt.activity.list().then((e) => {
      setEvents(e)
      newest.current = e[0]?.id || ''
    })
    const off = window.gt.activity.onEvent((ev) => {
      newest.current = ev.id
      setEvents((prev) => [ev, ...prev].slice(0, 1000))
    })
    const t = setInterval(() => force((n) => n + 1), 30_000) // refresh "Nm ago"
    return () => {
      off()
      clearInterval(t)
    }
  }, [])

  const shown = events.filter((e) =>
    scope === 'all'
      ? true
      : scope === 'repo'
        ? e.repoRoot === ctx.repoRoot
        : e.sessionId === ctx.sessionId,
  )

  const clear = async () => {
    await window.gt.activity.clear()
    setEvents([])
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--gt-bg)]">
      <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-[var(--gt-border)] px-4 py-2">
        <Activity size={14} strokeWidth={2} className="text-[var(--gt-accent-2)]" />
        <span className="mr-1 text-[12px] font-semibold text-zinc-200">Activity</span>
        <span className="inline-flex items-center gap-1 text-[10px] text-zinc-600">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--gt-green)] gt-pulse" />
          live
        </span>
        <span className="mx-1 text-zinc-700">·</span>
        <Chip active={scope === 'all'} onClick={() => setScope('all')}>
          all repos
        </Chip>
        <Chip active={scope === 'repo'} onClick={() => setScope('repo')}>
          this repo
        </Chip>
        <Chip active={scope === 'session'} onClick={() => setScope('session')}>
          this session
        </Chip>
        <div className="flex-1" />
        <span className="text-[11px] tabular-nums text-zinc-600">{shown.length}</span>
        <button
          onClick={clear}
          className="rounded-md px-2 py-0.5 text-[11px] text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
        >
          clear
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {shown.length === 0 ? (
          <div className="p-6 text-[12px] text-zinc-600">
            No activity yet. Finished turns, filed tickets, and session starts show up here (and as
            macOS notifications).
          </div>
        ) : (
          groupByDay(shown).map((g) => (
            <div key={g.label}>
              <div className="sticky top-0 z-10 flex items-center gap-2 bg-[var(--gt-bg)]/90 px-4 py-1.5 backdrop-blur">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                  {g.label}
                </span>
                <span className="text-[10px] tabular-nums text-zinc-700">{g.items.length}</span>
                <div className="h-px flex-1 bg-[var(--gt-border)]/50" />
              </div>
              {g.items.map((e) => {
                const Icon = ICON[e.kind] || Info
                const tone = activityTone(e.kind)
                const isNew = e.id === newest.current
                return (
                  <div
                    key={e.id}
                    className={`group relative flex gap-3 px-4 py-2.5 transition-colors hover:bg-white/[0.03] ${
                      isNew ? 'gt-pop-in' : ''
                    }`}
                  >
                    {/* timeline rail: a continuous line with the kind node sitting on it */}
                    <div className="relative flex w-5 shrink-0 justify-center">
                      <span className="absolute top-0 bottom-0 left-1/2 w-px -translate-x-1/2 bg-[var(--gt-border)]/70" />
                      <span
                        className={`relative z-10 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border bg-[var(--gt-bg)] ${badgeClasses(
                          tone,
                        )} ${isNew ? 'gt-pulse' : ''}`}
                      >
                        <Icon size={11} strokeWidth={2.25} />
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="min-w-0 flex-1 truncate text-[13px] text-zinc-100">{e.title}</span>
                        <span className="shrink-0 text-[10.5px] tabular-nums text-zinc-600">
                          {reltime(e.ts)}
                        </span>
                      </div>
                      {e.detail && (
                        <div className="truncate text-[11.5px] text-zinc-500" title={e.detail}>
                          {e.detail}
                        </div>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span
                          className={`rounded-full border px-1.5 py-px text-[9.5px] font-medium uppercase tracking-wide ${badgeClasses(
                            tone,
                          )}`}
                        >
                          {KIND_LABEL[e.kind] || e.kind}
                        </span>
                        {e.repo && scope === 'all' && (
                          <span className="truncate font-mono text-[10px] text-zinc-600">{e.repo}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

const tab: Tab = {
  id: 'activity',
  title: 'Activity',
  icon: Activity,
  order: 4,
  appliesTo: () => true, // global feed, always available
  Component: ActivityTab,
}
export default tab
