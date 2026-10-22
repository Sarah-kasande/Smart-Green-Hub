// Safety net around every signed-in page. If a page cannot be drawn (for example the server sent an
// answer without a field this version of the app expects), the person sees a friendly message with
// "Try again" instead of a blank screen. "Try again" reloads the page, which also picks up a newer
// version of the app if one is waiting.
import { Component } from 'react'
import ErrorState from './ErrorState'

export default class PageErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    // Details for the developer only; the person sees the friendly message
    if (import.meta.env.DEV) console.error(error)
  }

  render() {
    if (this.state.failed) return <ErrorState code="PAGE_FAILED" onRetry={() => window.location.reload()} />
    return this.props.children
  }
}
