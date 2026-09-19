import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ErrorState } from './ui'

type Props = { children: ReactNode }
type State = { hasError: boolean }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled storefront error', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="page-section">
          <ErrorState onRetry={() => window.location.reload()} />
        </section>
      )
    }

    return this.props.children
  }
}
