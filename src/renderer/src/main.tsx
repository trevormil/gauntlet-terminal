import { createRoot } from 'react-dom/client'
import App from './App'
import '@xterm/xterm/css/xterm.css'
import 'highlight.js/styles/github-dark.css'
import './index.css'

// No StrictMode: its double-invoked effects would spawn the PTY twice in dev.
createRoot(document.getElementById('root')!).render(<App />)
