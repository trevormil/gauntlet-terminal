import { createRoot } from 'react-dom/client'
import App from './App'
import '@xterm/xterm/css/xterm.css'
import 'highlight.js/styles/github-dark.css'
import './index.css'

// The "ResizeObserver loop" warning is benign but, uncaught, trips the Vite dev
// error overlay (which flickers over the UI and blocks clicks). Swallow it.
window.addEventListener('error', (e) => {
  if (typeof e.message === 'string' && e.message.includes('ResizeObserver loop')) {
    e.stopImmediatePropagation()
    e.preventDefault()
  }
})

// No StrictMode: its double-invoked effects would spawn the PTY twice in dev.
createRoot(document.getElementById('root')!).render(<App />)
