import { callRpc } from '../utils/rpc';
import React, { useState, useEffect } from 'react';
import { useUI } from '../providers/UIProvider';

interface ServiceNode {
  id: string;
  url: string;
  status: 'active' | 'unknown' | 'error';
  lastSeen?: string;
  version?: string;
  methods?: any[];
  entities?: Record<string, { description: string, fields: Record<string, any> }>;
}

// ... imports
import { useLang } from '../providers/LanguageProvider';

export default function ServiceManagement() {
  const { toast, confirm } = useUI();
  const { t } = useLang();
  
  const [url, setUrl] = useState('');
  const [services, setServices] = useState<ServiceNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAutoDetect, setIsAutoDetect] = useState(false);
  const servicesRef = React.useRef(services);
  const checkIdxRef = React.useRef(0);
  
  servicesRef.current = services;

  const [selectedService, setSelectedService] = useState<ServiceNode | null>(null);

  useEffect(() => {
    let interval: any;
    if (isAutoDetect) {
        interval = setInterval(() => {
            const list = servicesRef.current;
            if (list.length === 0) return;
            const idx = checkIdxRef.current % list.length;
            const id = list[idx].id;
            checkStatus(id, true); // Silent check
            checkIdxRef.current++;
        }, 300);
    }
    return () => clearInterval(interval);
  }, [isAutoDetect]);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
        const list = await callRpc<ServiceNode[]>('system.list_services', {});
        setServices(list.map(s => ({
            ...s,
            lastSeen: s.lastSeen ? formatOnlyTime(new Date(s.lastSeen)) : undefined
        })));
    } catch (err: any) {
        console.error('Failed to fetch services:', err);
        toast.error(t('service.toast_fetch_fail'));
    }
  };


  const formatOnlyTime = (date: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    
    setLoading(true);
    
    try {
        // Call the router's system method
        const result = await callRpc<{ serviceName: string, methods: any[], version: string }>('system.add_service', { url });
        
        console.log('Service added:', result);
        toast.success(t('service.toast_add_success', { name: result.serviceName }));
        
        setServices(prev => [...prev, {
            id: result.serviceName, 
            url: url,
            status: 'active',
            lastSeen: formatOnlyTime(new Date()),
            version: result.version,
            methods: result.methods,
            entities: (result as any).entities || {}
        }]);
        setUrl('');
    } catch (err: any) {
        console.error('Failed to add service:', err);
        toast.error(err.message || t('service.toast_add_fail'));
    } finally {
        setLoading(false);
    }
  };

  const checkStatus = async (id: string, silent: boolean = false) => {
    try {
        const res = await callRpc<{ status: string, latency: number, error?: string }>('system.check_service_status', { serviceId: id });
        console.log('Status check:', res);
        setServices(prev => prev.map(s => {
            if (s.id === id) {
                return {
                    ...s,
                    status: (res.status === 'online' ? 'active' : 'error') as any, // Cast to match type if needed, or update interface
                    lastSeen: formatOnlyTime(new Date())
                };
            }
            return s;
        }));
        if (res.status === 'online') {
            if (!silent) toast.success(t('service.toast_online', { id, latency: res.latency }));
        } else {
            // Errors should probably still show toast? Or maybe not in auto mode to avoid spam?
            // Let's suppress error toast too and rely on table status for auto-mode.
            if (!silent) toast.error(t('service.toast_offline', { id }));
        }
    } catch (err) {
        if (!silent) toast.error(t('service.toast_check_fail', { id }));
        setServices(prev => prev.map(s => {
            if (s.id === id) {
                return { ...s, status: 'error', lastSeen: formatOnlyTime(new Date()) };
            }
            return s;
        }));
    }
  };
  
  const handleDelete = async (id: string) => {
      const isConfirmed = await confirm({
          message: t('service.confirm_remove', { id }),
          confirmLabel: t('service.confirm_remove_btn'),
          isDangerous: true
      });
      
      if (!isConfirmed) return;
      
      callRpc('system.remove_service', { serviceId: id })
        .then(() => {
            toast.success(t('service.toast_remove_success', { id }));
            setServices(prev => prev.filter(s => s.id !== id));
        })
        .catch(err => {
            console.error('Delete failed:', err);
            toast.error(t('service.toast_remove_fail', { msg: err.message }));
        });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(t('service.toast_copy_success'));
    }).catch(() => toast.error(t('service.toast_copy_fail')));
  };
  
  return (
    <div className="service-mgr-container">
      <div className="panel service-input-panel">
        <div className="panel-title">{t('service.register_title')}</div>
        <div className="panel-content">
            <form onSubmit={handleAdd} className="service-form">
                <div className="form-group row" style={{ gap: '12px' }}>
                    <label className="form-label service-label" style={{ marginBottom: 0 }}>{t('service.endpoint_label')}</label>
                    <input 
                        className="service-input"
                        type="text" 
                        value={url}
                        onChange={e => { setUrl(e.target.value); }}
                        placeholder={t('service.placeholder_url')}
                        disabled={loading}
                    />
                    <button type="submit" className="service-btn" disabled={loading} style={{ margin: 0 }}>
                        {loading ? t('service.adding_btn') : t('service.add_btn')}
                    </button>
                </div>
            </form>
        </div>
      </div>

      <div className="panel service-list-panel">
        <div className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{t('service.active_title')}</span>
            <button 
                className="service-btn" 
                style={{ 
                    margin: 0, 
                    padding: '2px 8px', 
                    fontSize: '12px',
                    background: isAutoDetect ? '#22c55e' : undefined,
                    borderColor: isAutoDetect ? '#22c55e' : undefined
                }}
                onClick={() => setIsAutoDetect(!isAutoDetect)}
            >
                {isAutoDetect ? t('service.auto_on') : t('service.auto_off')}
            </button>
        </div>
        <div className="service-list">
            <div className="service-header-row">
                <div className="col-idx">#</div>
                <div className="col-id">{t('service.col_id')}</div>
                <div className="col-url">{t('service.col_url')}</div>
                <div className="col-status">{t('service.col_status')}</div>
                <div className="col-version">{t('service.col_version')}</div>
                <div className="col-methods">{t('service.col_methods')}</div>
                <div className="col-seen">{t('service.col_last_seen')}</div>
                <div className="col-action">{t('service.col_action')}</div>
            </div>
            {services.map((svc, index) => (
                <div key={svc.id} className="service-row">
                    <div className="col-idx" style={{color: '#444'}}>#{index + 1}</div>
                    <div className="col-id">{svc.id}</div>
                    <div className="col-url" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: '0 1 auto' }} title={svc.url}>{svc.url}</span>
                        <button onClick={() => handleCopy(svc.url)} style={{ border: 'none', background: '#f1f5f9', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', cursor: 'pointer', color: '#64748b', flexShrink: 0 }}>{t('service.btn_copy')}</button>
                    </div>
                    <div className={`col-status status-${svc.status}`}>{t(`status.${svc.status}` as any) || svc.status.toUpperCase()}</div>
                    <div className="col-version">{svc.version || '-'}</div>

                    <div className="col-methods">
                         {svc.methods && svc.methods.length > 0 ? (
                             <span 
                               className="method-tag"
                               onClick={() => setSelectedService(svc)}
                             >
                               {svc.methods.length} {t('service.supported')}
                             </span>
                         ) : '-'}
                    </div>
                    <div className="col-seen">{svc.lastSeen}</div>
                    <div className="col-action">
                        <button className="service-btn" onClick={() => checkStatus(svc.id)}>{t('service.btn_check')}</button>
                        {svc.id !== 'administrator' && (
                            <button className="service-btn danger" onClick={() => handleDelete(svc.id)}>{t('service.btn_del')}</button>
                        )}
                    </div>
                </div>
            ))}
        </div>
      </div>
      
      {/* Modal */}
       {selectedService && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }} onClick={() => setSelectedService(null)}>
          <div 
            className="panel" 
            style={{ 
              width: '800px', 
              maxHeight: '80vh', 
              display: 'flex', 
              flexDirection: 'column',
              background: '#0d1117',
              border: '1px solid #30363d',
              boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
              borderRadius: '8px'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{t('service.modal_title')} {selectedService.id.toUpperCase()}</span>
              <button 
                onClick={() => setSelectedService(null)}
                style={{ border: 'none', background: 'transparent', color: '#8b949e', padding: 0, fontSize: '16px' }}
              >
                ×
              </button>
            </div>
            
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #30363d', display: 'flex', gap: '24px', fontSize: '12px' }}>
                <span style={{ color: '#8b949e' }}>URL: <span style={{ color: '#58a6ff' }}>{selectedService.url}</span></span>
                <span style={{ color: '#8b949e' }}>VERSION: <span style={{ color: '#c9d1d9' }}>{selectedService.version || '1.0.0'}</span></span>
            </div>

            <div className="panel-content" style={{ overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: '#30363d', padding: 0 }}>
              <div style={{ background: '#0d1117', padding: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#c9d1d9', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#58a6ff' }}></div>
                    RPC METHODS
                </div>
                <div className="popover-list">
                    {selectedService.methods?.map((m, i) => (
                    <div key={i} className="popover-item" style={{ marginBottom: '12px', borderBottom: '1px solid #21262d', paddingBottom: '8px' }}>
                        <span className="method-name" style={{ color: '#58a6ff', fontWeight: 500, display: 'block' }}>{m.name || m}</span>
                        {m.description && <span className="method-desc" style={{ fontSize: '11px', color: '#8b949e' }}>{m.description}</span>}
                        {m.params && m.params.length > 0 && (
                            <div style={{ marginTop: '4px', fontSize: '10px', color: '#6e7681' }}>
                            {t('service.params')} {m.params.map((p: any) => p.name).join(', ')}
                            </div>
                        )}
                    </div>
                    ))}
                </div>
              </div>

              <div style={{ background: '#0d1117', padding: '16px', borderLeft: '1px solid #30363d' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#c9d1d9', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff7b72' }}></div>
                    ENTITIES
                </div>
                <div className="popover-list">
                    {selectedService.entities && Object.keys(selectedService.entities).length > 0 ? (
                        Object.entries(selectedService.entities).map(([name, def]: [string, any]) => (
                            <div key={name} className="popover-item" style={{ marginBottom: '12px', borderBottom: '1px solid #21262d', paddingBottom: '8px' }}>
                                <span className="method-name" style={{ color: '#ff7b72', fontWeight: 500, display: 'block' }}>{name.toUpperCase()}</span>
                                {def.description && <span className="method-desc" style={{ fontSize: '11px', color: '#8b949e' }}>{def.description}</span>}
                                {def.fields && (
                                    <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                        {Object.entries(def.fields).map(([fname, fdef]: [string, any]) => (
                                            <span key={fname} style={{ fontSize: '9px', background: '#21262d', color: '#8b949e', padding: '1px 4px', borderRadius: '3px', border: '1px solid #30363d' }}>
                                                {fname}:{fdef.type}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div style={{ color: '#484f58', fontSize: '12px', fontStyle: 'italic' }}>No entities defined.</div>
                    )}
                </div>
              </div>
            </div>
            
            <div style={{ padding: '16px', borderTop: '1px solid #30363d', textAlign: 'right' }}>
               <button className="service-btn" onClick={() => setSelectedService(null)}>{t('service.modal_close')}</button>
            </div>
          </div>
        </div>
       )}

    </div>
  );
}
