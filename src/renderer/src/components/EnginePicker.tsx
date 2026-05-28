import { X } from 'lucide-react'
import type { Engine } from '../lib/types'
import openaiLogo from '../assets/openai.svg'
import anthropicLogo from '../assets/anthropic.svg'

const LOGO: Record<Engine, string> = { codex: openaiLogo, claude: anthropicLogo }
const VENDOR: Record<Engine, string> = { codex: 'OpenAI Codex', claude: 'Anthropic Claude' }

// "Launch with codex or claude?" — shown when starting an agent run / ticket
// implementation, so the engine is chosen at launch time (not pre-set).
export function EnginePicker({
  title,
  onPick,
  onClose,
}: {
  title: string
  onPick: (engine: Engine) => void
  onClose: () => void
}) {
  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-[380px] gt-pop-in rounded-2xl border border-[var(--gt-border)] bg-[var(--gt-panel)] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-start justify-between gap-2">
          <h2 className="text-[13px] font-bold text-zinc-100">{title}</h2>
          <button
            onClick={onClose}
            className="flex shrink-0 items-center rounded p-1 text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>
        <p className="mb-4 text-[11.5px] text-zinc-500">Launch this run with which engine?</p>
        <div className="grid grid-cols-2 gap-2">
          {(['codex', 'claude'] as Engine[]).map((e) => (
            <button
              key={e}
              onClick={() => onPick(e)}
              className="flex flex-col items-center gap-2 rounded-xl border border-[var(--gt-border)] bg-black/20 px-3 py-4 transition-colors hover:border-[var(--gt-accent)]/60 hover:bg-white/5"
            >
              <img src={LOGO[e]} alt="" className="h-7 w-7" draggable={false} />
              <span className="text-[13px] font-semibold text-zinc-100">launch with {e}</span>
              <span className="text-[10px] text-zinc-500">{VENDOR[e]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
