
interface EntityPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  dataLoading: boolean;
  onPageChange: (page: number) => void;
  description?: string;
}

export function EntityPagination({
  page,
  pageSize,
  total,
  dataLoading,
  onPageChange,
  description
}: EntityPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div style={{ 
      padding: '16px 24px', 
      borderTop: '1px solid var(--border-color)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      background: '#f8fafc',
      flexShrink: 0,
      gap: '20px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
        <button 
          className="service-btn"
          style={{ 
            padding: '6px 20px',
            fontSize: '12px',
            borderRadius: '20px',
            background: '#eff6ff',
            color: '#2563eb',
            border: '1px solid #dbeafe',
            fontWeight: 600,
            transition: 'all 0.2s'
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
          Export
        </button>
        
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', color: '#64748b', userSelect: 'none' }}>
          <input type="checkbox" style={{ margin: 0, width: '14px', height: '14px', cursor: 'pointer' }} />
          <span>Export All</span>
        </label>
      </div>

      {description && (
        <div style={{ 
          fontSize: '11px', 
          color: '#94a3b8', 
          fontWeight: 400, 
          textAlign: 'center', 
          flex: 1.5,
          opacity: 0.8
        }}>
          {description}
        </div>
      )}

      <div style={{ display: 'flex', gap: '16px', flex: 1.5, justifyContent: 'flex-end', alignItems: 'center' }}>
        <div style={{ fontSize: '11px', color: '#94a3b8', marginRight: '8px' }}>
          {total > 0 ? (
            <>{(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} / {total}</>
          ) : (
            <>No data</>
          )}
        </div>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button 
            className="service-btn" 
            disabled={page === 1 || dataLoading}
            onClick={() => {
              onPageChange(page - 1);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            style={{ 
              padding: '4px 12px',
              fontSize: '12px',
              opacity: page === 1 ? 0.5 : 1,
              borderRadius: '6px'
            }}
          >
            Prev
          </button>
          <div style={{ padding: '0 8px', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>
            {page} / {totalPages}
          </div>
          <button 
            className="service-btn" 
            disabled={page >= totalPages || dataLoading || total === 0}
            onClick={() => {
              onPageChange(page + 1);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            style={{ 
              padding: '4px 12px',
              fontSize: '12px',
              opacity: (page >= totalPages || total === 0) ? 0.5 : 1,
              borderRadius: '6px'
            }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
