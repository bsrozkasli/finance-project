import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled React error', error, info);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-bg-base text-text-primary flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-lg rounded-lg border border-outline-variant bg-bg-primary p-6 shadow-xl">
          <p className="text-[10px] uppercase tracking-wider text-bear-red font-label-caps">Application Error</p>
          <h1 className="mt-2 font-headline text-xl font-bold">Something went wrong</h1>
          <p className="mt-3 text-sm text-text-secondary">
            The interface hit an unexpected rendering error. Reload the page after checking the browser console for details.
          </p>
          <pre className="mt-4 max-h-40 overflow-auto rounded border border-outline-variant bg-bg-base p-3 text-xs text-text-secondary whitespace-pre-wrap">
            {this.state.error.message}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded bg-primary px-4 py-2 text-sm font-bold text-bg-base hover:bg-primary-container transition-colors"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
