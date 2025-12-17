'use client';

import { NextPageContext } from 'next';

interface ErrorProps {
  statusCode: number;
}

function Error({ statusCode }: ErrorProps) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0f172a',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <h1 style={{ color: '#f1f5f9', fontSize: '2rem', marginBottom: '1rem' }}>
          {statusCode ? `Error ${statusCode}` : 'An error occurred'}
        </h1>
        <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>
          {statusCode === 404
            ? 'Page not found'
            : 'Something went wrong'}
        </p>
        <a
          href="/"
          style={{
            display: 'inline-block',
            backgroundColor: '#0891b2',
            color: 'white',
            fontWeight: 'bold',
            padding: '0.75rem 1.5rem',
            borderRadius: '0.5rem',
            textDecoration: 'none',
          }}
        >
          Go Home
        </a>
      </div>
    </div>
  );
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
