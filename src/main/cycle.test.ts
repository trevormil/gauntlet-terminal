import { test, expect } from 'bun:test'
import { cycleAndFunnel } from './cycle'
import type { ActivityKind } from './events'

const HOUR = 3_600_000
const DAY = 86_400_000
const now = 1_700_000_000_000 // fixed "now" so the 30d/7d windows are deterministic

type Ev = { kind: ActivityKind; ts: number; ref?: { ticket?: number; pr?: number } }
const ev = (kind: ActivityKind, ago: number, ref?: Ev['ref']): Ev => ({ kind, ts: now - ago, ref })

test('links a full ticket→PR→merge chain into cycle + per-stage splits', () => {
  // ticket 1 filed 5h ago, PR 10 opened 3h ago, merged 1h ago → cycle 4h, filed→open 2h, open→merge 2h
  const events: Ev[] = [
    ev('ticket-filed', 5 * HOUR, { ticket: 1 }),
    ev('pr-opened', 3 * HOUR, { ticket: 1, pr: 10 }),
    ev('pr-verdict', 2 * HOUR, { pr: 10 }),
    ev('pr-merged', 1 * HOUR, { pr: 10 }),
    ev('ticket-closed', 1 * HOUR, { ticket: 1 }),
  ]
  const { cycle, funnel } = cycleAndFunnel(events, now)
  expect(cycle.merged).toBe(1)
  expect(cycle.medianHours).toBe(4)
  expect(cycle.fileToOpenHours).toBe(2)
  expect(cycle.openToMergeHours).toBe(2)
  expect(funnel).toEqual({ filed: 1, opened: 1, merged: 1 })
})

test('funnel counts partial progress; cycle ignores un-merged tickets', () => {
  const events: Ev[] = [
    // ticket 1: full chain → merged
    ev('ticket-filed', 6 * HOUR, { ticket: 1 }),
    ev('pr-opened', 5 * HOUR, { ticket: 1, pr: 10 }),
    ev('pr-merged', 4 * HOUR, { pr: 10 }),
    // ticket 2: opened, never merged
    ev('ticket-filed', 6 * HOUR, { ticket: 2 }),
    ev('pr-opened', 5 * HOUR, { ticket: 2, pr: 20 }),
    // ticket 3: filed only
    ev('ticket-filed', 6 * HOUR, { ticket: 3 }),
  ]
  const { cycle, funnel } = cycleAndFunnel(events, now)
  expect(cycle.merged).toBe(1) // only ticket 1 completed
  expect(funnel).toEqual({ filed: 3, opened: 2, merged: 1 })
})

test('a pr-merged with no ticket bridge does not fabricate a cycle', () => {
  const events: Ev[] = [
    ev('ticket-filed', 4 * HOUR, { ticket: 1 }), // never opened a PR
    ev('pr-merged', 1 * HOUR, { pr: 99 }), // orphan merge, no pr-opened linking a ticket
  ]
  const { cycle, funnel } = cycleAndFunnel(events, now)
  expect(cycle.merged).toBe(0)
  expect(cycle.medianHours).toBeNull()
  expect(funnel).toEqual({ filed: 1, opened: 0, merged: 0 })
})

test('excludes merges older than 30d from cycle but keeps the 7d funnel cohort honest', () => {
  const events: Ev[] = [
    // merged 40d ago → outside the 30d cycle window
    ev('ticket-filed', 41 * DAY, { ticket: 1 }),
    ev('pr-opened', 40.5 * DAY, { ticket: 1, pr: 10 }),
    ev('pr-merged', 40 * DAY, { pr: 10 }),
    // filed 10d ago → outside the 7d funnel cohort
    ev('ticket-filed', 10 * DAY, { ticket: 2 }),
  ]
  const { cycle, funnel } = cycleAndFunnel(events, now)
  expect(cycle.merged).toBe(0)
  expect(funnel).toEqual({ filed: 0, opened: 0, merged: 0 })
})

test('uses the earliest timestamp when a stage is logged more than once', () => {
  const events: Ev[] = [
    ev('ticket-filed', 8 * HOUR, { ticket: 1 }),
    ev('ticket-filed', 5 * HOUR, { ticket: 1 }), // duplicate, later — must be ignored
    ev('pr-opened', 6 * HOUR, { ticket: 1, pr: 10 }),
    ev('pr-merged', 2 * HOUR, { pr: 10 }),
  ]
  const { cycle } = cycleAndFunnel(events, now)
  expect(cycle.medianHours).toBe(6) // earliest filed (8h) → merged (2h)
  expect(cycle.fileToOpenHours).toBe(2) // 8h → 6h
})
