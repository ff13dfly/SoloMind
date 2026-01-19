

interface EntityHeaderProps {
  serviceId: string;
  activeEntity: string;
  currentKeyword: string;
  onSearch: (val: string) => void;
  onAdd: () => void;
  dataLoading: boolean;
  onOpenRecycleBin: () => void;
}

export function EntityHeader({
  serviceId,
  activeEntity,
  currentKeyword,
  onSearch,
  onAdd,
  dataLoading,
  onOpenRecycleBin
}: EntityHeaderProps) {
  return (
    <div className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
        <span style={{ whiteSpace: 'nowrap' }}>{serviceId?.toUpperCase()} / {activeEntity.toUpperCase()}</span>
        
        {/* Search Box */}
        <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
          <input 
            type="text"
            placeholder={`Search ${activeEntity}...`}
            value={currentKeyword}
            onChange={(e) => onSearch(e.target.value)}
            style={{
              width: '100%',
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              borderRadius: '20px',
              padding: '6px 16px 6px 36px',
              fontSize: '13px',
              color: '#1e293b',
              outline: 'none',
              transition: 'all 0.2s ease'
            }}
            onFocus={(e) => e.target.style.background = '#ffffff'}
            onBlur={(e) => e.target.style.background = '#f1f5f9'}
          />
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}>🔍</span>
          {currentKeyword && (
            <button 
              onClick={() => onSearch('')}
              style={{ 
                position: 'absolute', 
                right: '12px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                background: 'transparent', 
                border: 'none', 
                cursor: 'pointer',
                fontSize: '14px',
                color: '#94a3b8'
              }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
        <button 
          className="service-btn" 
          onClick={onAdd} 
          disabled={dataLoading}
          style={{ 
            background: '#eff6ff', 
            color: '#2563eb', 
            border: '1px solid #dbeafe',
            padding: '6px 20px',
            fontSize: '12px',
            fontWeight: 600,
            borderRadius: '20px',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
          onMouseOver={e => {
            e.currentTarget.style.background = '#dbeafe';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseOut={e => {
            e.currentTarget.style.background = '#eff6ff';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <span style={{ fontSize: '16px', lineHeight: 1, marginTop: '-1px' }}>+</span>
          Add
        </button>
        <button 
          onClick={onOpenRecycleBin}
          style={{ 
            fontSize: '16px', 
            padding: '4px 12px', 
            border: '1px solid #e2e8f0',
            background: '#ffffff', 
            cursor: 'pointer',
            borderRadius: '20px',
            color: '#64748b',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '32px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}
          onMouseOver={e => {
            e.currentTarget.style.borderColor = 'var(--accent-color)';
            e.currentTarget.style.color = 'var(--accent-color)';
            e.currentTarget.style.background = 'var(--accent-surface)';
          }}
          onMouseOut={e => {
            e.currentTarget.style.borderColor = '#e2e8f0';
            e.currentTarget.style.color = '#64748b';
            e.currentTarget.style.background = '#ffffff';
          }}
          title="Recycle Bin"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}
