import { Notification } from 'electron'
import { appendFileSync, readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { homedir } from 'node:os'
import { randomUUID } from 'node:crypto'

// Activity feed + system notifications. Events are stored GLOBALLY (one log
// across every repo/session) but each is tagged with repo + session, so the
// Activity tab can show the global firehose or filter to one repo/session.
const LOG = join(homedir(), '.config', 'gauntlet-terminal', 'activity.jsonl')
const MAX_KEEP = 2000 // cap the on-disk log

export type ActivityKind =
  | 'task-complete'
  | 'ticket-filed'
  | 'pr-verdict'
  | 'session-start'
  | 'error'
  | 'info'

export type ActivityEvent = {
  id: string
  ts: number
  kind: ActivityKind
  title: string
  detail?: string
  repo?: string
  repoRoot?: string
  sessionId?: string
}

// which kinds raise a macOS notification (vs. log-only). task/ticket/pr matter;
// session-start is just feed context.
const NOTIFY: Record<ActivityKind, boolean> = {
  'task-complete': true,
  'ticket-filed': true,
  'pr-verdict': true,
  error: true,
  'session-start': false,
  info: false,
}

let broadcast: (ev: ActivityEvent) => void = () => {}
export function onActivity(fn: (ev: ActivityEvent) => void) {
  broadcast = fn
}

export function emitActivity(
  e: Omit<ActivityEvent, 'id' | 'ts'>,
  opts?: { notify?: boolean },
): ActivityEvent {
  const ev: ActivityEvent = { ...e, id: randomUUID(), ts: Date.now() }
  try {
    mkdirSync(dirname(LOG), { recursive: true })
    appendFileSync(LOG, JSON.stringify(ev) + '\n')
  } catch {
    /* best effort */
  }
  const notify = opts?.notify ?? NOTIFY[ev.kind]
  if (notify && Notification.isSupported()) {
    try {
      new Notification({ title: ev.title, body: ev.detail || '' }).show()
    } catch {
      /* notifications unavailable */
    }
  }
  broadcast(ev)
  return ev
}

/** Newest-first, capped. */
export function readActivity(limit = 500): ActivityEvent[] {
  if (!existsSync(LOG)) return []
  try {
    const lines = readFileSync(LOG, 'utf8').split('\n').filter(Boolean)
    // opportunistically compact a runaway log
    if (lines.length > MAX_KEEP) {
      try {
        writeFileSync(LOG, lines.slice(-MAX_KEEP).join('\n') + '\n')
      } catch {
        /* ignore */
      }
    }
    return lines
      .slice(-limit)
      .map((l) => {
        try {
          return JSON.parse(l) as ActivityEvent
        } catch {
          return null
        }
      })
      .filter((e): e is ActivityEvent => !!e)
      .reverse()
  } catch {
    return []
  }
}

export function clearActivity() {
  try {
    if (existsSync(LOG)) writeFileSync(LOG, '')
  } catch {
    /* ignore */
  }
}
