import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePersistence } from '../contexts/PersistenceContext';
import { queryKeys, SERVER_STATE_STALE_TIME } from '../query/queryConfig';
import { invalidateDashboardQuery } from './useDashboard';
import { invalidateDurabilityQuery } from './useDurabilityAnalytics';

export const ITEMS_QUERY_KEY = queryKeys.items;

export const useItems = () => {
  const { repositories } = usePersistence();
  return useQuery({
    queryKey: queryKeys.items,
    queryFn: () => repositories.items.list(),
    enabled: Boolean(repositories),
    staleTime: SERVER_STATE_STALE_TIME,
    retry: 1,
  });
};

export const invalidateItemQueries = async (queryClient) => {
  if (!queryClient || typeof queryClient.invalidateQueries !== 'function') return;

  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.items }),
    queryClient.invalidateQueries({ queryKey: queryKeys.replacementBenchmarks }),
    invalidateDashboardQuery(queryClient),
    invalidateDurabilityQuery(queryClient),
  ]);
};

export const useCreateItem = () => {
  const queryClient = useQueryClient();
  const { repositories } = usePersistence();

  return useMutation({
    mutationFn: (itemData) => repositories.items.create(itemData),
    onSuccess: async (savedItem) => {
      queryClient.setQueryData(queryKeys.items, (cachedItems = []) => (
        [...cachedItems, savedItem]
      ));
      await invalidateItemQueries(queryClient);
    },
  });
};

export const useUpdateItem = () => {
  const queryClient = useQueryClient();
  const { repositories } = usePersistence();

  return useMutation({
    mutationFn: ({ itemId, itemData }) => repositories.items.update(itemId, itemData),
    onSuccess: async (savedItem, { itemId }) => {
      queryClient.setQueryData(queryKeys.items, (cachedItems) => (
        Array.isArray(cachedItems)
          ? cachedItems.map((item) => (
            String(item.id) === String(itemId) ? savedItem : item
          ))
          : cachedItems
      ));
      await invalidateItemQueries(queryClient);
    },
  });
};

export const useDeleteItem = () => {
  const queryClient = useQueryClient();
  const { repositories } = usePersistence();

  return useMutation({
    mutationFn: (itemId) => repositories.items.delete(itemId),
    onSuccess: async (_result, deletedItemId) => {
      queryClient.setQueryData(queryKeys.items, (cachedItems) => (
        Array.isArray(cachedItems)
          ? cachedItems.filter((item) => String(item.id) !== String(deletedItemId))
          : cachedItems
      ));
      await invalidateItemQueries(queryClient);
    },
  });
};

export const useReplaceItems = () => {
  const queryClient = useQueryClient();
  const { repositories } = usePersistence();

  return useMutation({
    mutationFn: (items) => repositories.items.replaceAll(items),
    onSuccess: async (replacedItems) => {
      queryClient.setQueryData(queryKeys.items, replacedItems);
      await invalidateItemQueries(queryClient);
    },
  });
};

export const useInvalidateItems = () => {
  const queryClient = useQueryClient();
  return useCallback(() => invalidateItemQueries(queryClient), [queryClient]);
};
