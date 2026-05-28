import { useEffect, useRef } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView } from '@codemirror/view'
import { Prec, type Extension } from '@codemirror/state'

// oneDark supplies the syntax highlighting (its token colors work well). We only
// override the *chrome* — oneDark's #282c34 background reads too light over the
// near-black UI. Prec.highest makes these same-selector rules beat the theme.
const EDITOR_BG = '#0f0f15'
const chrome = Prec.highest(
  EditorView.theme({
    '&': { height: '100%', backgroundColor: EDITOR_BG },
    '.cm-gutters': { backgroundColor: EDITOR_BG, border: 'none', color: '#3d3d4a' },
    '.cm-activeLineGutter': { backgroundColor: 'rgba(255,255,255,0.03)', color: '#8a8a9a' },
    '.cm-activeLine': { backgroundColor: 'rgba(255,255,255,0.022)' },
    '.cm-scroller': {
      fontFamily: "'IBM Plex Mono', 'SF Mono', ui-monospace, 'JetBrains Mono', Menlo, monospace",
      fontSize: '13px',
      lineHeight: '1.55',
    },
    '.cm-content': { caretColor: 'var(--gt-accent)' },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--gt-accent)' },
    '&.cm-focused': { outline: 'none' },
  }),
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
      theme={oneDark}
      height="100%"
      style={{ height: '100%', background: EDITOR_BG }}
      onCreateEditor={(view) => {
        viewRef.current = view
      }}
      extensions={[chrome, ...(wrap ? [EditorView.lineWrapping] : []), ...extensions]}
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
