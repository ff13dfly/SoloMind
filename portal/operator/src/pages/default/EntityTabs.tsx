import { CategoryManager } from './CategoryManager';

interface EntityTabsProps {
  entityNames: string[];
  activeEntity: string;
  setActiveEntity: (name: string) => void;
  serviceId: string;
}

export function EntityTabs({
  entityNames,
  activeEntity,
  setActiveEntity,
  serviceId
}: EntityTabsProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0', flexShrink: 0 }}>
      <div style={{ display: 'flex', gap: '16px', overflowX: 'auto' }}>
        {entityNames.map(name => (
          <button 
            key={name}
            onClick={() => setActiveEntity(name)}
            style={{
              border: 'none',
              background: 'transparent',
              borderBottom: activeEntity === name ? '2px solid var(--accent-color)' : '2px solid transparent',
              color: activeEntity === name ? 'var(--accent-color)' : 'var(--text-secondary)',
              fontWeight: activeEntity === name ? 600 : 500,
              padding: '12px 16px',
              borderRadius: 0,
              cursor: 'pointer',
              marginBottom: '-1px',
              whiteSpace: 'nowrap'
            }}
          >
            {name.toUpperCase()}
          </button>
        ))}
      </div>
      <CategoryManager serviceId={serviceId} />
    </div>
  );
}
