import { useQuery } from '@tanstack/react-query';
import { callRpc } from '../../../utils/rpc';

interface FetchParams {
  serviceId: string;
  activeEntity: string;
  page: number;
  pageSize: number;
  keyword: string;
}

export function useEntityQuery({ serviceId, activeEntity, page, pageSize, keyword }: FetchParams) {
  return useQuery({
    queryKey: ['entities', serviceId, activeEntity, page, pageSize, keyword],
    queryFn: async () => {
      if (!serviceId || !activeEntity) return { items: [], total: 0 };
      
      const res = await callRpc<{ items: any[], total: number }>(`${serviceId}.${activeEntity}.list`, { 
        page, 
        pageSize,
        offset: (page - 1) * pageSize,
        limit: pageSize,
        keyword,
        query: keyword,
        includeDeleted: false
      });
      
      return {
        items: res.items || [],
        total: res.total || 0,
      };
    },
    enabled: !!serviceId && !!activeEntity,
  });
}
