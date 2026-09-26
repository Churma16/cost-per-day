import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePersistence } from '../contexts/PersistenceContext';
import { queryKeys, SERVER_STATE_STALE_TIME } from '../query/queryConfig';

export const PLANNED_PURCHASES_QUERY_KEY = queryKeys.plannedPurchases;

export const usePlannedPurchases = () => {
  const { repositories } = usePersistence();
  return useQuery({
    queryKey: PLANNED_PURCHASES_QUERY_KEY,
    queryFn: () => repositories.plannedPurchases.list(),
    enabled: Boolean(repositories),
    staleTime: SERVER_STATE_STALE_TIME,
    retry: 1,
  });
};

export const invalidatePlannedPurchasesQuery = (queryClient) => {
  if (queryClient && typeof queryClient.invalidateQueries === 'function') {
    return queryClient.invalidateQueries({ queryKey: PLANNED_PURCHASES_QUERY_KEY });
  }
  return Promise.resolve();
};

export const useInvalidatePlannedPurchases = () => {
  let queryClient = null;
  try {
    queryClient = useQueryClient();
  } catch {
    queryClient = null;
  }

  return useCallback(() => {
    return invalidatePlannedPurchasesQuery(queryClient);
  }, [queryClient]);
};

export const useCreatePlannedPurchase = () => {
  const queryClient = useQueryClient();
  const { repositories } = usePersistence();

  return useMutation({
    mutationFn: (plannedPurchasePayload) => repositories.plannedPurchases.create(plannedPurchasePayload),
    onSuccess: () => {
      invalidatePlannedPurchasesQuery(queryClient);
    },
  });
};

export const useUpdatePlannedPurchase = () => {
  const queryClient = useQueryClient();
  const { repositories } = usePersistence();

  return useMutation({
    mutationFn: ({ plannedPurchaseId, plannedPurchasePayload }) =>
      repositories.plannedPurchases.update(plannedPurchaseId, plannedPurchasePayload),
    onSuccess: () => {
      invalidatePlannedPurchasesQuery(queryClient);
    },
  });
};

export const useDeletePlannedPurchase = () => {
  const queryClient = useQueryClient();
  const { repositories } = usePersistence();

  return useMutation({
    mutationFn: (plannedPurchaseId) => repositories.plannedPurchases.delete(plannedPurchaseId),
    onSuccess: () => {
      invalidatePlannedPurchasesQuery(queryClient);
    },
  });
};
