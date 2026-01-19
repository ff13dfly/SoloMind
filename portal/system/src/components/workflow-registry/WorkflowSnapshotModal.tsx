import { formatDate } from '../../utils/format';

interface Workflow {
  id: string;
  name: string;
  desc: string;
  tags: string[];
}

interface WorkflowSnapshotModalProps {
  loading: boolean;
  workflows: Workflow[];
  timestamp: number | null;
  onClose: () => void;
}

export default function WorkflowSnapshotModal({ 
  loading, 
  workflows, 
  timestamp, 
  onClose 
}: WorkflowSnapshotModalProps) {
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
            <span style={{ fontSize: '16px' }}>🧠</span>
            <span>AI CAPABILITY SNAPSHOT</span>
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
          {loading && <div style={{ padding: '40px', textAlign: 'center', opacity: 0.5 }}>Loading capability set...</div>}
          {!loading && workflows.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', opacity: 0.5 }}>No cached capabilities found. Try "BUILD & DEPLOY" first.</div>
          )}
          {!loading && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
              {workflows.map(wf => (
                <div 
                  key={wf.id} 
                  className="panel"
                  style={{ 
                    margin: 0, 
                    background: 'rgba(88, 166, 255, 0.05)', 
                    border: '1px solid rgba(88, 166, 255, 0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    padding: '12px',
                    transition: 'transform 0.2s',
                    cursor: 'default'
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <div style={{ fontWeight: 600, color: '#58a6ff', fontSize: '13px' }}>{wf.name}</div>
                  <div style={{ fontSize: '10px', opacity: 0.5, fontFamily: 'monospace' }}>ID: {wf.id}</div>
                  <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '4px' }}>
                     {wf.desc?.substring(0, 80)}{wf.desc?.length > 80 ? '...' : ''}
                  </div>
                  <div style={{ marginTop: 'auto', display: 'flex', flexWrap: 'wrap', gap: '4px', paddingTop: '8px' }}>
                     {wf.tags?.map((t: string) => (
                       <span key={t} style={{ fontSize: '9px', background: 'rgba(0,0,0,0.3)', padding: '2px 4px', borderRadius: '3px' }}>#{t}</span>
                     ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="panel-footer" style={{ borderTop: '1px solid #30363d', padding: '8px 16px', fontSize: '11px', opacity: 0.5, background: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'space-between' }}>
          <span>Showing workflows recognized by AI Agent.</span>
          {timestamp && <span>Last Built: {formatDate(timestamp)}</span>}
        </div>
      </div>
    </div>
  );
}
