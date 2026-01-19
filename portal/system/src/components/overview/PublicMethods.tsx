import React from 'react';

interface PublicMethodsProps {
  methods: string[];
}

export const PublicMethods: React.FC<PublicMethodsProps> = ({ methods }) => {
  return (
    <div className="panel" style={{ marginTop: '24px' }}>
      <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        🔓 PUBLIC METHODS
        <span style={{
          fontSize: '11px',
          padding: '2px 8px',
          borderRadius: '12px',
          background: 'rgba(88, 166, 255, 0.15)',
          color: '#58a6ff',
          border: '1px solid rgba(88, 166, 255, 0.4)',
          fontWeight: 500
        }}>
          NO AUTH REQUIRED
        </span>
      </div>
      <div className="panel-content" style={{ padding: '16px 24px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {methods.map((method, idx) => (
            <span key={idx} style={{
              display: 'inline-block',
              padding: '6px 12px',
              background: 'rgba(88, 166, 255, 0.08)',
              border: '1px solid rgba(88, 166, 255, 0.3)',
              borderRadius: '6px',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              color: '#58a6ff',
              transition: 'all 0.2s'
            }}>
              {method}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
