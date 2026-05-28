import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// node-pty is a native module — keep it external so it isn't bundled.
export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    root: 'src/renderer',
    plugins: [react(), tailwindcss()],
    // CodeMirror breaks (instanceof) if @codemirror/state gets bundled more than
    // once — force a single copy across react-codemirror + langs + search.
    resolve: { dedupe: ['@codemirror/state'] },
  },
})
