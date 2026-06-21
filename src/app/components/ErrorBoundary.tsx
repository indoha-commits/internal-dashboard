import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) { return { error }; }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error.message, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="text-center p-8 max-w-md">
            <p className="text-destructive text-lg font-semibold mb-2">
              Something went wrong
            </p>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              {this.state.error.message}
            </p>
            <button onClick={() => window.location.reload()} className="btn-primary">
              Refresh page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
