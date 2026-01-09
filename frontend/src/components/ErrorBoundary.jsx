/**
 * Error Boundary Component
 * Catches JavaScript errors in child component tree and displays fallback UI.
 */

import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so next render shows fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Update state with error details
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // Call optional error handler from props
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Optional: Send error to logging service
    if (this.props.logError) {
      this.props.logError(error, errorInfo);
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI from props
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          errorInfo: this.state.errorInfo,
          resetError: this.resetError
        });
      }

      // Default fallback UI
      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <h1 style={styles.title}>⚠️ Something went wrong</h1>
            
            <p style={styles.message}>
              {this.props.errorMessage || 'An unexpected error occurred in the application.'}
            </p>

            {this.props.showDetails && this.state.error && (
              <details style={styles.details}>
                <summary style={styles.summary}>Error Details</summary>
                <pre style={styles.errorText}>
                  {this.state.error.toString()}
                  {this.state.errorInfo && (
                    <>
                      {'\n\n'}
                      {this.state.errorInfo.componentStack}
                    </>
                  )}
                </pre>
              </details>
            )}

            <div style={styles.actions}>
              <button 
                onClick={this.resetError} 
                style={styles.button}
              >
                Try Again
              </button>
              
              <button 
                onClick={() => window.location.reload()} 
                style={{ ...styles.button, ...styles.reloadButton }}
              >
                Reload Page
              </button>
            </div>

            {this.state.errorCount > 3 && (
              <div style={styles.warning}>
                <p>
                  Multiple errors detected ({this.state.errorCount}). 
                  Consider reloading the page or checking your network connection.
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Inline styles for error boundary
const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '20px'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '32px',
    maxWidth: '600px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    textAlign: 'center'
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: '16px'
  },
  message: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '24px',
    lineHeight: '1.5'
  },
  details: {
    marginTop: '24px',
    marginBottom: '24px',
    textAlign: 'left',
    backgroundColor: '#f9f9f9',
    borderRadius: '4px',
    padding: '16px'
  },
  summary: {
    cursor: 'pointer',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '8px'
  },
  errorText: {
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#d32f2f',
    overflow: 'auto',
    maxHeight: '200px',
    padding: '12px',
    backgroundColor: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: '4px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word'
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    marginTop: '24px'
  },
  button: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '600',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    backgroundColor: '#1976d2',
    color: 'white',
    transition: 'background-color 0.2s'
  },
  reloadButton: {
    backgroundColor: '#757575'
  },
  warning: {
    marginTop: '24px',
    padding: '12px',
    backgroundColor: '#fff3e0',
    borderLeft: '4px solid #ff9800',
    borderRadius: '4px',
    fontSize: '14px',
    color: '#e65100',
    textAlign: 'left'
  }
};

// PropTypes validation (optional, can be added if needed)
ErrorBoundary.defaultProps = {
  showDetails: process.env.NODE_ENV === 'development',
  errorMessage: null,
  fallback: null,
  onError: null,
  logError: null
};

export default ErrorBoundary;

/**
 * HOC to wrap component with ErrorBoundary
 * 
 * @param {React.Component} Component - Component to wrap
 * @param {Object} errorBoundaryProps - Props for ErrorBoundary
 * @returns {React.Component} Wrapped component
 */
export function withErrorBoundary(Component, errorBoundaryProps = {}) {
  return function WrappedComponent(props) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
