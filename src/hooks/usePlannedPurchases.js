import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchPlannedPurchases,
  createPlannedPurchase,
  updatePlannedPurchase,
  deletePlannedPurchase,
  convertPlannedPurchase,
} from '../services/plannedPurchaseService';

export const PLANNED_PURCHASES_QUERY_KEY = ['planned-purchases'];

export const usePlannedPurchases = () => {
  return useQuery({
    queryKey: PLANNED_PURCHASES_QUERY_KEY,
    queryFn: fetchPlannedPurchases,
    staleTime: 30 * 1000,
    refetchOnMount: 'always',
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

export const useConvertPlannedPurchase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ plannedPurchaseId, conversionPayload }) =>
      convertPlannedPurchase(plannedPurchaseId, conversionPayload),
    onSuccess: () => {
      invalidatePlannedPurchasesQuery(queryClient);
    },
  });
};
