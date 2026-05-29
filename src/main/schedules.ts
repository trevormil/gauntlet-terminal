import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { homedir } from 'node:os'
import { randomUUID } from 'node:crypto'
import type { Engine } from './agents'

// Scheduled (cron-ish) agent runs. Interval-based cadence from the last run —
// simple + good enough; a 60s ticker in main fires the due ones. Stored globally
// (each schedule carries its repoRoot).
const FILE = join(homedir(), '.config', 'TerMinal', 'schedules.json')

export type Cadence = 'hourly' | 'daily' | 'weekly'
export type Schedule = {
  id: string
  repoRoot: string
  repoLabel: string
  agentId: string
  agentTitle: string
  engine: Engine
  cadence: Cadence
  enabled: boolean
  lastRun?: number
}

const MS: Record<Cadence, number> = {
  hourly: 3_600_000,
  daily: 86_400_000,
  weekly: 604_800_000,
}

export function readSchedules(): Schedule[] {
  if (!existsSync(FILE)) return []
  try {
    const a = JSON.parse(readFileSync(FILE, 'utf8'))
    return Array.isArray(a) ? a : []
  } catch {
    return []
  }
}

function write(list: Schedule[]): boolean {
  try {
    mkdirSync(dirname(FILE), { recursive: true })
    writeFileSync(FILE, JSON.stringify(list, null, 2))
    return true
  } catch {
    return false
  }
}

export function addSchedule(s: Omit<Schedule, 'id' | 'enabled'>): Schedule {
  const sched: Schedule = { ...s, id: randomUUID(), enabled: true }
  write([...readSchedules(), sched])
  return sched
}

export function removeSchedule(id: string): boolean {
  return write(readSchedules().filter((s) => s.id !== id))
}

export function toggleSchedule(id: string, enabled: boolean): boolean {
  return write(readSchedules().map((s) => (s.id === id ? { ...s, enabled } : s)))
}

export function markRun(id: string, ts = Date.now()): void {
  write(readSchedules().map((s) => (s.id === id ? { ...s, lastRun: ts } : s)))
}

export function nextRunAt(s: Schedule): number {
  return (s.lastRun ?? 0) + MS[s.cadence]
}

/** Enabled schedules whose interval has elapsed. */
export function dueSchedules(now = Date.now()): Schedule[] {
  return readSchedules().filter((s) => s.enabled && now >= nextRunAt(s))
}
