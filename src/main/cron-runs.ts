import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, basename } from 'node:path'
import { homedir } from 'node:os'
import { listRuns as listAgentRuns, type AgentRun } from './agents'

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

// ---- unified runs view -----------------------------------------------------

// A single shape for every run regardless of origin — cron-fired vs in-process
// agent vs ticket-spawn etc. Powers the Runs tab so the operator gets one
// global picture instead of jumping between Schedules and Agents.
export type UnifiedRun = {
  id: string
  source: 'cron' | 'agent'
  agentId: string
  agentTitle: string
  engine: string
  status: string
  startedAt: number
  endedAt?: number
  exitCode?: number
  repoRoot: string
  repoLabel: string
  branch: string
  worktree: string
  scheduleId?: string
  error?: string
}

function agentRunToUnified(r: AgentRun): UnifiedRun {
  return {
    id: r.id,
    source: 'agent',
    agentId: r.agentId,
    agentTitle: r.agentTitle,
    engine: r.engine,
    status: r.status,
    startedAt: r.startedAt,
    endedAt: r.endedAt,
    exitCode: r.exitCode,
    repoRoot: r.repoRoot,
    repoLabel: basename(r.repoRoot) || '',
    branch: r.branch,
    worktree: r.worktree,
  }
}

function cronRunToUnified(r: CronRun & { repoRoot?: string }): UnifiedRun {
  return {
    id: r.id,
    source: 'cron',
    agentId: r.agentId,
    agentTitle: r.agentTitle,
    engine: r.engine,
    status: r.status,
    startedAt: r.startedAt,
    endedAt: r.endedAt,
    exitCode: r.exitCode,
    repoRoot: r.repoRoot || '',
    repoLabel: r.repoLabel,
    branch: r.branch,
    worktree: r.worktree,
    scheduleId: r.scheduleId,
    error: r.error,
  }
}

export function listAllRuns(limit = 400): UnifiedRun[] {
  const cron = readCronRuns(undefined, limit).map(cronRunToUnified)
  const agent = listAgentRuns().map(agentRunToUnified)
  return [...cron, ...agent].sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0)).slice(0, limit)
}
