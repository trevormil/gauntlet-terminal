import { Card, Empty } from '../../components/ui'
import type { Plugin, TaskItem } from '../../lib/types'

function Dot({ status }: { status: string }) {
  if (status === 'completed') return <span className="text-[var(--gt-green)]">✓</span>
  if (status === 'in_progress') return <span className="text-[var(--gt-yellow)]">◐</span>
  return <span className="text-zinc-600">○</span>
}

// The agent's live todo list (~/.claude/tasks/<session>/). Active tasks shown;
// completed collapsed to a count.
const plugin: Plugin<TaskItem[]> = {
  id: 'todos',
  title: 'Todos',
  icon: '☑',
  order: 3,
  intervalMs: 2500,
  realtime: true,
  defaultEnabled: true,
  poll: (gt) => gt.sessionTasks(),
  render: (d) => {
    const tasks = d || []
    if (!tasks.length)
      return (
        <Card icon="☑" title="Todos">
          <Empty>no tasks</Empty>
        </Card>
      )
    const done = tasks.filter((t) => t.status === 'completed').length
    const active = tasks.filter((t) => t.status !== 'completed')
    return (
      <Card icon="☑" title="Todos" right={<span className="text-[9px] tabular-nums text-zinc-600">{done}/{tasks.length}</span>}>
        {active.length === 0 ? (
          <div className="text-[11px] italic text-zinc-500">all {done} done ✓</div>
        ) : (
          <div className="space-y-0.5">
            {active.slice(0, 8).map((t) => (
              <div key={t.id} className="flex items-start gap-1.5 text-[11.5px]">
                <span className="mt-px shrink-0 text-[10px]">
                  <Dot status={t.status} />
                </span>
                <span
                  className={`min-w-0 flex-1 truncate ${t.status === 'in_progress' ? 'text-zinc-100' : 'text-zinc-400'}`}
                  title={t.subject}
                >
                  {t.subject}
                </span>
              </div>
            ))}
            {active.length > 8 && (
              <div className="text-[10px] text-zinc-600">+{active.length - 8} more</div>
            )}
          </div>
        )}
      </Card>
    )
  },
}
export default plugin
