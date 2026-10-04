import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

interface Props {
  resetKey: string;
  fallback?: ReactNode;
  children: ReactNode;
}

export default class StageErrorBoundary extends Component<Props, { hasError: boolean }> {
  override state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[stage] render error:", error, info.componentStack);
  }

  override componentDidUpdate(prev: Props): void {
    if (this.state.hasError && prev.resetKey !== this.props.resetKey) this.setState({ hasError: false });
  }

  override render(): ReactNode {
    return this.state.hasError ? (this.props.fallback ?? null) : this.props.children;
  }
}
