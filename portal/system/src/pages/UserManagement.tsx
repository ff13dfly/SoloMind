import { useState, useEffect } from 'react';
import { callRpc } from '../utils/rpc';
import { useLang } from '../providers/LanguageProvider';
import { useUI } from '../providers/UIProvider';
import { PERMIT_CONFIG } from '../config/permit';
import CategoryManager from '../components/CategoryManager';
import UserLogModal from '../components/user-management/UserLogModal';
import UserPermitModal from '../components/user-management/UserPermitModal';
import { formatDate } from '../utils/format';

interface UserDevice {
  last: string;
  token_prefix: string;
}

interface Permit {
  allow_all: boolean;
  services: Record<string, string[]>;
}

interface User {
  id: string;
  name: string;
  way: number;
  devices: Record<string, UserDevice>;
  create: string;
  last: string;
  categories?: Record<string, string>;
  permit?: Permit;
}

interface CategoryConfig {
  key: string;
  label: Record<string, string> | string;
  desc: string;
  items: CategoryItem[];
}

interface CategoryItem {
  id: string;
  label: Record<string, string> | string;
  desc: string;
  parentId?: string;
  createdAt: number;
}

interface RPCMethod {
  name: string;
  description?: string;
  params?: any[];
  returns?: any;
}

interface ServiceInfo {
  id: string;
  url: string;
  methods: RPCMethod[];
}

