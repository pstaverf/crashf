import { Component } from "react";

/**
 * Catches render-time crashes in whatever it wraps (e.g. a lottie player
 * choking on a malformed file) so the rest of the app keeps working instead
 * of the whole screen going blank. Resets itself whenever `resetKey` changes
 * (pass the game phase) so the next round gets a clean retry.
 */
export default class StageErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("[stage] render error:", error, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}
