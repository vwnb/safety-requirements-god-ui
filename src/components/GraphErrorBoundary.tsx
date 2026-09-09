import { Component, type ErrorInfo, type ReactNode } from "react"

type GraphErrorBoundaryProps = {
  children: ReactNode
  resetKey: string
  onCrash: (error: Error) => void
  onRetry: () => void
}

type GraphErrorBoundaryState = {
  error: Error | null
}

export default class GraphErrorBoundary extends Component<
  GraphErrorBoundaryProps,
  GraphErrorBoundaryState
> {
  state: GraphErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): GraphErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Graph rendering crashed", error, errorInfo.componentStack)
    this.props.onCrash(error)
  }

  componentDidUpdate(previousProps: GraphErrorBoundaryProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null })
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div
          data-agent="graph-crash-fallback"
          style={{
            display: "grid",
            placeItems: "center",
            minHeight: 320,
            padding: 24,
            border: "2px solid black",
            background: "white",
            fontFamily: "monospace",
          }}
        >
          <div>
            <strong>Graph failed to render.</strong>
            <p style={{ maxWidth: 520 }}>
              The graph was reloaded once automatically. Try again if the problem persists.
            </p>
            <button type="button" onClick={this.props.onRetry}>
              Reload graph
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
