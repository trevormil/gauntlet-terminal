import type { ReactNode } from 'react'

// Shared widget primitives. Plugins compose these so cards look consistent.

export function Card({
  icon,
  title,
  right,
  children,
}: {
  icon: string
  title: string
  right?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="mb-2.5 rounded-xl border border-[var(--gt-border)] bg-[var(--gt-panel)] p-3 shadow-[0_1px_0_rgba(255,255,255,0.03)_inset]">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-sm leading-none">{icon}</span>
        <span className="flex-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
          {title}
        </span>
        {right}
      </div>
      {children}
    </div>
  )
}

export function Gauge({ pct, color }: { pct: number; color?: string }) {
  const c = color ?? (pct > 85 ? '#ff5c7c' : pct > 65 ? '#ffb35c' : 'var(--gt-accent-2)')
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-black/40">
      <div
        className="h-full rounded-full transition-all duration-500 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: c }}
      />
    </div>
  )
}

export function Big({ value, sub }: { value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-2xl font-bold tabular-nums tracking-tight text-zinc-50">{value}</span>
      {sub && <span className="text-[11px] text-zinc-500">{sub}</span>}
    </div>
  )
}

export function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between py-0.5 text-[12px]">
      <span className="text-zinc-500">{label}</span>
      <span className="font-medium tabular-nums text-zinc-200">{value}</span>
    </div>
  )
}

export function Badge({
  tone,
  children,
}: {
  tone: 'ok' | 'warn' | 'bad' | 'mute'
  children: ReactNode
}) {
  const map = {
    ok: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    warn: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    bad: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    mute: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/25',
  }
  return (
    <span
      className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${map[tone]}`}
    >
      {children}
    </span>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="text-[12px] italic text-zinc-600">{children}</div>
}
