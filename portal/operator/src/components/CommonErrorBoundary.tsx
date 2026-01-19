import type { ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

function ErrorFallback({ error }: { error: Error }) {
  return (
    <div style={{ 
      padding: '8px', 
      fontSize: '11px', 
      color: '#ef4444', 
      background: '#fef2f2', 
      border: '1px solid #fee2e2',
      borderRadius: '4px'
    }}>
      <span title={error.message}>⚠️ Rendering Error</span>
    </div>
  );
}

export function CommonErrorBoundary({ children, fallback }: Props) {
  return (
    <ErrorBoundary FallbackComponent={({ error }) => (fallback as any) || <ErrorFallback error={error as Error} />}>
      {children}
    </ErrorBoundary>
  );
}
