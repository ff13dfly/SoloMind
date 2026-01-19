import { useState, useEffect } from 'react';
import { callRpc } from '../utils/rpc';
import { useLang } from '../providers/LanguageProvider';
import { useUI } from '../providers/UIProvider';
import CategoryManager from '../components/CategoryManager';
import WorkflowDetailModal from '../components/workflow-registry/WorkflowDetailModal';
import WorkflowIOSection from '../components/workflow-registry/WorkflowIOSection';
import WorkflowSnapshotModal from '../components/workflow-registry/WorkflowSnapshotModal';
import WorkflowRecycleBinModal from '../components/workflow-registry/WorkflowRecycleBinModal';
import WorkflowRawJsonModal from '../components/workflow-registry/WorkflowRawJsonModal';
import { formatDate } from '../utils/format';

interface WorkflowStep {
  id: string;
  service: string;
  method: string;
  params: Record<string, any>;
}

interface Workflow {
  id: string;
  name: string;
  desc: string;
  category: Record<string, string> | string;
  priority: number;
  status: string;
  steps: WorkflowStep[];
  tags: string[];
  examples?: string[];
  negative?: string[];
  synonyms?: Record<string, string[]>;
  createdAt: number;
  updatedAt: number;
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

export default function WorkflowManagement() {
  const { } = useLang(); // Language context available
  const { toast, confirm } = useUI();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isServiceError, setIsServiceError] = useState(false);
  const [serviceUrl, setServiceUrl] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [showRecycleBin, setShowRecycleBin] = useState(false);
  const [deletedWorkflows, setDeletedWorkflows] = useState<Workflow[]>([]);
  const [deletedLoading, setDeletedLoading] = useState(false);
  const [showSnapshot, setShowSnapshot] = useState(false);
  const [snapshotWorkflows, setSnapshotWorkflows] = useState<any[]>([]);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshotTimestamp, setSnapshotTimestamp] = useState<number | null>(null);
  
  // Category State
  const [categories, setCategories] = useState<CategoryConfig[]>([]);
  const [showCatModal, setShowCatModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryConfig | null>(null);
  const [rawJsonWorkflow, setRawJsonWorkflow] = useState<Workflow | null>(null);
  const [lastActiveId, setLastActiveId] = useState<string | null>(null);

  const RPC_METHOD = 'orchestrator.workflow.list';

  const fetchWorkflows = async () => {
    setLoading(true);
    setError('');
    setIsServiceError(false);
    setServiceUrl('');
    try {
      const result = await callRpc<{ items: Workflow[], total: number, limit: number }>(RPC_METHOD, { 
        includeDeleted: false,
        limit: pageSize,
        offset: (page - 1) * pageSize
      });
      setWorkflows(result.items || []);
      setTotal(result.total || 0);
      if (result.limit) setPageSize(result.limit);
      return result.items || [];
    } catch (err: any) {
      console.error('Failed to fetch workflows:', err);
      const msg = err.message || 'Failed to load workflows';
      setError(msg);
      // Detect service registration error
      if (msg.includes('Method not found') || msg.includes('not registered')) {
        setIsServiceError(true);
        // Static URL lookup removed
      }
      return [];
    } finally {
      setLoading(false);
    }
  };
  
  const fetchDeletedWorkflows = async () => {
    setDeletedLoading(true);
    try {
      const result = await callRpc<{ items: Workflow[] }>(RPC_METHOD, { 
        includeDeleted: true,
        limit: 100, // Just get last 100 deleted
        offset: 0
      });
      setDeletedWorkflows((result.items || []).filter(w => w.status === 'DELETED'));
    } catch (err) {
      console.error('Failed to fetch deleted workflows:', err);
    } finally {
      setDeletedLoading(false);
    }
  };

  const fetchSnapshot = async () => {
    setSnapshotLoading(true);
    try {
      const result = await callRpc<{ items: any[], timestamp: number }>('orchestrator.workflow.getSnapshot', {});
      setSnapshotWorkflows(result.items || []);
      setSnapshotTimestamp(result.timestamp);
    } catch (err) {
      console.error('Failed to fetch snapshot:', err);
      toast.error('Failed to fetch AI snapshot');
    } finally {
      setSnapshotLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const result = await callRpc<CategoryConfig[] | { categories: CategoryConfig[] }>('orchestrator.category.list', {});
      let catList: CategoryConfig[] = [];
      if (Array.isArray(result)) {
        catList = result;
      } else if (result && 'categories' in result && Array.isArray(result.categories)) {
        catList = result.categories;
      }
      setCategories(catList);
    } catch (e) {
      console.warn('Failed to load categories', e);
    }
  };

  const openCategoryModal = (cat: CategoryConfig) => {
    setSelectedCategory(cat);
    setShowCatModal(true);
  };

  useEffect(() => {
    fetchWorkflows();
    fetchCategories();
  }, [page]);

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      message: `Delete workflow "${id}"?`,
      confirmLabel: 'DELETE',
      isDangerous: true
    });
    if (!isConfirmed) return;

    try {
      await callRpc('orchestrator.workflow.delete', { id });
      toast.success('Workflow deleted');
      await fetchWorkflows();
    } catch (e: any) {
      toast.error('Delete failed: ' + e.message);
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await callRpc('orchestrator.workflow.restore', { id });
      toast.success('Workflow restored');
      await fetchWorkflows();
    } catch (e: any) {
      toast.error('Restore failed: ' + e.message);
    }
  };


  const totalPages = Math.ceil(total / pageSize);

  const openWorkflowDetail = (wf: Workflow) => {
    setSelectedWorkflow(wf);
    setLastActiveId(wf.id);
  };

  const handleBuild = async () => {
    setLoading(true);
    try {
      const result = await callRpc<{ success: boolean, count: number }>('orchestrator.workflow.build', {});
      if (result.success) {
        toast.success(`Successfully built ${result.count} workflows to AI snapshot`);
      } else {
        toast.error('Build failed');
      }
    } catch (e: any) {
      toast.error('Build failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  };


  const handleCreate = () => {
    setSelectedWorkflow({
      id: '',
      name: '',
      desc: '',
      category: {},
      priority: 0,
      status: 'ACTIVE',
      steps: [],
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      resolvers: {},
      keywords: [],
      prompts: []
    } as any); // Type cast as we are mocking a new object
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      // Fetch all workflows (limit 1000 should cover current usage)
      const res = await callRpc<{ items: Workflow[] }>('orchestrator.workflow.list', { limit: 1000, includeDeleted: false });
      
      // Filter out metadata fields for clean export
      const cleanItems = res.items.map(({ id, status, createdAt, updatedAt, ...rest }) => rest);
      
      const dataStr = JSON.stringify(cleanItems, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `workflow_backup_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`Exported ${res.items.length} workflows`);
    } catch (e: any) {
      toast.error('Export failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const items = JSON.parse(content);
          if (!Array.isArray(items)) throw new Error('Invalid format: root must be array');

          if (!await confirm({ 
            title: 'Import Workflows', 
            message: `Import ${items.length} workflows? Existing IDs will be skipped/overwritten based on logic.` 
          })) return;

          setLoading(true);
          let successCount = 0;
          let failCount = 0;

          for (const item of items) {
            try {
              // Try to create first (cleanest for restoration)
              // If it exists, we could try update, or just skip. 
              // For now, let's try create, if it fails with ALREADY_EXISTS, we try Update.
              try {
                // Ensure critical fields
                if (!item.name || !item.steps) continue;
                await callRpc('orchestrator.workflow.create', item);
                successCount++;
              } catch (createErr: any) {
                if (createErr.message.includes('ALREADY_EXISTS') || createErr.message.includes('WORKFLOW_ALREADY_EXISTS')) {
                  // Fallback to update
                  try {
                    await callRpc('orchestrator.workflow.update', item);
                    successCount++;
                  } catch (updateErr) {
                    throw updateErr;
                  }
                } else {
                  throw createErr;
                }
              }
            } catch (err) {
              console.error(`Failed to import ${item.id}:`, err);
              failCount++;
            }
          }

          toast.success(`Import complete: ${successCount} imported, ${failCount} failed`);
          fetchWorkflows(); // Refresh list
        } catch (err: any) {
          toast.error('Import parsing failed: ' + err.message);
        } finally {
          setLoading(false);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="panel service-list-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span>WORKFLOW REGISTRY</span>
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
        <div style={{ 
          display: 'flex', 
          gap: '16px', 
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.03)',
          padding: '4px 12px',
          borderRadius: '6px',
          border: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
          <button className="service-btn small" onClick={handleCreate}>
            + ADD
          </button>
          <button className="service-btn small" onClick={handleBuild} disabled={loading} style={{ borderColor: '#f1e05a', color: '#f1e05a' }}>
            BUILD & DEPLOY
          </button>
          <div style={{ width: '1px', height: '16px', background: 'rgba(255, 255, 255, 0.1)' }}></div>
          <button 
            className="service-btn small" 
            onClick={() => { setShowSnapshot(true); fetchSnapshot(); }}
            style={{ fontSize: '16px', padding: '0 8px', border: 'none', background: 'transparent' }}
            title="AI Capability Snapshot"
          >
            🕸️
          </button>
          <button 
            className="service-btn small" 
            onClick={() => { setShowRecycleBin(true); fetchDeletedWorkflows(); }}
            style={{ fontSize: '16px', padding: '0 8px', border: 'none', background: 'transparent' }}
            title="Recycle Bin"
          >
            🗑️
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
        
        <div className="service-header-row" style={{ gridTemplateColumns: '50px 2fr 0.6fr 0.5fr 0.5fr 0.5fr 0.5fr 1fr 1fr 80px', fontSize: '11px' }}>
          <div>RAW</div>
          {/* ID column removed */}
          <div>NAME</div>
          <div>PRIORITY</div>
          <div>POS</div>
          <div>NEG</div>
          <div>SYN</div>
          <div>STEPS</div>
          <div>CATEGORY</div>
          <div>UPDATED</div>
          <div>ACTION</div>
        </div>

        <div className="service-list-container" style={{ flex: 1, overflowY: 'auto' }}>
          {loading && <div style={{ padding: '20px', textAlign: 'center', opacity: 0.5 }}>Loading...</div>}
          
          {!loading && workflows.map(wf => (
            <div key={wf.id}>
              <div 
                className="service-row" 
                style={{ 
                  gridTemplateColumns: '50px 2fr 0.6fr 0.5fr 0.5fr 0.5fr 0.5fr 1fr 1fr 80px',
                  opacity: wf.status === 'DELETED' ? 0.5 : 1,
                  background: wf.id === lastActiveId ? 'rgba(88, 166, 255, 0.1)' : undefined,
                  borderLeft: wf.id === lastActiveId ? '2px solid #58a6ff' : '2px solid transparent'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <button 
                    className="service-btn small"
                    onClick={(e) => { e.stopPropagation(); setRawJsonWorkflow(wf); }}
                    style={{ fontSize: '10px', padding: '2px 6px' }}
                  >
                    RAW
                  </button>
                </div>
                {/* ID column removed */}
                <div 
                  onClick={() => openWorkflowDetail(wf)}
                  style={{ cursor: 'pointer' }}
                  className="workflow-name-cell"
                >
                  <div style={{ fontWeight: 600, color: '#58a6ff', textDecoration: 'none' }} className="hover-underline">{wf.name}</div>
                  <div style={{ fontSize: '10px', opacity: 0.6 }}>{wf.desc?.substring(0, 50)}{wf.desc?.length > 50 ? '...' : ''}</div>
                </div>
                <div style={{ fontSize: '11px' }}>{wf.priority}</div>
                <div style={{ fontSize: '11px', color: '#7ee787' }}>{wf.examples?.length || 0}</div>
                <div style={{ fontSize: '11px', color: '#ff7b72' }}>{wf.negative?.length || 0}</div>
                <div style={{ fontSize: '11px', color: '#a5d6ff' }}>{Object.keys(wf.synonyms || {}).length}</div>
                <div style={{ fontSize: '11px' }}>{wf.steps?.length || 0}</div>
                <div>
                  <span className="method-tag">{typeof wf.category === 'object' ? JSON.stringify(wf.category) : wf.category}</span>
                </div>
                <div style={{ fontSize: '11px', opacity: 0.6 }}>{formatDate(wf.updatedAt)}</div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button 
                    className="service-btn small danger"
                    onClick={(e) => { e.stopPropagation(); handleDelete(wf.id); }}
                  >
                    DEL
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {!loading && workflows.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', opacity: 0.5 }}>
              No workflows found.
            </div>
          )}
        </div>

        <div className="log-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <WorkflowIOSection 
            onImport={handleImport} 
            onExport={handleExport} 
          />
          <div className="pagination">
            <button 
              className="service-btn" 
              disabled={page <= 1 || loading} 
              onClick={() => setPage(page - 1)}
            >
              PREV
            </button>
            <span className="page-info">PAGE {page} OF {totalPages || 1} (TOTAL: {total})</span>
            <button 
              className="service-btn" 
              disabled={page >= totalPages || loading} 
              onClick={() => setPage(page + 1)}
            >
              NEXT
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
          servicePrefix="orchestrator"
        />
      )}

      {/* Workflow Detail Modal */}
      {selectedWorkflow && (
        <WorkflowDetailModal
          workflow={selectedWorkflow}
          onClose={() => setSelectedWorkflow(null)}
          onUpdate={async () => {
            const updatedList = await fetchWorkflows();
            if (rawJsonWorkflow) { 
               // Also refresh raw view if open
               const fresh = updatedList.find(w => w.id === rawJsonWorkflow.id);
               if (fresh) setRawJsonWorkflow(fresh);
            }
            // Refresh selected workflow data in place (keep modal open)
            if (selectedWorkflow) {
                const fresh = updatedList.find(w => w.id === selectedWorkflow.id);
                if (fresh) setSelectedWorkflow(fresh);
            }
          }}
        />
      )}

      {/* RAW JSON Modal */}
      {rawJsonWorkflow && (
        <WorkflowRawJsonModal 
          workflow={rawJsonWorkflow}
          onClose={() => setRawJsonWorkflow(null)}
        />
      )}

      {/* Recycle Bin Modal */}
      {showRecycleBin && (
        <WorkflowRecycleBinModal 
          loading={deletedLoading}
          workflows={deletedWorkflows}
          onClose={() => setShowRecycleBin(false)}
          onRestore={handleRestore}
          onRefresh={fetchDeletedWorkflows}
        />
      )}

      {/* Snapshot Modal */}
      {showSnapshot && (
        <WorkflowSnapshotModal 
          loading={snapshotLoading}
          workflows={snapshotWorkflows}
          timestamp={snapshotTimestamp}
          onClose={() => setShowSnapshot(false)}
        />
      )}
    </div>
  );
}
