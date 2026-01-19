import React from 'react';

interface EntityPopoverProps {
  entityName: string;
  def: {
    fields: Record<string, any>;
  };
}

export const EntityPopover: React.FC<EntityPopoverProps> = ({ entityName, def }) => {
  return (
    <div style={{
      position: 'absolute',
      top: 'calc(100% + 12px)',
      right: '0',
      width: '240px',
      background: '#0d1117',
      border: '1px solid #30363d',
      borderRadius: '8px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
      zIndex: 100,
      padding: '12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      animation: 'fadeInDown 0.2s ease-out'
    }} onClick={e => e.stopPropagation()}>
      {/* Arrow */}
      <div style={{
        position: 'absolute',
        top: '-6px',
        right: '20px',
        width: '10px',
        height: '10px',
        background: '#0d1117',
        borderLeft: '1px solid #30363d',
        borderTop: '1px solid #30363d',
        transform: 'rotate(45deg)'
      }}></div>

      <div style={{ fontSize: '12px', color: '#c9d1d9', fontWeight: 600, borderBottom: '1px solid #21262d', paddingBottom: '6px', marginBottom: '4px' }}>
        {entityName.toUpperCase()} FIELDS
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '300px', overflowY: 'auto' }}>
        {Object.entries(def.fields).map(([fname, fdef]: [string, any]) => (
          <div key={fname} style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            padding: '4px 8px',
            background: 'rgba(139, 148, 158, 0.05)',
            borderRadius: '4px',
            fontSize: '11px'
          }}>
            <span style={{ color: '#c9d1d9', fontFamily: 'var(--font-mono)' }}>{fname}</span>
            <span style={{ color: '#8b949e', fontSize: '10px' }}>{fdef.type}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
