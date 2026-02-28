'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const message = typeof error?.message === 'string' && !error.message.includes('<')
    ? error.message
    : 'An unexpected error occurred.';

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        padding: '2rem',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Something went wrong</h2>
      <p style={{ color: '#6b7280', textAlign: 'center', maxWidth: '28rem', fontSize: '0.875rem' }}>
        {message}
      </p>
      <button
        type="button"
        onClick={() => reset()}
        style={{
          padding: '0.5rem 1rem',
          borderRadius: '0.375rem',
          backgroundColor: '#18181b',
          color: '#fafafa',
          fontWeight: 500,
          border: 'none',
          cursor: 'pointer',
        }}
      >
        Try again
      </button>
    </div>
  );
}
