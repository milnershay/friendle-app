'use client';

import React from 'react';
import { ErrorBoundary as ReactErrorBoundary, FallbackProps } from 'react-error-boundary';
import { Button } from '@/components/ui/button'; // Assuming a generic Button component exists

// A friendly UI to show when an error occurs
function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  // Log the error to the console for debugging
  // In a real app, you'd send this to a service like Sentry
  console.error('Caught error:', error);

  return (
    <div
      role="alert"
      className="flex h-screen w-full flex-col items-center justify-center space-y-4 bg-red-50 text-red-800"
    >
      <h2 className="text-2xl font-bold">Something went wrong.</h2>
      <p>We're sorry, but the application encountered an unexpected error.</p>
      <pre className="w-1/2 overflow-auto whitespace-pre-wrap rounded bg-red-100 p-4 text-sm">
        {error.message}
      </pre>
      <Button
        onClick={resetErrorBoundary}
        className="bg-red-600 text-white hover:bg-red-700"
      >
        Try again
      </Button>
    </div>
  );
}

// A wrapper component that provides the error boundary logic
function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const handleReset = () => {
    // This is a simple reset. For more complex cases, you might need
    // to clear some state or re-fetch data.
    window.location.reload();
  };

  return (
    <ReactErrorBoundary FallbackComponent={ErrorFallback} onReset={handleReset}>
      {children}
    </ReactErrorBoundary>
  );
}

export default ErrorBoundary;
