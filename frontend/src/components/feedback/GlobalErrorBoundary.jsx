import React from 'react';
import ErrorState from './ErrorState.jsx';

/**
 * GlobalErrorBoundary - Catches errors from RouterProvider and router contexts
 * Wraps RouterProvider to handle navigation errors and other routing issues
 */
class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log error in development
    if (import.meta.env.DEV) {
      console.error('GlobalErrorBoundary caught error:', error, errorInfo);
    }

    this.setState({ errorInfo });

    // Log to error tracking service (if available)
    if (window.__errorTracker) {
      window.__errorTracker({
        error: error.toString(),
        stack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
      });
    }
  }

  handleRetry = () => {
    const { retryCount } = this.state;
    const maxRetries = 3;

    if (retryCount < maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1,
      }));
    } else {
      // After max retries, reload page
      window.location.href = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      const { error } = this.state;

      // Determine error type and message
      let title = 'Navigation Error';
      let message = 'An error occurred while navigating. Please try again.';
      let errorType = 'general';

      if (error?.message) {
        if (error.message.includes('Navigation') || error.message.includes('route')) {
          title = 'Navigation Error';
          message = error.message;
          errorType = 'general';
        } else if (error.message.includes('Network') || error.message.includes('fetch')) {
          title = 'Connection Error';
          message = 'Unable to connect. Please check your internet connection.';
          errorType = 'network';
        } else if (error.message.includes('404') || error.message.includes('not found')) {
          title = 'Page Not Found';
          message = 'The page you\'re looking for doesn\'t exist.';
          errorType = 'general';
        }
      }

      return (
        <ErrorState
          title={title}
          message={message}
          errorType={errorType}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
