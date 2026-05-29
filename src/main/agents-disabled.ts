import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { homedir } from 'node:os'

// Kill-switch / circuit-breaker registry. A scheduleId in this list is
// skipped by bin/terminal-cron at run time. Headless runner writes here when
// it auto-disables a schedule after N consecutive failures; the Schedules tab
// reads + toggles via IPC.

const FILE = join(homedir(), '.config', 'TerMinal', 'agents', 'disabled.json')

function readRaw(): string[] {
  try {
    const a = JSON.parse(readFileSync(FILE, 'utf8'))
    if (Array.isArray(a)) return a.filter((x): x is string => typeof x === 'string')
    if (Array.isArray(a?.scheduleIds))
      return a.scheduleIds.filter((x: unknown): x is string => typeof x === 'string')
    return []
  } catch {
    return []
  }
}

function writeRaw(list: string[]): void {
  try {
    mkdirSync(dirname(FILE), { recursive: true })
    writeFileSync(FILE, JSON.stringify({ scheduleIds: [...new Set(list)] }, null, 2))
  } catch {
    /* best effort — the runner re-creates as needed */
  }
}

export function listDisabled(): string[] {
  return readRaw()
}

export function isDisabled(id: string): boolean {
  return readRaw().includes(id)
}

export function setDisabled(id: string, disabled: boolean): string[] {
  const cur = new Set(readRaw())
  if (disabled) cur.add(id)
  else cur.delete(id)
  const next = [...cur]
  writeRaw(next)
  return next
}
