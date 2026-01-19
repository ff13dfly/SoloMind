import { formatDate } from '../../utils/format';

interface Workflow {
  id: string;
  name: string;
  updatedAt: number;
}

interface WorkflowRecycleBinModalProps {
  loading: boolean;
  workflows: Workflow[];
  onClose: () => void;
  onRestore: (id: string) => Promise<void>;
  onRefresh: () => void;
}

export default function WorkflowRecycleBinModal({ 
  loading, 
  workflows, 
  onClose, 
  onRestore,
  onRefresh
}: WorkflowRecycleBinModalProps) {
  return (
    <div 
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
      }}
      onClick={onClose}
    >
      <div 
        className="panel"
        style={{ width: '800px', height: '600px', display: 'flex', flexDirection: 'column', background: '#0d1117', border: '1px solid #30363d' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #30363d' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             <span style={{ fontSize: '16px' }}>🗑️</span>
             <span>RECYCLE BIN</span>
          </div>
          <button 
            className="service-btn small"
            onClick={onClose}
            style={{ padding: '2px 8px', fontSize: '14px' }}
          >
            ×
          </button>
        </div>
        <div className="panel-content" style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {loading && <div style={{ padding: '40px', textAlign: 'center', opacity: 0.5 }}>Loading...</div>}
          {!loading && workflows.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', opacity: 0.5 }}>Recycle bin is empty</div>
          )}
          {!loading && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
              {workflows.map(wf => (
                <div 
                  key={wf.id} 
                  className="panel"
                  style={{ 
                    margin: 0, 
                    background: 'rgba(255,255,255,0.03)', 
                    border: '1px solid #30363d',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    padding: '12px',
                    transition: 'transform 0.2s',
                    cursor: 'default'
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: 600, color: '#58a6ff', fontSize: '13px', wordBreak: 'break-all' }}>{wf.name}</div>
                  </div>
                  <div style={{ fontSize: '10px', opacity: 0.5, fontFamily: 'monospace' }}>ID: {wf.id}</div>
                  <div style={{ fontSize: '10px', marginTop: 'auto', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                     <span style={{ opacity: 0.6 }}>Deleted: {formatDate(wf.updatedAt)}</span>
                  </div>
                  <div style={{ borderTop: '1px solid #30363d', paddingTop: '8px', marginTop: '4px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button 
                      className="service-btn small"
                      onClick={async () => {
                         await onRestore(wf.id);
                         onRefresh();
                      }}
                      style={{ borderColor: '#238636', color: '#3fb950', fontSize: '11px' }}
                    >
                      RESTORE
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="panel-footer" style={{ borderTop: '1px solid #30363d', padding: '8px 16px', fontSize: '11px', opacity: 0.5, background: 'rgba(0,0,0,0.2)' }}>
          Items in recycle bin can be restored to the registry.
        </div>
      </div>
    </div>
  );
}
