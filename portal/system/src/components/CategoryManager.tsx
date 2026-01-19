import { useState, useEffect } from 'react';
import { callRpc } from '../utils/rpc';
import { useUI } from '../providers/UIProvider';
import { useLang } from '../providers/LanguageProvider';

interface CategoryItem {
  id: string;
  label: Record<string, string> | string;
  desc: string;
  parentId?: string;
  createdAt: number;
}

interface CategoryConfig {
  key: string;
  label: Record<string, string> | string;
  desc: string;
  items: CategoryItem[];
}

interface CategoryManagerProps {
  category: CategoryConfig;
  onClose: () => void;
  onUpdate: () => void;
  servicePrefix?: string; // Default: 'user'
}

export default function CategoryManager({ category, onClose, onUpdate, servicePrefix = 'user' }: CategoryManagerProps) {
  const { toast, confirm } = useUI();
  const { lang } = useLang();
  const [items, setItems] = useState<CategoryItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ labelZh: '', labelEn: '', desc: '' });
  const [loading, setLoading] = useState(false);
  const [workflowUsage, setWorkflowUsage] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchItems();
  }, [category.key]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const freshCat = await callRpc<CategoryConfig>(`${servicePrefix}.category.get`, { key: category.key });
      setItems(freshCat.items || []);
      
      // Fetch workflow usage if this is orchestrator category
      if (servicePrefix === 'orchestrator' && category.key === 'TYPE') {
        await fetchWorkflowUsage(freshCat.items || []);
      }
    } catch (e: any) {
      toast.error('Failed to load items: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkflowUsage = async (categoryItems: CategoryItem[]) => {
    try {
      const result = await callRpc<{ items: { category: string }[] }>('orchestrator.workflow.list', {});
      const workflows = result.items || [];
      const usage: Record<string, number> = {};
      
      categoryItems.forEach(item => {
        usage[item.id] = workflows.filter(wf => wf.category === item.id).length;
      });
      
      setWorkflowUsage(usage);
    } catch (e) {
      console.warn('Failed to fetch workflow usage', e);
    }
  };

  // Generate ID from name (lowercase, underscore)
  const generateId = (name: string) => {
    return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  };

  const handleCreate = async () => {
    if (!newItemName.trim()) return;
    
    const id = generateId(newItemName);
    if (items.some(i => i.id === id)) {
      toast.error('Item with this ID already exists');
      return;
    }

    try {
      await callRpc(`${servicePrefix}.category.item.add`, {
        key: category.key,
        id,
        label: { zh: newItemName, en: newItemName },
        desc: ''
      });
      setNewItemName('');
      await fetchItems();
      onUpdate();
      toast.success('Item created');
    } catch (e: any) {
      toast.error('Create failed: ' + e.message);
    }
  };

  const handleExpand = (item: CategoryItem) => {
    if (expandedId === item.id) {
      setExpandedId(null);
    } else {
      setExpandedId(item.id);
      const labelObj = typeof item.label === 'object' ? item.label : { zh: String(item.label), en: String(item.label) };
      setEditForm({
        labelZh: (labelObj as Record<string, string>).zh || '',
        labelEn: (labelObj as Record<string, string>).en || '',
        desc: item.desc || ''
      });
    }
  };

  const handleUpdate = async (itemId: string) => {
    try {
      await callRpc(`${servicePrefix}.category.item.update`, {
        key: category.key,
        id: itemId,
        label: { zh: editForm.labelZh, en: editForm.labelEn },
        desc: editForm.desc
      });
      setExpandedId(null);
      await fetchItems();
      onUpdate();
      toast.success('Item updated');
    } catch (e: any) {
      toast.error('Update failed: ' + e.message);
    }
  };

  const handleDelete = async (itemId: string) => {
    // Check if category is in use by workflows
    const usageCount = workflowUsage[itemId] || 0;
    if (usageCount > 0) {
      toast.error(`Cannot delete: ${usageCount} workflow(s) are using this category`);
      return;
    }

    const isConfirmed = await confirm({
      message: 'Delete this item?',
      confirmLabel: 'DELETE',
      isDangerous: true
    });
    if (!isConfirmed) return;

    try {
      await callRpc(`${servicePrefix}.category.item.remove`, {
        key: category.key,
        id: itemId
      });
      setExpandedId(null);
      await fetchItems();
      onUpdate();
      toast.success('Item deleted');
    } catch (e: any) {
      toast.error('Delete failed: ' + e.message);
    }
  };

  const getLabel = (item: CategoryItem) => {
    if (typeof item.label === 'object') {
      return (item.label as Record<string, string>)[lang] || (item.label as Record<string, string>).en || item.id;
    }
    return String(item.label);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
    }}>
      <div className="panel" style={{ width: '500px', height: '70vh', background: '#0d1117', border: '1px solid var(--accent-color)', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div className="panel-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>{category.key}</span>
          <button className="service-btn small" onClick={onClose}>×</button>
        </div>
        
        <div className="panel-content" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', padding: '16px' }}>
          {/* Create Section - Simple */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input 
              placeholder="New item name..."
              value={newItemName}
              onChange={e => setNewItemName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              style={{ 
                flex: 1, padding: '8px 12px', 
                background: '#1c2128', border: '1px solid #444', borderRadius: '4px',
                color: 'white', fontSize: '13px'
              }}
            />
            <button 
              className="service-btn" 
              onClick={handleCreate}
              disabled={!newItemName.trim()}
              style={{ borderColor: 'var(--success-color)', color: 'var(--success-color)' }}
            >
              CREATE
            </button>
          </div>

          {/* Items List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading && <div style={{ padding: '20px', textAlign: 'center', opacity: 0.5 }}>Loading...</div>}
            
            {!loading && items.map(item => (
              <div key={item.id} style={{ 
                marginBottom: '8px', 
                background: expandedId === item.id ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                borderRadius: '6px',
                border: expandedId === item.id ? '1px solid var(--accent-color)' : '1px solid transparent',
                transition: 'all 0.2s'
              }}>
                {/* Collapsed Row */}
                <div 
                  onClick={() => handleExpand(item)}
                  style={{ 
                    padding: '12px', cursor: 'pointer',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 500 }}>{getLabel(item)}</span>
                    <span style={{ marginLeft: '8px', opacity: 0.4, fontSize: '11px', fontFamily: 'monospace' }}>{item.id}</span>
                    {workflowUsage[item.id] > 0 && (
                      <span style={{ 
                        marginLeft: '8px', 
                        padding: '2px 6px', 
                        background: 'rgba(88, 166, 255, 0.2)', 
                        borderRadius: '10px', 
                        fontSize: '10px',
                        color: '#58a6ff'
                      }}>
                        {workflowUsage[item.id]} workflow{workflowUsage[item.id] > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <span style={{ opacity: 0.4, fontSize: '16px' }}>{expandedId === item.id ? '▲' : '▼'}</span>
                </div>

                {/* Expanded Edit Form */}
                {expandedId === item.id && (
                  <div style={{ padding: '0 12px 12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
                      <div>
                        <label style={{ fontSize: '10px', opacity: 0.5, display: 'block', marginBottom: '4px' }}>LABEL (中文)</label>
                        <input 
                          value={editForm.labelZh}
                          onChange={e => setEditForm(prev => ({ ...prev, labelZh: e.target.value }))}
                          style={{ 
                            width: '100%', padding: '6px', 
                            background: '#1c2128', border: '1px solid #444', borderRadius: '4px',
                            color: 'white', fontSize: '12px'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '10px', opacity: 0.5, display: 'block', marginBottom: '4px' }}>LABEL (English)</label>
                        <input 
                          value={editForm.labelEn}
                          onChange={e => setEditForm(prev => ({ ...prev, labelEn: e.target.value }))}
                          style={{ 
                            width: '100%', padding: '6px', 
                            background: '#1c2128', border: '1px solid #444', borderRadius: '4px',
                            color: 'white', fontSize: '12px'
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ marginTop: '8px' }}>
                      <label style={{ fontSize: '10px', opacity: 0.5, display: 'block', marginBottom: '4px' }}>DESCRIPTION</label>
                      <input 
                        value={editForm.desc}
                        onChange={e => setEditForm(prev => ({ ...prev, desc: e.target.value }))}
                        placeholder="Optional description for AI context..."
                        style={{ 
                          width: '100%', padding: '6px', 
                          background: '#1c2128', border: '1px solid #444', borderRadius: '4px',
                          color: 'white', fontSize: '12px'
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                      <button 
                        className="service-btn small danger"
                        onClick={() => handleDelete(item.id)}
                      >
                        DELETE
                      </button>
                      <button 
                        className="service-btn small"
                        onClick={() => handleUpdate(item.id)}
                        style={{ borderColor: 'var(--success-color)', color: 'var(--success-color)' }}
                      >
                        SAVE
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {!loading && items.length === 0 && (
              <div style={{ padding: '40px 20px', textAlign: 'center', opacity: 0.5 }}>
                No items yet. Create one above.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
