import React from 'react';

interface Capability {
  method: string;
  description: string;
  params: any[];
  returns?: string[];
  ai?: boolean;
}

interface CapabilityCardProps {
  cap: Capability;
}

export const CapabilityCard: React.FC<CapabilityCardProps> = ({ cap }) => {
  return (
    <div className="cap-card" style={{
      background: 'var(--panel-bg)',
      border: '1px solid #30363d',
      borderRadius: '6px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      transition: 'all 0.2s',
      cursor: 'default',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {cap.ai ? (
            <span style={{ 
              fontSize: '10px', padding: '2px 6px', borderRadius: '4px', 
              background: 'rgba(46, 160, 67, 0.15)', color: '#3fb950', 
              border: '1px solid rgba(46, 160, 67, 0.4)', fontWeight: 600
            }}>AI</span>
          ) : (
            <span style={{ 
              fontSize: '10px', padding: '2px 6px', borderRadius: '4px', 
              background: 'rgba(248, 81, 73, 0.15)', color: '#f85149', 
              border: '1px solid rgba(248, 81, 73, 0.4)', fontWeight: 600
            }}>NO</span>
          )}
          <span style={{ 
            fontFamily: 'var(--font-mono)', color: '#58a6ff', 
            fontSize: '13px', fontWeight: 500, wordBreak: 'break-all'
          }}>
            {cap.method}
          </span>
        </div>
      </div>
      
      <div style={{ fontSize: '12px', color: '#8b949e', lineHeight: '1.4' }}>
        {cap.description}
      </div>

      {cap.params && cap.params.length > 0 && (
        <div style={{ marginTop: 'auto', paddingTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {cap.params.map((p: any, i: number) => (
            <span key={i} title={`${p.name}: ${p.type}`} style={{
              fontSize: '10px', padding: '2px 5px',
              background: 'rgba(127, 127, 127, 0.1)', borderRadius: '3px',
              color: '#8b949e', border: '1px solid rgba(127, 127, 127, 0.2)'
            }}>
              {p.name}<span style={{opacity:0.5}}>:</span>{p.type || 'any'}
            </span>
          ))}
        </div>
      )}

      {cap.returns && cap.returns.length > 0 && (
        <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
          <span style={{ fontSize: '9px', color: '#3fb950', opacity: 0.7, fontWeight: 600 }}>RET</span>
          {cap.returns.map((r: string, i: number) => (
            <span key={i} style={{
              fontSize: '10px', padding: '2px 5px',
              background: 'rgba(63, 185, 80, 0.1)', borderRadius: '3px',
              color: '#3fb950', border: '1px solid rgba(63, 185, 80, 0.2)',
              fontFamily: 'var(--font-mono)'
            }}>
              {r}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
