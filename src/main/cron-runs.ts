import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

// Read the run records the headless runner (bin/terminal-cron) writes per run.
const RUNS_DIR = join(homedir(), '.config', 'TerMinal', 'cron-runs')

export type CronRun = {
  id: string
  scheduleId: string
  agentId: string
  agentTitle: string
  engine: string
  status: 'running' | 'done' | 'failed'
  startedAt: number
  endedAt?: number
  exitCode?: number
  branch: string
  repoLabel: string
  worktree: string
  error?: string
}

export function readCronRuns(scheduleId?: string, limit = 200): CronRun[] {
  if (!existsSync(RUNS_DIR)) return []
  const out: CronRun[] = []
  for (const f of readdirSync(RUNS_DIR)) {
    if (!f.endsWith('.json')) continue
    try {
      const r = JSON.parse(readFileSync(join(RUNS_DIR, f), 'utf8')) as CronRun
      if (!scheduleId || r.scheduleId === scheduleId) out.push(r)
    } catch {
      /* skip */
    }
  }
  return out.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0)).slice(0, limit)
}

export function readCronRunLog(runId: string): string {
  const safe = runId.replace(/[^\w-]/g, '')
  const f = join(RUNS_DIR, `${safe}.log`)
  try {
    return existsSync(f) ? readFileSync(f, 'utf8') : ''
  } catch {
    return ''
  }
}
