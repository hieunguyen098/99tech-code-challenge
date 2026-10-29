import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "./Button";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/** Last line of defence: an unexpected render error shows a recoverable screen, not a blank page. */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    // Hook point for error reporting (e.g. Sentry) in a real deployment.
    console.error(error, info.componentStack);
  }

  override render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <main
        role="alert"
        className="flex min-h-svh flex-col items-center justify-center gap-3 px-4 text-center"
      >
        <p className="text-lg font-semibold text-white">Something went wrong</p>
        <Button onClick={() => window.location.reload()}>Reload</Button>
      </main>
    );
  }
}
