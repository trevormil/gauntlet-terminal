import { useEffect, useState, type ReactNode } from 'react'
import { Ticket as TicketIcon, GitPullRequest, TriangleAlert, GitBranch, ArrowUpRight } from 'lucide-react'
import { Badge } from '../../components/ui'
import { MrDetailView } from '../../components/MrDetail'
import { TicketsBrowser } from '../../components/TicketsBrowser'
import { verdictTone, testTone, stateTone } from '../../lib/badges'
import type { Tab, Mr, TabContext } from '../../lib/types'

function MrList({ mrs, onOpen }: { mrs: Mr[] | null; onOpen: (iid: number) => void }) {
  if (mrs === null) return <div className="p-6 text-[12px] text-zinc-600">Loading MRs from glab…</div>
  if (mrs.length === 0)
    return <div className="p-6 text-[12px] text-zinc-600">No open MRs (or glab not authenticated for this repo).</div>
  return (
    <div className="space-y-2 p-4">
      {mrs.map((m) => (
        <div
          key={m.iid}
          onClick={() => onOpen(m.iid)}
          className="cursor-pointer rounded-xl border border-[var(--gt-border)] bg-[var(--gt-panel)] p-3 transition-colors hover:border-[var(--gt-accent)]/50 hover:bg-white/5"
        >
          <div className="flex items-start gap-2">
            <span className="font-mono text-[12px] text-zinc-500">!{m.iid}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] text-zinc-100">
                {m.draft && <span className="mr-1 text-amber-400">[draft]</span>}
                {m.title}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-500">
                <Badge tone={stateTone(m.state)}>{m.state}</Badge>
                {m.review && <Badge tone={verdictTone(m.review.verdict)}>{m.review.verdict}</Badge>}
                {m.review && <Badge tone={testTone(m.review.testStatus)}>tests {m.review.testStatus}</Badge>}
                {m.review?.overall != null && <span className="text-zinc-400">score {m.review.overall}</span>}
                {m.review?.stale && (
                  <Badge tone="warn">
                    <TriangleAlert size={9} strokeWidth={2.5} />
                    stale
                  </Badge>
                )}
                <span className="inline-flex items-center gap-0.5 text-zinc-600">
                  <GitBranch size={11} strokeWidth={2} />
                  {m.sourceBranch}
                </span>
                {m.author && <span className="text-zinc-600">· @{m.author}</span>}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                window.gt.openExternal(m.webUrl)
              }}
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-[var(--gt-border)] px-2 py-1 text-[11px] text-zinc-300 hover:border-[var(--gt-accent)]/60"
            >
              open
              <ArrowUpRight size={12} strokeWidth={2} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function TicketsTab({ ctx }: { ctx: TabContext }) {
  const [mode, setMode] = useState<'tickets' | 'mrs'>('tickets')
  const [mrs, setMrs] = useState<Mr[] | null>(null)
  const [ticketCount, setTicketCount] = useState<number | null>(null)
  const [selectedMrIid, setSelectedMrIid] = useState<number | null>(null)

  useEffect(() => {
    window.gt.tickets.list().then((t) => setTicketCount(t.length))
  }, [ctx.sessionId])
  useEffect(() => {
    if (mode === 'mrs' && mrs === null) window.gt.listMrs().then(setMrs)
    if (mode !== 'mrs' && selectedMrIid !== null) setSelectedMrIid(null)
  }, [mode]) // eslint-disable-line react-hooks/exhaustive-deps

  const seg = (m: 'tickets' | 'mrs', label: ReactNode) => (
    <button
      onClick={() => setMode(m)}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-[12px] font-medium ${
        mode === m ? 'bg-[var(--gt-accent)]/20 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="flex h-full flex-col bg-[var(--gt-bg)]">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--gt-border)] px-4 py-2">
        <div className="flex rounded-lg border border-[var(--gt-border)] p-0.5">
          {seg(
            'tickets',
            <>
              <TicketIcon size={13} strokeWidth={2} />
              Tickets{ticketCount != null ? ` ${ticketCount}` : ''}
            </>,
          )}
          {seg(
            'mrs',
            <>
              <GitPullRequest size={13} strokeWidth={2} />
              MRs
            </>,
          )}
        </div>
        <span className="text-[11px] text-zinc-600">{ctx.repoPath || ctx.repoRoot.replace(/^.*\//, '')}</span>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {mode === 'mrs' ? (
          selectedMrIid !== null ? (
            <MrDetailView
              iid={selectedMrIid}
              repoLabel={ctx.repoPath || 'repo'}
              onBack={() => setSelectedMrIid(null)}
            />
          ) : (
            <div className="h-full overflow-y-auto">
              <MrList mrs={mrs} onOpen={setSelectedMrIid} />
            </div>
          )
        ) : (
          <TicketsBrowser ctx={ctx} />
        )}
      </div>
    </div>
  )
}

const tab: Tab = {
  id: 'tickets',
  title: 'Tickets & MRs',
  icon: TicketIcon,
  order: 1,
  appliesTo: (ctx) => ctx.hasBacklog || !!ctx.repoPath,
  Component: TicketsTab,
}
export default tab
