import { useEffect, useRef } from 'react'
import { Terminal as Xterm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import type { Choice } from './EntryScreen'

// Hosts the real Claude Code CLI: xterm.js renders, the PTY (main process) runs
// `claude` attached to the chosen session. Same pattern VS Code's integrated
// terminal uses.
export function TerminalPane({
  choice,
  onStarted,
}: {
  choice: Choice
  onStarted?: (info: { sessionId: string; cwd: string }) => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const term = new Xterm({
      fontFamily: "'SF Mono', ui-monospace, 'JetBrains Mono', Menlo, monospace",
      fontSize: 13,
      lineHeight: 1.25,
      cursorBlink: true,
      allowProposedApi: true,
      theme: {
        background: '#0a0a0f',
        foreground: '#e7e7ee',
        cursor: '#7c5cff',
        selectionBackground: '#7c5cff44',
        black: '#0a0a0f',
        brightBlack: '#5b5b6e',
      },
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.loadAddon(new WebLinksAddon((_e, uri) => window.gt.openExternal(uri)))
    term.open(el)
    fit.fit()

    const gt = window.gt

    // copy/paste: Cmd+C copies the selection, Cmd+V pastes into the pty.
    term.attachCustomKeyEventHandler((e) => {
      if (e.type !== 'keydown' || !e.metaKey) return true
      if (e.key === 'c' && term.hasSelection()) {
        gt.clipboardWrite(term.getSelection())
        return false
      }
      if (e.key === 'v') {
        gt.clipboardRead().then((t) => t && gt.pty.input(t))
        return false
      }
      return true
    })
    // right-click: copy the selection if any, else paste (classic terminal UX).
    const onContext = (e: MouseEvent) => {
      e.preventDefault()
      if (term.hasSelection()) gt.clipboardWrite(term.getSelection())
      else gt.clipboardRead().then((t) => t && gt.pty.input(t))
    }
    el.addEventListener('contextmenu', onContext)
    // attach listeners BEFORE starting the pty so no early output is missed.
    const offData = gt.pty.onData((d) => term.write(d))
    const offExit = gt.pty.onExit(() => term.write('\r\n\x1b[2m── process exited ──\x1b[0m\r\n'))
    const onInput = term.onData((d) => gt.pty.input(d))

    // spawn `claude` attached to the chosen session, sized to the live terminal
    gt.startSession({ ...choice, cols: term.cols, rows: term.rows }).then((info) =>
      onStarted?.(info),
    )

    // Debounce fit to a frame and only resize when the cell grid actually
    // changes — calling fit() synchronously inside the observer makes xterm
    // re-layout, which re-fires the observer ("ResizeObserver loop") and
    // thrashes the layout (visible flicker).
    let raf = 0
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const dims = fit.proposeDimensions()
        if (!dims || !dims.cols || !dims.rows) return
        if (dims.cols === term.cols && dims.rows === term.rows) return
        fit.fit()
        gt.pty.resize({ cols: term.cols, rows: term.rows })
      })
    })
    ro.observe(el)

    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('contextmenu', onContext)
      offData()
      offExit()
      onInput.dispose()
      ro.disconnect()
      term.dispose()
    }
  }, [])

  return <div ref={ref} className="h-full w-full px-2 py-1" />
}
