import React from 'react';
import { CapabilityCard } from './CapabilityCard';
import { EntityPopover } from './EntityPopover';

interface Service {
  id: string;
  url: string;
  available: boolean;
  version?: string;
  entities?: Record<string, any>;
}

interface Capability {
  method: string;
  service: string;
  description: string;
  params: any[];
  returns?: string[];
  ai?: boolean;
}

interface ServiceCapabilitiesProps {
  loading: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  uniqueServices: string[];
  activeServiceDetails?: Service;
  displayedCaps: Capability[];
  activeEntityPopover: string | null;
  setActiveEntityPopover: (entity: string | null) => void;
  isChecking: boolean;
  t: (key: string) => string;
}

export const ServiceCapabilities: React.FC<ServiceCapabilitiesProps> = ({
  loading, activeTab, setActiveTab, uniqueServices, 
  activeServiceDetails, displayedCaps, 
  activeEntityPopover, setActiveEntityPopover,
  isChecking, t
}) => {
  return (
    <div className="panel" style={{ marginTop: '24px' }}>
      <div className="panel-title">{t('overview.capabilities_title')}</div>
      
      <div className="tabs-header" style={{ 
          borderBottom: '1px solid #30363d', 
          padding: '0 16px',
          display: 'flex',
          gap: '2px',
          background: 'var(--panel-bg)',
          marginTop: '1px',
          overflowX: 'auto'
      }}>
        {uniqueServices.length === 0 && !loading && (
            <div style={{ padding: '8px 0', color: '#8b949e', fontSize: '13px' }}>No services available</div>
        )}
        {uniqueServices.map(svc => (
            <button 
                key={svc}
                onClick={() => setActiveTab(svc)}
                style={{
                    padding: '12px 24px',
                    background: activeTab === svc ? 'rgba(88, 166, 255, 0.1)' : 'transparent',
                    border: 'none',
                    borderBottom: activeTab === svc ? '2px solid #58a6ff' : '2px solid transparent',
                    color: activeTab === svc ? '#c9d1d9' : '#8b949e',
                    cursor: 'pointer',
                    fontWeight: activeTab === svc ? 600 : 400,
                    fontSize: '13px',
                    transition: 'all 0.2s',
                    outline: 'none',
                    whiteSpace: 'nowrap'
                }}
            >
                {svc.toUpperCase()}
            </button>
        ))}
      </div>

      {activeServiceDetails && (
        <div style={{ 
            padding: '24px 24px 16px', 
            borderBottom: '1px solid #30363d',
            background: 'rgba(22, 27, 34, 0.5)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ 
                  margin: '0 0 8px 0', fontSize: '20px', color: '#c9d1d9', 
                  fontWeight: 600, display: 'flex', alignItems: 'center', gap: '12px'
              }}>
                {activeServiceDetails.id.toUpperCase()}
                {!isChecking && (
                    <span style={{
                        fontSize: '12px', padding: '2px 8px', borderRadius: '12px',
                        background: activeServiceDetails.available ? 'rgba(46, 160, 67, 0.15)' : 'rgba(248, 81, 73, 0.15)',
                        color: activeServiceDetails.available ? '#3fb950' : '#f85149',
                        border: activeServiceDetails.available ? '1px solid rgba(46, 160, 67, 0.4)' : '1px solid rgba(248, 81, 73, 0.4)',
                        fontWeight: 500
                    }}>
                        {activeServiceDetails.available ? 'ONLINE' : 'OFFLINE'}
                    </span>
                )}
              </h2>
              <div style={{ display: 'flex', gap: '24px', fontSize: '13px', color: '#8b949e' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ opacity: 0.7 }}>URL:</span>
                    <span style={{ fontFamily: 'monospace', color: '#58a6ff' }}>{activeServiceDetails.url || 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ opacity: 0.7 }}>VERSION:</span>
                    <span>{activeServiceDetails.version || 'unknown'}</span>
                </div>
              </div>
            </div>

            {activeServiceDetails.entities && Object.keys(activeServiceDetails.entities).length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                <div style={{ fontSize: '11px', color: '#8b949e', fontWeight: 600, letterSpacing: '0.5px' }}>ENTITIES</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {Object.entries(activeServiceDetails.entities).map(([entityName, def]: [string, any]) => (
                    <div key={entityName} style={{ position: 'relative' }}>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveEntityPopover(activeEntityPopover === entityName ? null : entityName);
                        }}
                        style={{
                          fontSize: '11px', padding: '4px 12px',
                          background: 'rgba(255, 123, 114, 0.1)', border: '1px solid rgba(255, 123, 114, 0.4)',
                          color: '#ff7b72', borderRadius: '20px', fontWeight: 600,
                          textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s', outline: 'none',
                          boxShadow: activeEntityPopover === entityName ? '0 0 12px rgba(255, 123, 114, 0.3)' : 'none'
                        }}
                      >
                        {entityName}
                      </button>
                      {activeEntityPopover === entityName && def.fields && (
                        <EntityPopover entityName={entityName} def={def} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="panel-content" style={{ padding: '24px', background: 'transparent' }}>
        {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#8b949e' }}>LOADING...</div>
        ) : displayedCaps.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#8b949e' }}>
              {uniqueServices.length === 0 ? 'No capabilities found.' : 'Select a service to view capabilities.'}
            </div>
        ) : (
            <div style={{ 
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' 
            }}>
              {displayedCaps.map((cap, idx) => <CapabilityCard key={idx} cap={cap} />)}
            </div>
        )}
      </div>
    </div>
  );
};
