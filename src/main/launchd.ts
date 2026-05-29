import {
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  unlinkSync,
  copyFileSync,
  chmodSync,
} from 'node:fs'
import { execFileSync, spawn } from 'node:child_process'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { specToTrigger, type CalendarDict } from './cron'
import { readSchedules, type Schedule } from './schedules'

// Real macOS cron via per-schedule LaunchAgents. Every job shares the
// `com.terminal.cron.` label prefix, so reconcileSchedules() can guarantee no
// orphans by diffing the loaded jobs against schedules.json.
const LA_DIR = join(homedir(), 'Library', 'LaunchAgents')
const CFG = join(homedir(), '.config', 'TerMinal')
const RUNNER = join(CFG, 'bin', 'terminal-cron') // stable path, survives app moves
const PREFIX = 'com.terminal.cron.'
const label = (id: string) => `${PREFIX}${id}`
const plistPath = (id: string) => join(LA_DIR, `${label(id)}.plist`)
const uid = process.getuid?.() ?? 0
const domain = `gui/${uid}`

let bunPath = ''
function resolveBun(): string {
  if (bunPath) return bunPath
  try {
    const shell = process.env.SHELL || '/bin/zsh'
    bunPath = execFileSync(shell, ['-l', '-c', 'command -v bun'], { encoding: 'utf8' }).trim()
  } catch {
    /* fall through */
  }
  if (!bunPath) bunPath = join(homedir(), '.bun', 'bin', 'bun')
  return bunPath
}

// Refresh the headless runner at the stable path (from the bundle in prod, the
// repo in dev). Called on launch so launchd points at a location independent of
// the .app bundle.
export function installRunner(srcPath: string): void {
  try {
    if (!existsSync(srcPath)) return
    mkdirSync(join(CFG, 'bin'), { recursive: true })
    copyFileSync(srcPath, RUNNER)
    chmodSync(RUNNER, 0o755)
  } catch {
    /* best effort */
  }
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function plistXml(s: Schedule): string {
  const trig = specToTrigger(s.spec)
  const args = [resolveBun(), RUNNER, 'run', s.id]
  const argsXml = args.map((a) => `    <string>${esc(a)}</string>`).join('\n')
  let trigXml: string
  if (trig.kind === 'interval') {
    trigXml = `  <key>StartInterval</key>\n  <integer>${trig.seconds}</integer>`
  } else {
    const dict = (e: CalendarDict) =>
      '    <dict>\n' +
      Object.entries(e)
        .map(([k, v]) => `      <key>${k}</key><integer>${v}</integer>`)
        .join('\n') +
      '\n    </dict>'
    trigXml = `  <key>StartCalendarInterval</key>\n  <array>\n${trig.entries.map(dict).join('\n')}\n  </array>`
  }
  const logOut = join(CFG, 'cron-runs', `${s.id}.launchd.log`)
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${label(s.id)}</string>
  <key>ProgramArguments</key>
  <array>
${argsXml}
  </array>
${trigXml}
  <key>StandardOutPath</key>
  <string>${esc(logOut)}</string>
  <key>StandardErrorPath</key>
  <string>${esc(logOut)}</string>
  <key>EnvironmentVariables</key>
  <dict><key>HOME</key><string>${esc(homedir())}</string></dict>
</dict>
</plist>
`
}

function bootout(id: string): void {
  try {
    execFileSync('launchctl', ['bootout', `${domain}/${label(id)}`], { stdio: 'ignore' })
  } catch {
    /* not loaded */
  }
}
function bootstrap(id: string): void {
  try {
    execFileSync('launchctl', ['bootstrap', domain, plistPath(id)], { stdio: 'ignore' })
  } catch {
    try {
      execFileSync('launchctl', ['load', plistPath(id)], { stdio: 'ignore' }) // older macOS fallback
    } catch {
      /* best effort */
    }
  }
}

// Write + (re)load the plist for an enabled schedule; unload + delete if disabled.
export function syncSchedule(s: Schedule): void {
  mkdirSync(LA_DIR, { recursive: true })
  bootout(s.id) // idempotent reload
  if (!s.enabled) {
    try {
      if (existsSync(plistPath(s.id))) unlinkSync(plistPath(s.id))
    } catch {
      /* ignore */
    }
    return
  }
  writeFileSync(plistPath(s.id), plistXml(s))
  bootstrap(s.id)
}

export function unscheduleJob(id: string): void {
  bootout(id)
  try {
    if (existsSync(plistPath(id))) unlinkSync(plistPath(id))
  } catch {
    /* ignore */
  }
}

function listCronPlists(): string[] {
  try {
    return readdirSync(LA_DIR).filter((f) => f.startsWith(PREFIX) && f.endsWith('.plist'))
  } catch {
    return []
  }
}
const idFromPlist = (f: string) => f.slice(PREFIX.length, -'.plist'.length)

// Diff loaded jobs ↔ schedules.json: delete orphans, (re)load enabled schedules.
// This is the no-orphans guarantee — run on launch and on demand.
export function reconcileSchedules(): { loaded: number; removed: number } {
  const schedules = readSchedules()
  const byId = new Map(schedules.map((s) => [s.id, s]))
  let removed = 0
  let loaded = 0
  for (const f of listCronPlists()) {
    const id = idFromPlist(f)
    const s = byId.get(id)
    if (!s || !s.enabled) {
      unscheduleJob(id)
      removed++
    }
  }
  for (const s of schedules)
    if (s.enabled) {
      syncSchedule(s)
      loaded++
    }
  return { loaded, removed }
}

export function removeAllJobs(): number {
  let n = 0
  for (const f of listCronPlists()) {
    unscheduleJob(idFromPlist(f))
    n++
  }
  return n
}

// Fire a schedule immediately, out of band (detached so it outlives this call).
export function runScheduleNow(id: string): void {
  try {
    spawn(resolveBun(), [RUNNER, 'run', id], { detached: true, stdio: 'ignore' }).unref()
  } catch {
    /* best effort */
  }
}
