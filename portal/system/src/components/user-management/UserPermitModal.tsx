import { useState } from 'react';
import { callRpc } from '../../utils/rpc';
import { useLang } from '../../providers/LanguageProvider';
import { useUI } from '../../providers/UIProvider';
import { PERMIT_CONFIG } from '../../config/permit';



interface Permit {
  allow_all: boolean;
  services: Record<string, string[]>;
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

interface UserPermitModalProps {
  userId: string;
  userName: string;
  initialPermit: Permit | null;
  availableServices: ServiceInfo[];
  onClose: () => void;
  onSaveSuccess: (updatedPermit: Permit) => void;
}

export default function UserPermitModal({ 
  userId, 
  userName, 
  initialPermit, 
  availableServices, 
  onClose, 
  onSaveSuccess 
}: UserPermitModalProps) {
  const { lang } = useLang();
  const { toast } = useUI();
  const [permit, setPermit] = useState<Permit>(initialPermit || { allow_all: false, services: {} });
  const [isSaving, setIsSaving] = useState(false);

  const groupMethodsByPrefix = (methods: RPCMethod[], serviceId: string) => {
    const groups: Record<string, RPCMethod[]> = {};
    methods.forEach(m => {
      const relativeName = m.name.startsWith(`${serviceId}.`) 
        ? m.name.substring(serviceId.length + 1) 
        : m.name;
      const parts = relativeName.split('.');
      if (parts.length > 1) {
        const groupName = parts[0];
        if (!groups[groupName]) groups[groupName] = [];
        groups[groupName].push(m);
      }
    });
    return groups;
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await callRpc('user.permit.update', {
        uid: userId,
        permit: permit
      });
      toast.success('Permissions saved successfully');
      onSaveSuccess(permit);
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save permissions');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-secondary, #1c2128)',
          borderRadius: '8px',
          padding: '24px',
          width: '650px',
          height: '600px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px' }}>Edit Permissions: {userName}</h3>
            <div style={{ fontSize: '11px', opacity: 0.5, fontFamily: 'monospace' }}>{userId}</div>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', opacity: 0.6 }}
          >
            ✕
          </button>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
          {/* Global Admin Toggle */}
          <div style={{ 
            padding: '12px', 
            background: permit.allow_all ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255,255,255,0.03)',
            borderRadius: '6px',
            marginBottom: '20px',
            border: '1px solid',
            borderColor: permit.allow_all ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '13px' }}>Administrator Access</div>
              <div style={{ fontSize: '11px', opacity: 0.6 }}>Grant skip-all permissions for this user (allow_all)</div>
            </div>
            <div 
              onClick={() => setPermit(prev => ({ ...prev, allow_all: !prev.allow_all }))}
              style={{
                width: '44px',
                height: '22px',
                background: permit.allow_all ? '#22c55e' : '#4b5563',
                borderRadius: '11px',
                position: 'relative',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
            >
              <div style={{
                width: '18px',
                height: '18px',
                background: '#fff',
                borderRadius: '50%',
                position: 'absolute',
                top: '2px',
                left: permit.allow_all ? '24px' : '2px',
                transition: 'left 0.2s'
              }} />
            </div>
          </div>

          {!permit.allow_all && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontWeight: 600, opacity: 0.8, fontSize: '13px' }}>Service Permissions:</div>
                <select 
                  className="service-btn"
                  style={{ fontSize: '11px', padding: '4px 8px', height: 'auto', background: 'var(--accent-color)', border: 'none', color: '#fff' }}
                  value=""
                  onChange={(e) => {
                    const svcId = e.target.value;
                    if (!svcId) return;
                    setPermit(prev => ({
                      ...prev,
                      services: { ...prev.services, [svcId]: ['*'] }
                    }));
                  }}
                >
                  <option value="">+ ADD SERVICE</option>
                  {availableServices
                    .filter(s => !permit.services[s.id])
                    .map(s => (
                      <option key={s.id} value={s.id}>{s.id}</option>
                    ))
                  }
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Object.entries(permit.services || {})
                .filter(([serviceId]) => !PERMIT_CONFIG.restrictedServices.includes(serviceId))
                .map(([serviceId, allowedMethods]) => {
                  const serviceInfo = availableServices.find(s => s.id === serviceId);
                  const isAll = allowedMethods.includes('*');

                  return (
                    <div key={serviceId} style={{ 
                      padding: '16px', 
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.06)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        height: '24px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                          <div style={{ 
                            fontWeight: 800, 
                            color: 'var(--accent-color)', 
                            textTransform: 'uppercase', 
                            fontSize: '13px',
                            letterSpacing: '0.5px'
                          }}>{serviceId}</div>
                          
                          <label style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px', 
                            cursor: 'pointer',
                            userSelect: 'none',
                            opacity: isAll ? 1 : 0.6,
                            color: isAll ? '#58a6ff' : '#8b949e',
                            transition: 'all 0.2s',
                            fontSize: '11px',
                            fontWeight: 600
                          }}>
                            <input 
                              type="checkbox" 
                              checked={isAll}
                              onChange={(e) => {
                                const newServices = { ...permit.services };
                                if (e.target.checked) {
                                  newServices[serviceId] = ['*'];
                                } else {
                                  newServices[serviceId] = [];
                                }
                                setPermit(prev => ({ ...prev, services: newServices }));
                              }}
                              style={{ margin: 0, width: '14px', height: '14px', cursor: 'pointer' }}
                            />
                            <span>ALL (*)</span>
                          </label>
                        </div>
                        
                        <button 
                          onClick={() => {
                            const newServices = { ...permit.services };
                            delete newServices[serviceId];
                            setPermit(prev => ({ ...prev, services: newServices }));
                          }}
                          style={{ 
                            background: 'transparent', 
                            border: 'none', 
                            color: '#ef4444', 
                            cursor: 'pointer', 
                            fontSize: '11px', 
                            opacity: 0.5,
                            fontWeight: 600,
                            padding: '4px 8px',
                            borderRadius: '4px'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.5'}
                        >
                          REMOVE
                        </button>
                      </div>

                      {!isAll && serviceInfo && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                          {Object.entries(groupMethodsByPrefix(serviceInfo.methods, serviceId)).map(([groupName, methods]) => (
                            <div key={groupName}>
                              <div style={{ 
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                paddingBottom: '8px',
                                marginBottom: '12px',
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                height: '24px'
                              }}>
                                <span style={{ 
                                  fontSize: '11px', 
                                  opacity: 0.3, 
                                  textTransform: 'uppercase', 
                                  letterSpacing: '1px', 
                                  fontWeight: 800
                                }}>{groupName}</span>
                                
                                <label style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '8px', 
                                  cursor: 'pointer',
                                  userSelect: 'none',
                                  fontSize: '10px',
                                  fontWeight: 600,
                                  opacity: 0.6
                                }}>
                                  <input 
                                    type="checkbox"
                                    checked={methods.every(m => allowedMethods.includes(m.name))}
                                    onChange={(e) => {
                                      const newServices = { ...permit.services };
                                      let currentMethods = [...(newServices[serviceId] || [])];
                                      const groupMethodNames = methods.map(m => m.name);
                                      
                                      if (e.target.checked) {
                                        const toAdd = groupMethodNames.filter(name => !currentMethods.includes(name));
                                        currentMethods = [...currentMethods, ...toAdd];
                                      } else {
                                        currentMethods = currentMethods.filter(name => !groupMethodNames.includes(name));
                                      }
                                      
                                      newServices[serviceId] = currentMethods;
                                      setPermit(prev => ({ ...prev, services: newServices }));
                                    }}
                                    style={{ margin: 0, width: '13px', height: '13px', cursor: 'pointer' }}
                                  />
                                  SELECT ALL
                                </label>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                                {methods.map(method => {
                                  const isChecked = allowedMethods.includes(method.name);
                                  return (
                                    <label 
                                      key={method.name}
                                      style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '8px', 
                                        fontSize: '11px', 
                                        background: isChecked ? 'rgba(88, 166, 255, 0.1)' : 'rgba(255,255,255,0.02)',
                                        padding: '8px 12px',
                                        borderRadius: '6px',
                                        border: '1px solid',
                                        borderColor: isChecked ? 'rgba(88, 166, 255, 0.3)' : 'rgba(255,255,255,0.04)',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease',
                                        color: isChecked ? '#58a6ff' : '#8b949e',
                                        userSelect: 'none',
                                        overflow: 'hidden'
                                      }}
                                    >
                                      <input 
                                        type="checkbox" 
                                        checked={isChecked}
                                        onChange={(e) => {
                                          const newServices = { ...permit.services };
                                          let methodsList = [...(newServices[serviceId] || [])];
                                          if (e.target.checked) {
                                            methodsList.push(method.name);
                                          } else {
                                            methodsList = methodsList.filter(m => m !== method.name);
                                          }
                                          newServices[serviceId] = methodsList;
                                          setPermit(prev => ({ ...prev, services: newServices }));
                                        }}
                                        style={{ cursor: 'pointer', margin: 0, width: '13px', height: '13px' }}
                                      />
                                      <span style={{ 
                                        overflow: 'hidden', 
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                      }}>
                                        {method.name.startsWith(`${serviceId}.${groupName}.`) 
                                          ? method.name.substring(serviceId.length + groupName.length + 2)
                                          : method.name.replace(`${serviceId}.`, '')
                                        }
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
          <button 
            className="service-btn"
            style={{ flex: 1, background: 'var(--accent-color)', color: '#fff', border: 'none', fontWeight: 600 }}
            disabled={isSaving}
            onClick={handleSave}
          >
            {isSaving ? 'SAVING...' : 'SAVE CHANGES'}
          </button>
          <button 
            className="service-btn"
            style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            onClick={onClose}
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}
