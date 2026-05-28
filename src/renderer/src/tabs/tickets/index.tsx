import { Ticket as TicketIcon } from 'lucide-react'
import { TicketsBrowser } from '../../components/TicketsBrowser'
import type { Tab, TabContext } from '../../lib/types'

function TicketsTab({ ctx }: { ctx: TabContext }) {
  return (
    <div className="flex h-full flex-col bg-[var(--gt-bg)]">
      <TicketsBrowser ctx={ctx} />
    </div>
  )
}

const tab: Tab = {
  id: 'tickets',
  title: 'Tickets',
  icon: TicketIcon,
  order: 1,
  appliesTo: (ctx) => ctx.hasBacklog || !!ctx.repoPath,
  Component: TicketsTab,
}
export default tab
