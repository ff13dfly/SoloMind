import { useState, useEffect } from 'react';
import { callRpc } from '../../utils/rpc';
import { useUI } from '../../providers/UIProvider';

interface CategoryItem {
  id: string;
  label: Record<string, string>;
  parentId: string | null;
  desc?: string;
}

interface Category {
  key: string;
  owner: string;
  scope: string;
  type: string;
  status: string;
  desc?: string;
  items?: CategoryItem[];
}

interface CategoryManagerProps {
  serviceId: string;
}

export function CategoryManager({ serviceId }: CategoryManagerProps) {
  const { toast } = useUI();
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingItems, setEditingItems] = useState<CategoryItem[]>([]);

  // Form states
  const [newKey, setNewKey] = useState('');
  const [newDesc, setNewDesc] = useState('');
  
  // Item Edit states
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [itemEditForm, setItemEditForm] = useState({ zh: '', en: '', desc: '' });
  const [newItemName, setNewItemName] = useState('');

  const fetchCategories = async () => {
    try {
      const res = await callRpc<any>(`${serviceId}.category.list`, {});
      setCategories(Array.isArray(res) ? res : res.items || []);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [serviceId]);

  const handleCreate = async () => {
    if (!newKey) return;
    try {
      await callRpc(`${serviceId}.category.create`, {
        key: newKey.toUpperCase(),
        desc: newDesc,
        type: 'TREE',
        scope: 'GLOBAL'
      });
      setShowCreateModal(false);
      setNewKey('');
      setNewDesc('');
      fetchCategories();
    } catch (err: any) {
      toast.error(`Create failed: ${err.message}`);
    }
  };

  const handleEditCategory = async (cat: Category) => {
    setEditingCategory(cat);
    try {
      const res = await callRpc<any>(`${serviceId}.category.get`, { key: cat.key });
      setEditingItems(res.items || []);
    } catch (err) {
      console.error('Failed to get items:', err);
      setEditingItems([]);
    }
  };

  const handleAddItem = async () => {
    if (!editingCategory || !newItemName.trim()) return;
    
    try {
      const id = newItemName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      await callRpc(`${serviceId}.category.item.add`, {
        key: editingCategory.key,
        id,
        label: { zh: newItemName, en: newItemName },
        desc: ''
      });
      setNewItemName('');
      handleEditCategory(editingCategory);
    } catch (err: any) {
      toast.error(`Add failed: ${err.message}`);
    }
  };

  const handleUpdateItem = async (itemId: string) => {
    if (!editingCategory) return;
    try {
      await callRpc(`${serviceId}.category.item.update`, {
        key: editingCategory.key,
        id: itemId,
        label: { zh: itemEditForm.zh, en: itemEditForm.en },
        desc: itemEditForm.desc
      });
      setExpandedItemId(null);
      handleEditCategory(editingCategory);
    } catch (err: any) {
      toast.error(`Update failed: ${err.message}`);
    }
  };

  const toggleExpand = (item: CategoryItem) => {
    if (expandedItemId === item.id) {
      setExpandedItemId(null);
    } else {
      setExpandedItemId(item.id);
      setItemEditForm({
        zh: item.label?.zh || '',
        en: item.label?.en || '',
        desc: item.desc || ''
      });
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!editingCategory) return;
    try {
      await callRpc(`${serviceId}.category.item.remove`, {
        key: editingCategory.key,
        itemId
      });
      handleEditCategory(editingCategory);
    } catch (err: any) {
      toast.error(`Remove failed: ${err.message}`);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 20px' }}>
      <span style={{ 
        fontSize: '11px', 
        fontWeight: 700, 
        color: '#94a3b8', 
        letterSpacing: '0.05em',
        background: '#f1f5f9',
        padding: '2px 8px',
        borderRadius: '4px',
        marginRight: '4px'
      }}>
        CATEGORIES
      </span>

      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
        {categories.map(cat => (
          <button
            key={cat.key}
            onClick={() => handleEditCategory(cat)}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              fontSize: '12px',
              color: '#1e293b',
              cursor: 'pointer',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            onMouseOver={e => {
              e.currentTarget.style.borderColor = 'var(--accent-color)';
              e.currentTarget.style.color = 'var(--accent-color)';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.color = '#1e293b';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
            }}
          >
            <span style={{ opacity: 0.5 }}>#</span>
            {cat.key}
          </button>
        ))}

        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: '6px 14px',
            borderRadius: '20px',
            border: '1px solid var(--accent-color)',
            background: 'rgba(59, 130, 246, 0.05)',
            color: 'var(--accent-color)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            fontWeight: 600,
            transition: 'all 0.2s'
          }}
          onMouseOver={e => {
            e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
            e.currentTarget.style.transform = 'scale(1.02)';
          }}
          onMouseOut={e => {
            e.currentTarget.style.background = 'rgba(59, 130, 246, 0.05)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span>
          <span>Add</span>
        </button>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: '400px' }}>
            <div className="modal-header">
              <h3>Create Category</h3>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <div className="modal-content" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Category Key (Upper Case)</label>
                <input 
                  type="text" 
                  value={newKey} 
                  onChange={e => setNewKey(e.target.value)} 
                  placeholder="e.g. INDUSTRY, ROLE"
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Description</label>
                <textarea 
                  value={newDesc} 
                  onChange={e => setNewDesc(e.target.value)} 
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #e2e8f0', height: '80px' }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="service-btn" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button className="service-btn" style={{ background: 'var(--accent-color)', color: 'white' }} onClick={handleCreate}>Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Items Modal */}
      {editingCategory && (
        <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={() => setEditingCategory(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: '500px', height: '70vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <h3>Edit Category: {editingCategory.key}</h3>
              <button className="close-btn" onClick={() => setEditingCategory(null)}>×</button>
            </div>
            <div className="modal-content" style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    placeholder="New item name..." 
                    value={newItemName}
                    onChange={e => setNewItemName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddItem()}
                    style={{ 
                      flex: 1, 
                      padding: '8px 12px', 
                      borderRadius: '6px', 
                      border: '1px solid #e2e8f0',
                      fontSize: '13px'
                    }}
                  />
                  <button 
                    className="service-btn" 
                    onClick={handleAddItem}
                    disabled={!newItemName.trim()}
                    style={{ 
                      background: newItemName.trim() ? 'var(--accent-color)' : '#f1f5f9', 
                      color: newItemName.trim() ? 'white' : '#94a3b8',
                      borderColor: newItemName.trim() ? 'var(--accent-color)' : '#e2e8f0'
                    }}
                  >
                    + Add Item
                  </button>
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {editingItems.length === 0 && <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>No items defined</div>}
                {editingItems.map(item => (
                  <div key={item.id} style={{ 
                    background: expandedItemId === item.id ? 'rgba(59, 130, 246, 0.05)' : '#f8fafc',
                    borderRadius: '8px',
                    border: expandedItemId === item.id ? '1px solid var(--accent-color)' : '1px solid #f1f5f9',
                    overflow: 'hidden',
                    transition: 'all 0.2s'
                  }}>
                    <div 
                      onClick={() => toggleExpand(item)}
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '10px 14px', 
                        cursor: 'pointer'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13px' }}>{item.label?.zh || item.id}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{item.id}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '12px', opacity: 0.5 }}>{expandedItemId === item.id ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    {expandedItemId === item.id && (
                      <div style={{ padding: '14px', borderTop: '1px solid #f1f5f9', background: '#fff' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Label (ZH)</label>
                            <input 
                              type="text" 
                              value={itemEditForm.zh} 
                              onChange={e => setItemEditForm(prev => ({ ...prev, zh: e.target.value }))}
                              style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Label (EN)</label>
                            <input 
                              type="text" 
                              value={itemEditForm.en} 
                              onChange={e => setItemEditForm(prev => ({ ...prev, en: e.target.value }))}
                              style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                            />
                          </div>
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                          <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Description</label>
                          <textarea 
                            value={itemEditForm.desc} 
                            onChange={e => setItemEditForm(prev => ({ ...prev, desc: e.target.value }))}
                            style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '12px', height: '60px' }}
                          />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <button 
                            onClick={() => handleRemoveItem(item.id)}
                            style={{ color: '#ef4444', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                          >
                            Delete Item
                          </button>
                          <button 
                            onClick={() => handleUpdateItem(item.id)}
                            className="service-btn small"
                            style={{ background: 'var(--accent-color)', color: 'white' }}
                          >
                            Save Changes
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
