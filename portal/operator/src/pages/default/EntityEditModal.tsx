import { useState } from 'react';
import { EntityForm } from './EntityForm';
import type { EntityDefinition } from '../../providers/ServicesProvider';

interface EntityEditModalProps {
  activeEntity: string;
  editingData: any;
  editContent: string;
  setEditContent: (val: string) => void;
  saveLoading: boolean;
  saveError: string | null;
  onClose: () => void;
  onSave: () => void;
  mode?: 'edit' | 'create';
  entityDef: EntityDefinition;
}

export function EntityEditModal({
  activeEntity,
  editingData,
  editContent,
  setEditContent,
  saveLoading,
  saveError,
  onClose,
  onSave,
  mode = 'edit',
  entityDef
}: EntityEditModalProps) {
  const [tab, setTab] = useState<'visual' | 'raw'>('visual');
  const [localError, setLocalError] = useState<string | null>(null);

  if (!editingData && mode === 'edit') return null;
  if (mode === 'create' && !editingData) return null;

  const isCreate = mode === 'create';

  const handleFormChange = (data: any) => {
    try {
      setEditContent(JSON.stringify(data, null, 2));
      setLocalError(null);
    } catch (err) {
      setLocalError("Form data synchronization failed");
    }
  };

  const getFormData = () => {
    try {
      return JSON.parse(editContent);
    } catch (err) {
      return {};
    }
  };

  return (
    <div className="modal-overlay" onClick={() => !saveLoading && onClose()}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: '900px', height: '85vh', display: 'flex', flexDirection: 'column', borderRadius: '16px' }}>
        <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#1e293b', fontWeight: 700 }}>
              {isCreate ? 'Add New' : 'Edit'} {activeEntity}
            </h3>
            <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '8px', gap: '4px' }}>
              <button 
                onClick={() => setTab('visual')}
                style={{ 
                  padding: '6px 16px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: 600,
                  background: tab === 'visual' ? 'white' : 'transparent',
                  color: tab === 'visual' ? 'var(--accent-color)' : '#64748b',
                  boxShadow: tab === 'visual' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  cursor: 'pointer'
                }}
              >
                VISUAL FORM
              </button>
              <button 
                onClick={() => setTab('raw')}
                style={{ 
                  padding: '6px 16px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: 600,
                  background: tab === 'raw' ? 'white' : 'transparent',
                  color: tab === 'raw' ? 'var(--accent-color)' : '#64748b',
                  boxShadow: tab === 'raw' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  cursor: 'pointer'
                }}
              >
                RAW JSON
              </button>
            </div>
          </div>
          <button onClick={onClose} disabled={saveLoading} style={{ fontSize: '24px', border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}>×</button>
        </div>
        
        <div className="modal-content" style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', background: '#ffffff' }}>
          {tab === 'visual' ? (
            <div style={{ padding: '4px' }}>
              <EntityForm 
                entityDef={entityDef} 
                formData={getFormData()} 
                onChange={handleFormChange}
                onSubmit={onSave}
                disabled={saveLoading}
              />
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '400px' }}>
              <textarea 
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                spellCheck={false}
                style={{ 
                  flex: 1, height: '100%', width: '100%', background: '#0f172a', color: '#38bdf8', padding: '20px', borderRadius: '12px',
                  fontSize: '13px', fontFamily: '"Fira Code", monospace', lineHeight: '1.6', border: 'none', resize: 'none', outline: 'none'
                }}
              />
            </div>
          )}

          {(saveError || localError) && (
            <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#b91c1c', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', display: 'flex', gap: '8px' }}>
              ⚠️ <strong>Error:</strong> {saveError || localError}
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ borderTop: '1px solid #f1f5f9', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>
            {!isCreate && <span>ID: <code>{editingData.id}</code></span>}
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="service-btn" onClick={onClose} disabled={saveLoading} style={{ background: 'white', border: '1px solid #e2e8f0', color: '#475569', padding: '10px 24px', borderRadius: '8px' }}>
              Cancel
            </button>
            <button className="service-btn" onClick={onSave} disabled={saveLoading} style={{ background: 'var(--accent-color)', color: 'white', border: 'none', padding: '10px 32px', borderRadius: '8px', fontWeight: 600 }}>
              {saveLoading ? 'Syncing...' : isCreate ? `Create ${activeEntity}` : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