export default function UserManagement() {
  const { t, lang } = useLang();
  const { toast } = useUI();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isServiceError, setIsServiceError] = useState(false);
  const [serviceUrl, setServiceUrl] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(50); // Will be updated by server response
  const [searchKeyword, setSearchKeyword] = useState('');
  
  const RPC_METHOD = 'user.list';
  
  // Category State
  const [categories, setCategories] = useState<CategoryConfig[]>([]);
  const [categoryMap, setCategoryMap] = useState<Record<string, CategoryItem[]>>({});
  
  // Role Editing State
  const [editingUser, setEditingUser] = useState<string | null>(null);

  // Category Modal State
  const [showCatModal, setShowCatModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryConfig | null>(null);

  const [showPermitModal, setShowPermitModal] = useState(false);
  const [selectedUserPermit, setSelectedUserPermit] = useState<{ id: string; name: string; permit: Permit | null } | null>(null);
  const [availableServices, setAvailableServices] = useState<ServiceInfo[]>([]);

  // Log Modal State
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedLogUser, setSelectedLogUser] = useState<{ id: string; name: string } | null>(null);

  const fetchUsers = async (keywordOverride?: string) => {
    setLoading(true);
    setError('');
    setIsServiceError(false);
    setServiceUrl('');
    try {
      // Use override if provided, otherwise state (explicit check for string type to avoid event objects)
      const queryKeyword = typeof keywordOverride === 'string' ? keywordOverride : searchKeyword;
      const result = await callRpc<{ users: User[], total: number, pageSize: number }>(RPC_METHOD, { page, keyword: queryKeyword });
      // Sort by creation time desc
      const sortedUsers = result.users.sort((a, b) => new Date(b.create).getTime() - new Date(a.create).getTime());
      
      setUsers(sortedUsers);
      setTotal(result.total);
      if (result.pageSize) {
        setPageSize(result.pageSize);
      }
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
      const msg = err.message || 'Failed to load users';
      setError(msg);
      if (msg.includes('Method not found') || msg.includes('not registered')) {
        setIsServiceError(true);
        // Static URL lookup removed in favor of dynamic discovery
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      // The API might return an array or an object wrapping the array
      const result = await callRpc<CategoryConfig[] | { categories: CategoryConfig[] }>('user.category.list', {});
      
      let catList: CategoryConfig[] = [];
      if (Array.isArray(result)) {
          catList = result;
      } else if (result && 'categories' in result && Array.isArray(result.categories)) {
          catList = result.categories;
      }

      setCategories(catList);
      
      // Build category items map keyed by category key
      const map: Record<string, CategoryItem[]> = {};
      
      for (const cat of catList) {
        if (cat.items && Array.isArray(cat.items)) {
           map[cat.key] = cat.items;
        }
      }
      setCategoryMap(map);
      
    } catch (e) {
      console.warn('Failed to load categories', e);
    }
  };

  const fetchAvailableServices = async () => {
    try {
        const result = await callRpc<ServiceInfo[]>('system.list_services', {});
        // Filter out restricted services
        const filtered = result.filter(s => !PERMIT_CONFIG.restrictedServices.includes(s.id));
        setAvailableServices(filtered);
    } catch (e) {
        console.warn('Failed to load available services', e);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchCategories();
    fetchAvailableServices();
  }, [page]);

  const handleRoleChange = async (uid: string, newRole: string) => {
      try {
          await callRpc('user.update', {
              uid,
              categories: { role: newRole }
          });
          // Optimistic update
          setUsers(prev => prev.map(u => {
              if (u.id === uid) {
                  return {
                      ...u,
                      categories: { ...(u.categories || {}), role: newRole }
                  };
              }
              return u;
          }));
          setEditingUser(null);
      } catch (err: any) {
          toast.error('Failed to update role: ' + err.message);
      }
  };

  // --- Category Management ---

  const openCategoryModal = (cat: CategoryConfig) => {
      setSelectedCategory(cat);
      setShowCatModal(true);
  };

  const handleLogClick = (user: User) => {
      setSelectedLogUser({ id: user.id, name: user.name });
      setShowLogModal(true);
  };

  // --- Render Helpers ---

  const totalPages = Math.ceil(total / pageSize);

  // Helper to get label in current language
  const getItemLabel = (item: CategoryItem): string => {
      if (typeof item.label === 'object') {
          return (item.label as Record<string, string>)[lang] || (item.label as Record<string, string>).en || item.id;
      }
      return String(item.label);
  };

  const renderRoleCell = (user: User) => {
      const currentRole = user.categories?.role || 'normal';
      // Category keys are stored uppercase per protocol
      const roleItems = categoryMap['ROLE'] || [];
      
      const isEditing = editingUser === user.id;

      // Only allow editing if we have options
      if (roleItems.length === 0) return <span>{currentRole}</span>;
      
      // Find current item for label display
      const currentItem = roleItems.find(i => i.id === currentRole);
      const currentLabel = currentItem ? getItemLabel(currentItem) : currentRole;

      return (
          <div 
            onClick={(e) => {
                 e.stopPropagation();
                 setEditingUser(user.id);
            }}
            style={{ cursor: 'pointer', position: 'relative' }}
          >
              {isEditing ? (
                  <select 
                    autoFocus
                    value={currentRole}
                    onChange={(e) => {
                        handleRoleChange(user.id, e.target.value);
                    }}
                    onBlur={() => setEditingUser(null)}
                    onClick={(e) => e.stopPropagation()}
                    style={{ fontSize: '11px', padding: '2px', borderRadius: '4px', border: '1px solid #ccc' }}
                  >
                      {roleItems.map((item) => (
                          <option key={item.id} value={item.id}>{getItemLabel(item)}</option>
                      ))}
                  </select>
              ) : (
                 <span style={{ 
                    borderBottom: '1px dashed #ccc',
                    color: currentRole === 'operator' ? 'var(--accent-color)' : 'inherit'
                 }}>
                     {currentLabel}
                 </span>
              )}
          </div>
      );
  };

  return (
    <div className="panel service-list-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span>{t('user.title')}</span>
            
            {/* Category Management Buttons */}
            <div style={{ display: 'flex', gap: '8px' }}>
                {categories.map(cat => (
                    <button 
                        key={cat.key} 
                        className="service-btn small" 
                        onClick={() => openCategoryModal(cat)}
                        style={{ fontSize: '10px', height: '24px', lineHeight: '22px', padding: '0 8px', opacity: 0.8 }}
                    >
                        {cat.key}
                    </button>
                ))}
            </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
             <div className="search-box" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input 
                    type="text" 
                    placeholder={t('user.search_placeholder') || 'Search users (Enter)'}
                    value={searchKeyword}
                    onChange={(e) => {
                        const val = e.target.value;
                        setSearchKeyword(val);
                        if (val === '') fetchUsers('');
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                    style={{
                        padding: '6px 12px 6px 30px', /* Left padding for icon */
                        fontSize: '13px',
                        borderRadius: '20px',
                        border: '1px solid var(--border-color, #e1e4e8)',
                        background: 'var(--bg-secondary, #f6f8fa)',
                        minWidth: '220px',
                        outline: 'none',
                        transition: 'all 0.2s',
                        color: '#1f2937' // Force dark text for visibility on light background
                    }}
                    onFocus={(e) => e.target.style.background = 'var(--bg-primary, #fff)'}
                    onBlur={(e) => e.target.style.background = 'var(--bg-secondary, #f6f8fa)'}
                />
                {/* Search Icon (Absolute Left) */}
                <span style={{ position: 'absolute', left: '10px', opacity: 0.5, fontSize: '12px' }}>🔍</span>
                
                {/* Clear Button (Absolute Right) */}
                {searchKeyword && (
                    <button 
                        onClick={() => { setSearchKeyword(''); fetchUsers(''); }}
                        style={{
                            position: 'absolute',
                            right: '8px',
                            background: '#ccc',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '10px',
                            opacity: 0.6,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            color: '#fff',
                            padding: 0
                        }}
                    >
                        ✕
                    </button>
                )}
             </div>
             
             <span className="log-stat" style={{ minWidth: '100px', display: 'inline-block', fontSize: '11px', textAlign: 'right' }}>{t('user.total_page', { total, page: pageSize })}</span>
            <button className="service-btn small" onClick={() => { fetchUsers(); fetchCategories(); }} disabled={loading} style={{ minWidth: '60px', textAlign: 'center' }}>
            {t('user.refresh')}
            </button>
        </div>
      </div>
      
      <div className="panel-content" style={{ padding: 0, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {error && (
          <div style={{ padding: '16px', background: isServiceError ? 'rgba(234, 88, 12, 0.1)' : 'transparent' }}>
            <div style={{ color: '#e74c3c', marginBottom: isServiceError ? '8px' : 0 }}>Error: {error}</div>
            {isServiceError && serviceUrl && (
              <div style={{ 
                padding: '12px', 
                background: 'rgba(234, 88, 12, 0.15)', 
                borderRadius: '6px',
                border: '1px solid rgba(234, 88, 12, 0.3)',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <span style={{ color: '#ea580c' }}>⚠️ 服务未注册，请在 <strong style={{ color: '#58a6ff' }}>Service Registry</strong> 添加:</span>
                <code style={{ background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '3px', color: '#fff' }}>{serviceUrl}</code>
                <button 
                  className="service-btn small"
                  style={{ padding: '2px 8px', fontSize: '11px' }}
                  onClick={() => { navigator.clipboard.writeText(serviceUrl); toast.success('已复制'); }}
                >
                  COPY
                </button>
              </div>
            )}
          </div>
        )}
        
        {/* Adjusted grid template for new column order */}
        <div className="service-header-row" style={{ gridTemplateColumns: '1.5fr 0.5fr 1.5fr 0.8fr 2fr 1fr 1.5fr 1.5fr' }}>
          <div>{t('user.col_uid')}</div>
          <div>LOG</div> 
          <div>{t('user.col_categories') || '分类'}</div>
          <div>PERMIT</div>
          <div>{t('user.col_name')}</div>
          <div>{t('user.col_devices')}</div>
          <div>{t('user.col_created')}</div>
          <div>{t('user.col_active')}</div>
        </div>

        <div className="service-list-container" style={{ flex: 1, overflowY: 'auto' }}>
          {users.map(user => (
            <div key={user.id} className="service-row" style={{ gridTemplateColumns: '1.5fr 0.5fr 1.5fr 0.8fr 2fr 1fr 1.5fr 1.5fr' }}>
              <div style={{ fontFamily: 'monospace', fontSize: '11px', opacity: 0.8 }} title={user.id}>{user.id}</div>
              
              {/* Log Button Column */}
              <div>
                  <button 
                    className="service-btn small"
                    onClick={() => handleLogClick(user)}
                    style={{ fontSize: '10px', padding: '2px 8px', height: '20px' }}
                  >
                    LOG
                  </button>
              </div>
              
              <div style={{ fontSize: '11px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {/* Role Selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ opacity: 0.5 }}>Role:</span>
                        {renderRoleCell(user)}
                    </div>
                    {/* Other Categories */}
                    {user.categories && Object.keys(user.categories).length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {Object.entries(user.categories)
                           .filter(([k]) => k !== 'role')
                           .map(([k, v]) => {
                             const items = categoryMap[k.toUpperCase()] || [];
                             const item = items.find(i => i.id === v);
                             const label = item ? getItemLabel(item) : v;
                             return (
                          <span key={k} style={{ 
                            background: 'rgba(0,0,0,0.05)', 
                            padding: '2px 6px', 
                            borderRadius: '4px',
                            fontSize: '10px'
                          }}>
                            {k}:{label}
                          </span>
                             );
                        })}
                      </div>
                    )}
                </div>
              </div>

              {/* Permit Check Button */}
              <div>
                <button 
                  className="service-btn small"
                  onClick={() => {
                    setSelectedUserPermit({ id: user.id, name: user.name, permit: JSON.parse(JSON.stringify(user.permit || { allow_all: false, services: {} })) });
                    setShowPermitModal(true);
                  }}
                  style={{ fontSize: '10px', padding: '2px 8px' }}
                >
                  EDIT
                </button>
              </div>

              <div style={{ fontWeight: 500, color: 'var(--text-color)' }}>{user.name}</div>
              <div>
                <span className="method-tag" title={Object.keys(user.devices || {}).join(', ')}>
                    {t('user.device_active', { count: Object.keys(user.devices || {}).length })}
                </span>
              </div>
              <div style={{ fontSize: '11px', opacity: 0.6 }}>{formatDate(user.create)}</div>
              <div style={{ fontSize: '11px', color: 'var(--accent-color)' }}>{formatDate(user.last)}</div>
            </div>
          ))}
          
          {!loading && users.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', opacity: 0.5 }}>{t('user.empty')}</div>
          )}
        </div>

        <div className="log-footer">
            <div className="pagination">
                <button 
                    className="service-btn" 
                    disabled={page <= 1 || loading} 
                    onClick={() => setPage(page - 1)}
                >
                    {t('user.prev')}
                </button>
                <span className="page-info">{t('user.page_info', { page, total: totalPages || 1 })}</span>
                <button 
                    className="service-btn" 
                    disabled={page >= totalPages || loading} 
                    onClick={() => setPage(page + 1)}
                >
                    {t('user.next')}
                </button>

            </div>
        </div>
      </div>

      {/* Category Management Modal */}
      {showCatModal && selectedCategory && (
        <CategoryManager 
            category={selectedCategory} 
            onClose={() => setShowCatModal(false)} 
            onUpdate={fetchCategories}
        />
      )}

      {/* Permit Modal */}
      {showPermitModal && selectedUserPermit && (
        <UserPermitModal 
          userId={selectedUserPermit.id}
          userName={selectedUserPermit.name}
          initialPermit={selectedUserPermit.permit}
          availableServices={availableServices}
          onClose={() => setShowPermitModal(false)}
          onSaveSuccess={(updatedPermit) => {
            setUsers(prev => prev.map(u => 
              u.id === selectedUserPermit.id ? { ...u, permit: updatedPermit } : u
            ));
          }}
        />
      )}

      {/* Log View Modal */}
      {showLogModal && selectedLogUser && (
        <UserLogModal 
            userId={selectedLogUser.id} 
            userName={selectedLogUser.name} 
            onClose={() => setShowLogModal(false)} 
        />
      )}
    </div>
  );
}
