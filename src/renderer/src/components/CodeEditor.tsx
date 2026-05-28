import { useEffect, useRef } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView } from '@codemirror/view'
import type { Extension } from '@codemirror/state'

// GT styling on top of the one-dark theme so the editor matches the app chrome.
const gtTheme = EditorView.theme({
  '&': { height: '100%', backgroundColor: 'transparent' },
  '.cm-scroller': {
    fontFamily: "'SF Mono', ui-monospace, 'JetBrains Mono', Menlo, monospace",
    fontSize: '13px',
    lineHeight: '1.5',
  },
  '.cm-gutters': { backgroundColor: 'transparent', border: 'none', color: '#4b4b5e' },
  '.cm-activeLineGutter': { backgroundColor: 'transparent' },
  '.cm-activeLine': { backgroundColor: 'rgba(255,255,255,0.025)' },
  '&.cm-focused': { outline: 'none' },
  '.cm-content': { caretColor: 'var(--gt-accent)' },
})

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
      style={{ height: '100%', background: 'transparent' }}
      onCreateEditor={(view) => {
        viewRef.current = view
      }}
      extensions={[gtTheme, ...(wrap ? [EditorView.lineWrapping] : []), ...extensions]}
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
