import { Component, type ReactNode } from 'react'

// Contains a render error to one widget/tab instead of unmounting the whole app.
export class ErrorBoundary extends Component<
  { children: ReactNode; label?: string; fallback?: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  componentDidCatch(error: Error) {
    console.error(`[gt] ${this.props.label || 'component'} error:`, error)
  }
  render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <div className="m-2 rounded-xl border border-[var(--gt-red)]/30 bg-[var(--gt-red)]/10 p-2 text-[11px] text-[var(--gt-red)]">
            {this.props.label || 'component'} crashed: {this.state.error.message}
          </div>
        )
      )
    }
    return this.props.children
  }
}
