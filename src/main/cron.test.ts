import { test, expect, describe } from 'bun:test'
import { cronToTrigger, specToTrigger, describeSpec } from './cron'

describe('cronToTrigger', () => {
  test('*/N * * * * → interval', () => {
    expect(cronToTrigger('*/15 * * * *')).toEqual({ kind: 'interval', seconds: 900 })
  })
  test('* * * * * → every minute (interval 60)', () => {
    expect(cronToTrigger('* * * * *')).toEqual({ kind: 'interval', seconds: 60 })
  })
  test('weekday range expands to one entry per day', () => {
    const t = cronToTrigger('30 9 * * 1-5')
    expect(t.kind).toBe('calendar')
    if (t.kind !== 'calendar') return
    expect(t.entries).toHaveLength(5)
    expect(t.entries).toEqual([
      { Minute: 30, Hour: 9, Weekday: 1 },
      { Minute: 30, Hour: 9, Weekday: 2 },
      { Minute: 30, Hour: 9, Weekday: 3 },
      { Minute: 30, Hour: 9, Weekday: 4 },
      { Minute: 30, Hour: 9, Weekday: 5 },
    ])
  })
  test('comma list of hours', () => {
    const t = cronToTrigger('0 9,17 * * *')
    if (t.kind !== 'calendar') throw new Error('expected calendar')
    expect(t.entries).toEqual([
      { Minute: 0, Hour: 9 },
      { Minute: 0, Hour: 17 },
    ])
  })
  test('day-of-month only', () => {
    expect(cronToTrigger('0 0 1 * *')).toEqual({ kind: 'calendar', entries: [{ Minute: 0, Hour: 0, Day: 1 }] })
  })
  test('dow 7 normalizes to 0 (Sunday)', () => {
    const t = cronToTrigger('0 12 * * 7')
    if (t.kind !== 'calendar') throw new Error('expected calendar')
    expect(t.entries).toEqual([{ Minute: 0, Hour: 12, Weekday: 0 }])
  })
  test('rejects malformed / out-of-range', () => {
    expect(() => cronToTrigger('nope')).toThrow()
    expect(() => cronToTrigger('* * * *')).toThrow() // 4 fields
    expect(() => cronToTrigger('99 * * * *')).toThrow() // minute > 59
    expect(() => cronToTrigger('0 25 * * *')).toThrow() // hour > 23
  })
})

describe('specToTrigger', () => {
  test('interval spec', () => {
    expect(specToTrigger({ kind: 'interval', everyMinutes: 30 })).toEqual({ kind: 'interval', seconds: 1800 })
  })
  test('interval floors at 60s', () => {
    expect(specToTrigger({ kind: 'interval', everyMinutes: 0 })).toEqual({ kind: 'interval', seconds: 60 })
  })
  test('calendar daily (no weekdays)', () => {
    expect(specToTrigger({ kind: 'calendar', minute: 5, hour: 8 })).toEqual({
      kind: 'calendar',
      entries: [{ Minute: 5, Hour: 8 }],
    })
  })
  test('calendar with weekdays → one entry each', () => {
    const t = specToTrigger({ kind: 'calendar', minute: 0, hour: 9, weekdays: [1, 3] })
    if (t.kind !== 'calendar') throw new Error('expected calendar')
    expect(t.entries).toEqual([
      { Minute: 0, Hour: 9, Weekday: 1 },
      { Minute: 0, Hour: 9, Weekday: 3 },
    ])
  })
})

describe('describeSpec', () => {
  test('human-readable summaries', () => {
    expect(describeSpec({ kind: 'interval', everyMinutes: 120 })).toBe('every 2h')
    expect(describeSpec({ kind: 'interval', everyMinutes: 15 })).toBe('every 15m')
    expect(describeSpec({ kind: 'calendar', minute: 30, hour: 9 })).toBe('daily at 09:30')
    expect(describeSpec({ kind: 'calendar', minute: 0, hour: 17, weekdays: [1, 2, 3, 4, 5] })).toBe(
      'Mon,Tue,Wed,Thu,Fri at 17:00',
    )
    expect(describeSpec({ kind: 'cron', expr: '30 9 * * 1-5' })).toBe('cron: 30 9 * * 1-5')
  })
})
