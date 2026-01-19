import { useUI } from '../../providers/UIProvider';

interface WorkflowRawJsonModalProps {
  workflow: any;
  onClose: () => void;
}

export default function WorkflowRawJsonModal({ 
  workflow, 
  onClose 
}: WorkflowRawJsonModalProps) {
  const { toast } = useUI();

  const handleExport = () => {
    const dataStr = JSON.stringify(workflow, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workflow.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Exported!');
  };

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
        style={{ width: '700px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', background: '#0d1117', border: '1px solid #30363d' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              className="service-btn small"
              onClick={handleExport}
            >
              EXPORT
            </button>
            <span>RAW :: {workflow.id}</span>
          </div>
          <button 
            className="service-btn small"
            onClick={onClose}
            style={{ padding: '2px 8px', fontSize: '14px' }}
          >
            ×
          </button>
        </div>
        <div className="panel-content" style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
          <pre style={{ 
            margin: 0, 
            fontSize: '11px', 
            fontFamily: 'monospace', 
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            color: '#8b949e'
          }}>
            {JSON.stringify(workflow, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
