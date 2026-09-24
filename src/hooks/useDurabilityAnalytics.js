import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchDurabilityAnalytics,
  fetchCategories,
  fetchBrands,
} from '../services/durabilityService';

export const DURABILITY_ANALYTICS_QUERY_KEY = ['durability-analytics'];
export const CATEGORIES_QUERY_KEY = ['categories'];
export const BRANDS_QUERY_KEY = ['brands'];

export const useDurabilityAnalytics = ({ category = '', brand = '' } = {}) => {
  return useQuery({
    queryKey: [...DURABILITY_ANALYTICS_QUERY_KEY, { category, brand }],
    queryFn: () => fetchDurabilityAnalytics({ category, brand }),
    staleTime: 30 * 1000,
    refetchOnMount: 'always',
    retry: 1,
  });
};

export const useCategories = () => {
  return useQuery({
    queryKey: CATEGORIES_QUERY_KEY,
    queryFn: fetchCategories,
    staleTime: 60 * 1000,
    retry: 1,
  });
};

export const useBrands = () => {
  return useQuery({
    queryKey: BRANDS_QUERY_KEY,
    queryFn: fetchBrands,
    staleTime: 60 * 1000,
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
