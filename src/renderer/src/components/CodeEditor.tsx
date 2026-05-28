import { useEffect, useRef } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { oneDarkHighlightStyle } from '@codemirror/theme-one-dark'
import { syntaxHighlighting } from '@codemirror/language'
import { EditorView } from '@codemirror/view'
import type { Extension } from '@codemirror/state'

// Own the editor chrome (a dark surface that matches the app) and keep only the
// one-dark *syntax* colors. Using the full oneDark theme let its medium-gray
// #282c34 background win over our override — too light against the near-black UI.
const EDITOR_BG = '#0f0f15'
const gtTheme = EditorView.theme(
  {
    '&': { height: '100%', backgroundColor: EDITOR_BG, color: '#e7e7ee' },
    '.cm-scroller': {
      fontFamily: "'IBM Plex Mono', 'SF Mono', ui-monospace, 'JetBrains Mono', Menlo, monospace",
      fontSize: '13px',
      lineHeight: '1.55',
    },
    '.cm-gutters': { backgroundColor: EDITOR_BG, border: 'none', color: '#3d3d4a' },
    '.cm-activeLineGutter': { backgroundColor: 'rgba(255,255,255,0.03)', color: '#8a8a9a' },
    '.cm-activeLine': { backgroundColor: 'rgba(255,255,255,0.022)' },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
      backgroundColor: 'rgba(124,110,246,0.28)',
    },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--gt-accent)' },
    '.cm-content': { caretColor: 'var(--gt-accent)' },
    '&.cm-focused': { outline: 'none' },
    '.cm-tooltip': {
      backgroundColor: 'var(--gt-panel)',
      border: '1px solid var(--gt-border)',
      borderRadius: '8px',
    },
  },
  { dark: true },
)

export function CodeEditor({
  value,
  onChange,
  extensions = [],
  editable = true,
  wrap = false,
  scrollToLine,
}: {
  value: string
  onChange?: (v: string) => void
  extensions?: Extension[]
  editable?: boolean
  wrap?: boolean
  scrollToLine?: number
}) {
  const viewRef = useRef<EditorView | null>(null)
  useEffect(() => {
    const view = viewRef.current
    if (!view || !scrollToLine) return
    try {
      const ln = Math.max(1, Math.min(scrollToLine, view.state.doc.lines))
      const line = view.state.doc.line(ln)
      view.dispatch({
        selection: { anchor: line.from },
        effects: EditorView.scrollIntoView(line.from, { y: 'center' }),
      })
      view.focus()
    } catch {
      /* ignore */
    }
  }, [scrollToLine, value])

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      editable={editable}
      theme={gtTheme}
      height="100%"
      style={{ height: '100%', background: EDITOR_BG }}
      onCreateEditor={(view) => {
        viewRef.current = view
      }}
      extensions={[
        syntaxHighlighting(oneDarkHighlightStyle),
        ...(wrap ? [EditorView.lineWrapping] : []),
        ...extensions,
      ]}
      basicSetup={{
        lineNumbers: true,
        foldGutter: false,
        highlightActiveLine: editable,
        autocompletion: true,
        searchKeymap: true,
      }}
    />
  )
}
