import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div style={{ padding: '20px', background: '#fee2e2', border: '1px solid #ef4444', borderRadius: '8px', margin: '20px' }}>
          <h2 style={{ color: '#b91c1c', fontWeight: 'bold' }}>Algo salió mal en este componente.</h2>
          <details style={{ whiteSpace: 'pre-wrap', color: '#7f1d1d', marginTop: '10px', fontSize: '12px' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Ver detalles del error</summary>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo?.componentStack}
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}
