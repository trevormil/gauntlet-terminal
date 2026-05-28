import { useEffect, useState } from 'react'
import { GitPullRequest, TriangleAlert, GitBranch, ArrowUpRight } from 'lucide-react'
import { Badge } from '../../components/ui'
import { MrDetailView } from '../../components/MrDetail'
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

function MrsTab({ ctx }: { ctx: TabContext }) {
  const [mrs, setMrs] = useState<Mr[] | null>(null)
  const [selectedMrIid, setSelectedMrIid] = useState<number | null>(null)

  useEffect(() => {
    setMrs(null)
    setSelectedMrIid(null)
    window.gt.listMrs().then(setMrs)
  }, [ctx.sessionId])

  if (selectedMrIid !== null)
    return (
      <MrDetailView
        iid={selectedMrIid}
        repoLabel={ctx.repoPath || 'repo'}
        onBack={() => setSelectedMrIid(null)}
      />
    )

  return (
    <div className="flex h-full flex-col bg-[var(--gt-bg)]">
      <div className="flex shrink-0 items-center gap-2 border-b border-[var(--gt-border)] px-4 py-2">
        <GitPullRequest size={14} strokeWidth={2} className="text-zinc-400" />
        <span className="text-[12px] font-semibold text-zinc-200">
          Merge Requests{mrs ? ` (${mrs.filter((m) => m.state === 'opened').length})` : ''}
        </span>
        <span className="text-[11px] text-zinc-600">{ctx.repoPath || ctx.repoRoot.replace(/^.*\//, '')}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <MrList mrs={mrs} onOpen={setSelectedMrIid} />
      </div>
    </div>
  )
}

const tab: Tab = {
  id: 'mrs',
  title: 'MRs',
  icon: GitPullRequest,
  order: 1.2,
  // MRs come from the forge (glab) — needs an origin remote (repoPath).
  appliesTo: (ctx) => !!ctx.repoPath,
  Component: MrsTab,
}
export default tab
