import { callRpc } from '../../utils/rpc';
import { useUI } from '../../providers/UIProvider';
import { useState, useEffect } from 'react';

interface RecycleBinModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceId: string;
  activeEntity: string;
  onRestoreSuccess: () => void;
}

export function RecycleBinModal({
  isOpen,
  onClose,
  serviceId,
  activeEntity,
  onRestoreSuccess
}: RecycleBinModalProps) {
  const { toast } = useUI();
  const [items, setItems] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsFetching(true);
      fetchDeletedItems();
    }
  }, [isOpen, serviceId, activeEntity]);

  const fetchDeletedItems = async () => {
    try {
      const res = await callRpc<{ items: any[] }>(`${serviceId}.${activeEntity}.list`, {
        includeDeleted: true,
        limit: 100,
        offset: 0
      });
      const deleted = (res.items || []).filter((item: any) => item.status === 'DELETED');
      
      // Check destroyable status for each item
      const enrichedItems = await Promise.all(deleted.map(async (item: any) => {
        try {
          const check = await callRpc<{ canDestroy: boolean, reason?: string, count?: number }>(`${serviceId}.${activeEntity}.checkDestroyable`, { id: item.id });
          return { ...item, canDestroy: check.canDestroy, destroyReason: check.reason, dependencyCount: check.count || 0 };
        } catch (e) {
          console.warn(`Failed to check destroyable for ${item.id}`, e);
          return { ...item, canDestroy: false, destroyReason: 'Failed to verify dependencies', dependencyCount: 0 };
        }
      }));

      setItems(enrichedItems);
    } catch (err) {
      console.error('Failed to fetch deleted items:', err);
      toast.error('Failed to load recycle bin items');
    } finally {
      setIsFetching(false);
    }
  };

  const handleRestore = async (id: string) => {
    setIsProcessing(true);
    try {
      await callRpc(`${serviceId}.${activeEntity}.restore`, { id });
      toast.success('Restored successfully');
      await fetchDeletedItems();
      onRestoreSuccess();
    } catch (err: any) {
      console.error('Failed to restore item:', err);
      toast.error(err.message || 'Restoration failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDestroy = async (id: string) => {
    if (!confirm('Are you sure you want to PERMANENTLY delete this item? This action cannot be undone.')) return;
    
    setIsProcessing(true);
    try {
      await callRpc(`${serviceId}.${activeEntity}.destroy`, { id });
      toast.success('Permanently deleted');
      await fetchDeletedItems();
    } catch (err: any) {
      console.error('Failed to destroy item:', err);
      toast.error(err.message || 'Hard delete failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setItems([]); 
    setIsFetching(true);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999,
        backdropFilter: 'blur(4px)'
      }}
      onClick={handleClose}
    >
      <div 
        className="panel"
        style={{ 
          width: '1100px', 
          height: '85vh',
          minHeight: '600px',
          display: 'flex', 
          flexDirection: 'column', 
          background: '#ffffff', 
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          borderRadius: '12px',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>🗑️</span>
            <span>RECYCLE BIN / {activeEntity.toUpperCase()}</span>
          </div>
          <button 
            className="service-btn small"
            onClick={handleClose}
            style={{ fontSize: '18px', padding: '0 8px', border: 'none', background: 'transparent' }}
          >
            ×
          </button>
        </div>
        
        <div className="panel-content" style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {!isFetching && items.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Recycle bin is empty</div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' }}>
            {items.map(item => (
              <div 
                key={item.id} 
                className="panel"
                style={{ 
                  margin: 0, 
                  padding: '16px', 
                  background: '#f8fafc', 
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '14px', marginBottom: '4px' }}>
                    {item.name || item.title || item.username || 'Unnamed'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>ID: {item.id}</div>
                </div>
                
                {item.deletedAt && (
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                    Deleted: {new Date(item.deletedAt).toLocaleString()}
                  </div>
                )}

                {!item.canDestroy && (
                  <div style={{ 
                    fontSize: '11px', 
                    color: '#b91c1c', 
                    background: '#fef2f2', 
                    padding: '8px', 
                    borderRadius: '4px',
                    border: '1px solid #fee2e2',
                    marginTop: '4px',
                    fontWeight: 500
                  }}>
                    ⚠️ {item.dependencyCount > 0 ? `有 ${item.dependencyCount} 个关联数据` : (item.destroyReason || '被引用中，无法删除')}
                  </div>
                )}
                
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button 
                    className={`service-btn ${!item.canDestroy ? 'disabled' : ''}`}
                    onClick={() => item.canDestroy && handleDestroy(item.id)}
                    disabled={!item.canDestroy || isProcessing}
                    title={item.canDestroy ? 'Permanently Delete' : item.destroyReason || 'Cannot delete due to dependencies'}
                    style={{ 
                      fontSize: '12px', 
                      borderColor: item.canDestroy ? '#ef4444' : '#e2e8f0', 
                      color: item.canDestroy ? '#dc2626' : '#94a3b8', 
                      background: item.canDestroy ? '#fef2f2' : '#f1f5f9',
                      cursor: item.canDestroy ? 'pointer' : 'not-allowed',
                      opacity: item.canDestroy ? 1 : 0.6
                    }}
                  >
                    DELETE
                  </button>
                  <button 
                    className="service-btn" 
                    onClick={() => handleRestore(item.id)}
                    disabled={isProcessing}
                    style={{ fontSize: '12px', borderColor: '#10b981', color: '#059669', background: '#ecfdf5' }}
                  >
                    RESTORE
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="panel-footer" style={{ borderTop: '1px solid #e2e8f0', background: '#f8fafc', padding: '12px 24px', fontSize: '12px', color: '#64748b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '44px' }}>
          {(isFetching || isProcessing) ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#3b82f6', fontWeight: 500 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                <style>{`.spinner_S1_S{animation:spinner_S1 1.2s linear infinite;animation-delay:.1s}.spinner_S1_S2{animation-delay:.3s}.spinner_S1_S3{animation-delay:.5s}@keyframes spinner_S1{0%{opacity:1}100%{opacity:0}}`}</style>
                <circle className="spinner_S1_S" cx="12" cy="12" r="3" />
                <circle className="spinner_S1_S spinner_S1_S2" cx="12" cy="12" r="3" transform="rotate(45 12 12)" />
                <circle className="spinner_S1_S spinner_S1_S3" cx="12" cy="12" r="3" transform="rotate(90 12 12)" />
              </svg>
              <span>{isFetching ? 'Loading items...' : 'Processing...'}</span>
            </div>
          ) : (
            <div>Restoring an item will move it back to the active list.</div>
          )}
        </div>
      </div>
    </div>
  );
}
