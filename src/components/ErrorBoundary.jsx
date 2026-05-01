import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error instanceof Error ? error.message : "Unexpected error" };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info);
    const body = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : null,
      componentStack: info?.componentStack ?? null,
      userAgent: navigator.userAgent,
    };
    fetch("/api/report-error", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => {});
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-smoke flex items-center justify-center p-4">
          <div className="max-w-sm text-center space-y-3">
            <p className="text-4xl">💥</p>
            <p className="text-bone font-display text-lg">Something broke</p>
            <p className="text-dim font-mono text-xs">{this.state.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-blood text-bone font-mono text-sm"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}