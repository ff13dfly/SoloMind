import React from 'react';

interface WorkflowIOSectionProps {
  onImport?: () => void;
  onExport?: () => void;
}

const WorkflowIOSection: React.FC<WorkflowIOSectionProps> = ({ onImport, onExport }) => {
  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <button 
        className="service-btn small" 
        onClick={onImport}
        style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
        title="Import from Redis"
      >
        IMPORT
      </button>
      <button 
        className="service-btn small" 
        onClick={onExport}
        style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
        title="Export to Redis"
      >
        EXPORT
      </button>
      <div style={{ width: '1px', height: '14px', background: 'rgba(255, 255, 255, 0.1)', margin: '0 4px' }}></div>
    </div>
  );
};

export default WorkflowIOSection;
