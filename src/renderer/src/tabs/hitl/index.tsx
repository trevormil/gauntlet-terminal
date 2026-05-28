import { Hand } from 'lucide-react'
import { TicketsBrowser } from '../../components/TicketsBrowser'
import type { Tab, TabContext } from '../../lib/types'

// Human-in-the-loop: tickets flagged `hitl: true` — the things waiting on you
// (approvals, creds, merges). Just the ticket browser, locked to that filter.
function HitlTab({ ctx }: { ctx: TabContext }) {
  return (
    <div className="flex h-full flex-col bg-[var(--gt-bg)]">
      <div className="flex shrink-0 items-center gap-2 border-b border-[var(--gt-border)] px-4 py-2">
        <Hand size={14} strokeWidth={2} className="text-[var(--gt-red)]" />
        <span className="text-[12px] font-semibold text-zinc-200">Human-in-the-loop</span>
        <span className="text-[11px] text-zinc-600">
          items waiting on you · {ctx.repoPath || ctx.repoRoot.replace(/^.*\//, '')}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <TicketsBrowser ctx={ctx} hitlOnly />
      </div>
    </div>
  )
}

const tab: Tab = {
  id: 'hitl',
  title: 'HITL',
  icon: Hand,
  order: 1.5,
  appliesTo: (ctx) => ctx.hasBacklog || !!ctx.repoPath,
  badge: async (gt) => (await gt.tickets.list()).filter((t) => t.hitl).length,
  Component: HitlTab,
}
export default tab
