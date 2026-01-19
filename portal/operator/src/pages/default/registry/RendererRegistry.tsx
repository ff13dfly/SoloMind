import type { ReactNode } from 'react';
import { CategoryDisplay } from '../CategoryDisplay';
import { renderValue } from '../utils';

export type RendererProps = {
  value: any;
  type?: string;
  field: string;
  item: any;
  serviceId: string;
};

export type Renderer = (props: RendererProps) => ReactNode;

class RendererRegistry {
  private renderers: Record<string, Renderer> = {};

  register(fieldType: string, renderer: Renderer) {
    this.renderers[fieldType.toLowerCase()] = renderer;
  }

  get(fieldType: string): Renderer | null {
    return this.renderers[fieldType.toLowerCase()] || null;
  }

  render(props: RendererProps): ReactNode {
    const { type, field } = props;
    
    // 1. Try specific field name first (e.g. 'categories')
    const fieldRenderer = this.get(field);
    if (fieldRenderer) return fieldRenderer(props);

    // 2. Try type match (e.g. 'datetime')
    if (type) {
      const typeRenderer = this.get(type);
      if (typeRenderer) return typeRenderer(props);
    }

    // 3. Fallback to default util
    return renderValue(props.value, type || '');
  }
}

export const rendererRegistry = new RendererRegistry();

// Register Default Renderers
rendererRegistry.register('categories', (props) => (
  <CategoryDisplay categories={props.value} />
));

rendererRegistry.register('datetime', (props) => (
  <span style={{ color: '#64748b' }}>{renderValue(props.value, 'datetime')}</span>
));

rendererRegistry.register('id', (props) => (
  <code style={{ fontSize: '11px', color: '#94a3b8' }}>{props.value}</code>
));
