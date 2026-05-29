import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, RotateCw, Globe, X } from 'lucide-react'
import type { Tab, TabContext } from '../../lib/types'

// The Electron <webview> surface we drive. Created imperatively (below) so we
// don't fight React/TS over the custom element.
type Webview = HTMLElement & {
  src: string
  goBack(): void
  goForward(): void
  reload(): void
  stop(): void
  loadURL(url: string): Promise<void>
  getURL(): string
  canGoBack(): boolean
  canGoForward(): boolean
}

const HOME = 'https://www.google.com'

function normalizeUrl(input: string): string {
  const s = input.trim()
  if (!s) return ''
  if (/^https?:\/\//i.test(s)) return s
  // a bare domain (has a dot, no spaces) → https://; otherwise search it
  if (!s.includes(' ') && /\.[^\s.]{2,}$/.test(s)) return `https://${s}`
  return `https://www.google.com/search?q=${encodeURIComponent(s)}`
}

function BrowserTab(_props: { ctx: TabContext }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const wvRef = useRef<Webview | null>(null)
  const [addr, setAddr] = useState(HOME)
  const [loading, setLoading] = useState(false)
  const [canBack, setCanBack] = useState(false)
  const [canFwd, setCanFwd] = useState(false)
  const [browserName, setBrowserName] = useState('Brave Browser')

  useEffect(() => {
    window.gt.settings.get().then((s) => setBrowserName(s.apps?.browser || 'Brave Browser'))
  }, [])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const wv = document.createElement('webview') as Webview
    wv.setAttribute('partition', 'persist:browser') // persist logins/cookies
    wv.setAttribute('allowpopups', 'false')
    wv.setAttribute('src', HOME)
    wv.style.width = '100%'
    wv.style.height = '100%'
    host.appendChild(wv)
    wvRef.current = wv

    const sync = () => {
      try {
        setCanBack(wv.canGoBack())
        setCanFwd(wv.canGoForward())
        const u = wv.getURL()
        if (u && !u.startsWith('about:')) setAddr(u)
      } catch {
        /* webview not ready */
      }
    }
    const onStart = () => setLoading(true)
    const onStop = () => {
      setLoading(false)
      sync()
    }
    const onNav = () => sync()
    // pop-ups / target=_blank → keep them in this webview instead of new windows
    const onNewWindow = (e: Event & { url?: string }) => {
      if (e.url) wv.loadURL(e.url).catch(() => {})
    }
    wv.addEventListener('did-start-loading', onStart)
    wv.addEventListener('did-stop-loading', onStop)
    wv.addEventListener('did-navigate', onNav)
    wv.addEventListener('did-navigate-in-page', onNav)
    wv.addEventListener('new-window', onNewWindow as EventListener)
    return () => {
      wv.removeEventListener('did-start-loading', onStart)
      wv.removeEventListener('did-stop-loading', onStop)
      wv.removeEventListener('did-navigate', onNav)
      wv.removeEventListener('did-navigate-in-page', onNav)
      wv.removeEventListener('new-window', onNewWindow as EventListener)
      wv.remove()
      wvRef.current = null
    }
  }, [])

  const go = () => {
    const u = normalizeUrl(addr)
    if (!u) return
    setAddr(u)
    wvRef.current?.loadURL(u).catch(() => {})
  }

  const iconBtn =
    'flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-400 hover:bg-white/5 hover:text-zinc-200 disabled:opacity-30 disabled:hover:bg-transparent'

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--gt-bg)]">
      <div className="flex shrink-0 items-center gap-1 border-b border-[var(--gt-border)] px-2 py-1.5">
        <button onClick={() => wvRef.current?.goBack()} disabled={!canBack} className={iconBtn} title="Back">
          <ArrowLeft size={15} strokeWidth={2} />
        </button>
        <button onClick={() => wvRef.current?.goForward()} disabled={!canFwd} className={iconBtn} title="Forward">
          <ArrowRight size={15} strokeWidth={2} />
        </button>
        <button
          onClick={() => (loading ? wvRef.current?.stop() : wvRef.current?.reload())}
          className={iconBtn}
          title={loading ? 'Stop' : 'Reload'}
        >
          {loading ? <X size={14} strokeWidth={2} /> : <RotateCw size={14} strokeWidth={2} />}
        </button>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            go()
          }}
          className="flex flex-1 items-center gap-1.5 rounded-lg border border-[var(--gt-border)] bg-black/30 px-2 py-1 focus-within:border-[var(--gt-accent)]/60"
        >
          <Globe size={13} strokeWidth={2} className={`shrink-0 ${loading ? 'text-[var(--gt-accent-2)]' : 'text-zinc-600'}`} />
          <input
            value={addr}
            onChange={(e) => setAddr(e.target.value)}
            onFocus={(e) => e.target.select()}
            placeholder="Search or enter URL"
            spellCheck={false}
            className="min-w-0 flex-1 bg-transparent text-[12px] text-zinc-200 outline-none"
          />
        </form>
        <button
          onClick={() => window.gt.openInBrowser(addr)}
          title={`Open this page in ${browserName} (your wallet + extensions)`}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-[var(--gt-border)] px-2 py-1 text-[11px] text-zinc-300 hover:border-[var(--gt-accent)]/60 hover:text-white"
        >
          <span className="text-[var(--gt-accent-2)]">◆</span>
          Open in {browserName.replace(/ Browser$/, '')}
        </button>
      </div>
      <div ref={hostRef} className="min-h-0 flex-1" />
    </div>
  )
}

const tab: Tab = {
  id: 'browser',
  title: 'Browser',
  icon: Globe,
  order: 3.7, // after the agent/schedule cluster
  appliesTo: () => true,
  Component: BrowserTab,
}
export default tab
