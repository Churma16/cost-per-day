import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAllItems } from '../services/api';
import { queryKeys, SERVER_STATE_STALE_TIME } from '../query/queryConfig';
import { invalidateDashboardQuery } from './useDashboard';
import { invalidateDurabilityQuery } from './useDurabilityAnalytics';

export const ITEMS_QUERY_KEY = queryKeys.items;

export const useItems = () => useQuery({
  queryKey: queryKeys.items,
  queryFn: getAllItems,
  staleTime: SERVER_STATE_STALE_TIME,
  retry: 1,
});

export const invalidateItemQueries = async (queryClient) => {
  if (!queryClient || typeof queryClient.invalidateQueries !== 'function') return;

  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.items }),
    invalidateDashboardQuery(queryClient),
    invalidateDurabilityQuery(queryClient),
  ]);
};

export const useInvalidateItems = () => {
  const queryClient = useQueryClient();
  return useCallback(() => invalidateItemQueries(queryClient), [queryClient]);
};
