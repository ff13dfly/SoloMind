import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { callRpc } from '../../utils/rpc';
import { useServices } from '../../providers/ServicesProvider';
import { useUI } from '../../providers/UIProvider';
import { GenericList } from './GenericList';
import { EntityTabs } from './EntityTabs';
import { EntityHeader } from './EntityHeader';
import { EntityPagination } from './EntityPagination';
import { EntityEditModal } from './EntityEditModal';
import { prepareEntityForEditing, prepareEntityForCreation } from './EntityUtils';
import { RecycleBinModal } from './RecycleBinModal';
import { useEntityQuery } from './hooks/useEntityQuery';

interface GenericEntityPageProps {
  serviceId?: string;
}

export default function GenericEntityPage({ serviceId: propServiceId }: GenericEntityPageProps) {
  const { serviceId: paramServiceId } = useParams<{ serviceId: string }>();
  const location = useLocation();
  const queryClient = useQueryClient();
  
  // Robust serviceId detection: prop > param > path
  const pathServiceId = location.pathname.split('/')[1];
  const serviceId = propServiceId || paramServiceId || pathServiceId;
  
  const { services, loading: servicesLoading } = useServices();
  const { toast } = useUI();
  const service = services.find(s => s.id === serviceId);
  
  const [activeEntity, setActiveEntity] = useState<string>('');
  const [keywords, setKeywords] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const currentKeyword = keywords[activeEntity] || '';
  
  const { data: queryData, isLoading: dataLoading } = useEntityQuery({
    serviceId: serviceId || '',
    activeEntity,
    page,
    pageSize,
    keyword: currentKeyword
  });

  const data = queryData?.items || [];
  const total = queryData?.total || 0;

  const [editingData, setEditingData] = useState<any | null>(null);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [editContent, setEditContent] = useState<string>('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isRecycleBinOpen, setIsRecycleBinOpen] = useState(false);

  const entities = service?.entities || {};
  const entityNames = Object.keys(entities);
  const currentEntityDef = entities[activeEntity];

  useEffect(() => {
    if (entityNames.length > 0 && !activeEntity) {
      setActiveEntity(entityNames[0]);
    }
    setPage(1);
    setIsRecycleBinOpen(false);
  }, [serviceId, activeEntity]);

  const startEditing = (item: any) => {
    setIsCreateMode(false);
    setEditingData(item);
    const editableData = prepareEntityForEditing(item, currentEntityDef);
    setEditContent(JSON.stringify(editableData, null, 2));
    setSaveError(null);
  };

  const startCreating = () => {
    setIsCreateMode(true);
    const template = prepareEntityForCreation(currentEntityDef);
    setEditingData({}); // Truthy to open modal
    setEditContent(JSON.stringify(template, null, 2));
    setSaveError(null);
  };

  const handleSave = async () => {
    if (!serviceId || !activeEntity || !editingData) return;
    
    try {
      const parsed = JSON.parse(editContent);
      setSaveLoading(true);
      setSaveError(null);
      
      const method = isCreateMode ? 'create' : 'update';
      const payload = isCreateMode ? parsed : { id: editingData.id, ...parsed };

      await callRpc(`${serviceId}.${activeEntity}.${method}`, payload);
      
      setEditingData(null);
      queryClient.invalidateQueries({ queryKey: ['entities', serviceId, activeEntity] });
    } catch (err: any) {
      console.error("Save failed:", err);
      setSaveError(err.message || "Invalid JSON or Server Error");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleRemove = async (item: any) => {
    if (!serviceId || !activeEntity || !item.id) return;

    try {
      await callRpc(`${serviceId}.${activeEntity}.remove`, { id: item.id });
      queryClient.invalidateQueries({ queryKey: ['entities', serviceId, activeEntity] });
    } catch (err: any) {
      console.error("Delete failed:", err);
      toast.error(err.message || "Delete failed");
    }
  };

  if (servicesLoading) {
    return <div style={{ padding: '24px', color: '#64748b' }}>Loading service metadata...</div>;
  }

  if (!serviceId) {
    return <div style={{ padding: '24px', color: '#ef4444' }}>Error: No service identified.</div>;
  }

  if (!service) {
    return (
      <div style={{ padding: '24px', color: '#64748b' }}>
        Service "<strong>{serviceId}</strong>" not found in registry. 
        <br/><br/>
        <button onClick={() => window.location.reload()} className="service-btn">Retry Refresh</button>
      </div>
    );
  }

  if (entityNames.length === 0) {
    return (
      <div className="service-mgr-container">
        <div className="panel">
          <div className="panel-title">{serviceId?.toUpperCase()} MANAGEMENT</div>
          <div className="panel-content" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
            No entity definitions found for this service.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="service-mgr-container" style={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <EntityTabs 
        entityNames={entityNames} 
        activeEntity={activeEntity} 
        setActiveEntity={setActiveEntity} 
        serviceId={serviceId}
      />

      <div className="panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'visible' }}>
        <EntityHeader 
          serviceId={serviceId}
          activeEntity={activeEntity}
          currentKeyword={currentKeyword}
          onSearch={(val) => {
            setKeywords(prev => ({ ...prev, [activeEntity]: val }));
            setPage(1);
          }}
          onAdd={startCreating}
          dataLoading={dataLoading}
          onOpenRecycleBin={() => setIsRecycleBinOpen(true)}
        />
        
        <div className="panel-content" style={{ padding: 0, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'visible' }}>
          <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
            <GenericList 
              items={data} 
              entityDef={currentEntityDef} 
              onViewRaw={startEditing} 
              onDelete={handleRemove}
              serviceId={serviceId}
            />
          </div>
          
          <EntityPagination 
            page={page}
            pageSize={pageSize}
            total={total}
            dataLoading={dataLoading}
            onPageChange={setPage}
            description={currentEntityDef?.description}
          />
        </div>
      </div>

      <EntityEditModal 
        activeEntity={activeEntity}
        entityDef={currentEntityDef}
        editingData={editingData}
        editContent={editContent}
        setEditContent={setEditContent}
        saveLoading={saveLoading}
        saveError={saveError}
        onClose={() => setEditingData(null)}
        onSave={handleSave}
        mode={isCreateMode ? 'create' : 'edit'}
      />

      <RecycleBinModal 
        isOpen={isRecycleBinOpen}
        onClose={() => setIsRecycleBinOpen(false)}
        serviceId={serviceId || ''}
        activeEntity={activeEntity}
        onRestoreSuccess={() => queryClient.invalidateQueries({ queryKey: ['entities', serviceId, activeEntity] })}
      />
    </div>
  );
}
