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
    // CodeMirror silently breaks if any core package resolves to more than one
    // copy: the editor and the language parsers end up with different state/view
    // /facet instances, so the language never activates → no syntax highlighting.
    // Dedupe the whole core (versions are pinned to single copies in overrides).
    resolve: {
      dedupe: [
        '@codemirror/state',
        '@codemirror/view',
        '@codemirror/language',
        '@lezer/common',
        '@lezer/highlight',
      ],
    },
  },
})
