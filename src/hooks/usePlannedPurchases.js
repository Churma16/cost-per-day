import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchPlannedPurchases,
  createPlannedPurchase,
  updatePlannedPurchase,
  deletePlannedPurchase,
} from '../services/plannedPurchaseService';
import { queryKeys, SERVER_STATE_STALE_TIME } from '../query/queryConfig';

export const PLANNED_PURCHASES_QUERY_KEY = queryKeys.plannedPurchases;

export const usePlannedPurchases = () => {
  return useQuery({
    queryKey: PLANNED_PURCHASES_QUERY_KEY,
    queryFn: fetchPlannedPurchases,
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

  return useMutation({
    mutationFn: (plannedPurchasePayload) => createPlannedPurchase(plannedPurchasePayload),
    onSuccess: () => {
      invalidatePlannedPurchasesQuery(queryClient);
    },
  });
};

export const useUpdatePlannedPurchase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ plannedPurchaseId, plannedPurchasePayload }) =>
      updatePlannedPurchase(plannedPurchaseId, plannedPurchasePayload),
    onSuccess: () => {
      invalidatePlannedPurchasesQuery(queryClient);
    },
  });
};

export const useDeletePlannedPurchase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (plannedPurchaseId) => deletePlannedPurchase(plannedPurchaseId),
    onSuccess: () => {
      invalidatePlannedPurchasesQuery(queryClient);
    },
  });
};
