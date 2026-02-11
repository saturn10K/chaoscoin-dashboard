"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
  label?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.label ? ` — ${this.props.label}` : ""}]`, error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="rounded-lg border border-white/10 p-6 text-center animate-fade-in-up"
          style={{ backgroundColor: "#0D1117" }}
        >
          <div className="text-2xl mb-2">⚠</div>
          <div className="text-sm font-medium text-gray-300 mb-1">
            {this.props.label ? `${this.props.label} failed to load` : "Something went wrong"}
          </div>
          <div className="text-xs text-gray-500 mb-4 font-mono max-w-xs mx-auto truncate">
            {this.state.error?.message || "Unknown error"}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-1.5 rounded text-xs font-medium transition-colors"
            style={{
              backgroundColor: "#7B61FF20",
              color: "#7B61FF",
              border: "1px solid #7B61FF40",
            }}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
