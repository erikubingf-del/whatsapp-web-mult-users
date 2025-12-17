'use client';

// Global error boundary that doesn't depend on any providers
// This must work even when the root layout fails
export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html lang="en">
            <head>
                <title>Error - WhatsApp Multi-User Manager</title>
            </head>
            <body style={{
                margin: 0,
                padding: 0,
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#0f172a',
                fontFamily: 'system-ui, sans-serif',
            }}>
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <h1 style={{ color: '#f1f5f9', fontSize: '2rem', marginBottom: '1rem' }}>
                        Something went wrong!
                    </h1>
                    <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>
                        An unexpected error occurred.
                    </p>
                    <button
                        onClick={reset}
                        style={{
                            backgroundColor: '#0891b2',
                            color: 'white',
                            fontWeight: 'bold',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '0.5rem',
                            border: 'none',
                            cursor: 'pointer',
                        }}
                    >
                        Try again
                    </button>
                </div>
            </body>
        </html>
    );
}
