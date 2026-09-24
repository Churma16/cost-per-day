import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchDurabilityAnalytics,
  fetchCategories,
  fetchBrands,
} from '../services/durabilityService';
import { queryKeys, SERVER_STATE_STALE_TIME } from '../query/queryConfig';

export const DURABILITY_ANALYTICS_QUERY_KEY = queryKeys.durabilityRoot;
export const CATEGORIES_QUERY_KEY = queryKeys.categories;
export const BRANDS_QUERY_KEY = queryKeys.brands;

export const useDurabilityAnalytics = ({ category = '', brand = '' } = {}) => {
  return useQuery({
    queryKey: queryKeys.durability({ category, brand }),
    queryFn: () => fetchDurabilityAnalytics({ category, brand }),
    staleTime: SERVER_STATE_STALE_TIME,
    retry: 1,
  });
};

export const useCategories = () => {
  return useQuery({
    queryKey: CATEGORIES_QUERY_KEY,
    queryFn: fetchCategories,
    staleTime: SERVER_STATE_STALE_TIME,
    retry: 1,
  });
};

export const useBrands = () => {
  return useQuery({
    queryKey: BRANDS_QUERY_KEY,
    queryFn: fetchBrands,
    staleTime: SERVER_STATE_STALE_TIME,
    retry: 1,
  });
};

export const invalidateDurabilityQuery = (queryClient) => {
  if (queryClient && typeof queryClient.invalidateQueries === 'function') {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: DURABILITY_ANALYTICS_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: BRANDS_QUERY_KEY }),
    ]);
  }
  return Promise.resolve();
};

export const useInvalidateDurability = () => {
  let queryClient = null;
  try {
    queryClient = useQueryClient();
  } catch {
    queryClient = null;
  }

  return useCallback(() => {
    return invalidateDurabilityQuery(queryClient);
  }, [queryClient]);
};
