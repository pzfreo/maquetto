import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            height: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#1a1a2e',
            color: '#e0e0e0',
            padding: '40px',
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: '20px', marginBottom: '12px', color: '#f44336' }}>
            Something went wrong
          </h1>
          <p
            style={{
              fontSize: '13px',
              color: '#888',
              maxWidth: '500px',
              marginBottom: '20px',
              fontFamily: 'monospace',
            }}
          >
            {this.state.error?.message ?? 'Unknown error'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 20px',
              borderRadius: '6px',
              border: 'none',
              background: '#4285f4',
              color: '#fff',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
