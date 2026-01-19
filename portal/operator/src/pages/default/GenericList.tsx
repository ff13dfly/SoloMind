import { useState, memo } from 'react';
import { List } from 'react-window';
import type { EntityDefinition } from '../../providers/ServicesProvider';
import { EntityResolver } from './EntityResolver';
import { rendererRegistry } from './registry/RendererRegistry';
import { CommonErrorBoundary } from '../../components/CommonErrorBoundary';

interface GenericListProps {
  items: any[];
  entityDef: EntityDefinition;
  onViewRaw: (i: any) => void;
  onDelete?: (i: any) => void;
  serviceId: string;
}

const Row = memo(({ index, style, items, gridTemplate, onViewRaw, onDelete, serviceId, resolverTarget, setResolverTarget, fields }: any) => {
  const item = items[index];
  if (!item) return null;
  const isRowResolving = resolverTarget?.rowIdx === index;

  return (
    <div 
      style={{ 
        ...style,
        display: 'grid',
        gridTemplateColumns: gridTemplate,
        alignItems: 'center',
        borderBottom: '1px solid #f1f5f9',
        padding: '0 24px',
        boxSizing: 'border-box',
        background: '#fff',
        zIndex: isRowResolving ? 100 : 1,
        overflow: isRowResolving ? 'visible' : 'hidden'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
        <button 
          onClick={() => onViewRaw(item)}
          style={{
            padding: '2px 8px',
            fontSize: '10px',
            background: '#eff6ff',
            color: '#2563eb',
            border: '1px solid #dbeafe',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 600,
            flexShrink: 0
          }}
        >
          EDIT
        </button>
        <span 
          title={item.id}
          style={{ 
            fontFamily: 'monospace', 
            fontSize: '12px', 
            color: '#64748b',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {item.id || '-'}
        </span>
      </div>

      {fields.map(([name, fdef]: [string, any]) => {
        const isRelatedId = name.toLowerCase().endsWith('id') && name.length > 2;
        const relatedEntityName = isRelatedId ? name.slice(0, name.toLowerCase().lastIndexOf('id')).toLowerCase() : null;
        const val = item[name];
        const isResolving = resolverTarget?.rowIdx === index && resolverTarget?.field === name;

        return (
          <div key={name} style={{ 
            whiteSpace: 'nowrap', 
            overflow: isResolving ? 'visible' : 'hidden', 
            textOverflow: 'ellipsis',
            position: 'relative'
          }}>
            <CommonErrorBoundary>
              {isRelatedId && val ? (
                <>
                  <button
                    onClick={() => setResolverTarget(isResolving ? null : { entity: relatedEntityName!, id: val, field: name, rowIdx: index })}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--accent-color)',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      padding: 0,
                      fontSize: 'inherit',
                      fontFamily: 'monospace'
                    }}
                  >
                    {val.length > 10 ? val.substring(0, 10) + '...' : val}
                  </button>
                  {isResolving && (
                    <EntityResolver 
                      currentServiceId={serviceId} 
                      entityName={relatedEntityName!} 
                      id={val} 
                      onClose={() => setResolverTarget(null)} 
                    />
                  )}
                </>
              ) : (
                rendererRegistry.render({
                  value: val,
                  type: fdef.type,
                  field: name,
                  item,
                  serviceId
                })
              )}
            </CommonErrorBoundary>
          </div>
        );
      })}

      <div style={{ display: 'flex', alignItems: 'center' }}>
        {onDelete && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item);
            }}
            style={{
              padding: '2px 10px',
              fontSize: '10px',
              background: '#fef2f2',
              color: '#ef4444',
              border: '1px solid #fee2e2',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            DELETE
          </button>
        )}
      </div>
    </div>
  );
});

export function GenericList({ items, entityDef, onViewRaw, onDelete, serviceId }: GenericListProps) {
  const fields = Object.entries(entityDef?.fields || {}).filter(([name]) => name.toLowerCase() !== 'id');
  const [resolverTarget, setResolverTarget] = useState<{ entity: string, id: string, field: string, rowIdx: number } | null>(null);
  const gridTemplate = `1.5fr ${fields.map(() => '2fr').join(' ')} 100px`;

  return (
    <div className="service-list" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#fff' }}>
      <div style={{ 
        gridTemplateColumns: gridTemplate, 
        padding: '12px 24px', 
        background: '#f8fafc', 
        fontWeight: 600, 
        fontSize: '11px', 
        color: '#64748b', 
        borderBottom: '1px solid #e2e8f0', 
        display: 'grid',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }}>
        <div>IDENTIFIER / ID</div>
        {fields.map(([name]) => (
          <div key={name}>{name}</div>
        ))}
        <div>ACTIONS</div>
      </div>
      
      <div style={{ flex: 1, position: 'relative' }}>
        {items.length > 0 ? (
          <List
            style={{ height: '100%', width: '100%' }}
            rowCount={items.length}
            rowHeight={52}
            rowComponent={Row as any}
            rowProps={{
              items,
              gridTemplate,
              onViewRaw,
              onDelete,
              serviceId,
              resolverTarget,
              setResolverTarget,
              fields
            }}
          />
        ) : (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No data found</div>
        )}
      </div>
    </div>
  );
}
