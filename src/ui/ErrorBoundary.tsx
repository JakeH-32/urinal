import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Changing this resets the boundary (e.g. the current route). */
  resetKey?: string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Urinal screen crashed:', error, info.componentStack);
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <section className="card card--danger crash" role="alert">
        <div className="big-emoji" aria-hidden="true">🚧</div>
        <h2>Out of order.</h2>
        <p>Something broke on this screen.</p>
        <p className="muted small">{this.state.error.message}</p>
        <div className="row">
          <a className="btn btn--primary btn--md" href="#/" onClick={() => this.setState({ error: null })}>
            Menu
          </a>
          <button type="button" className="btn btn--default btn--md" onClick={() => this.setState({ error: null })}>
            Try again
          </button>
        </div>
      </section>
    );
  }
}
