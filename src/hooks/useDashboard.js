import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchDashboardData } from '../services/dashboardService';
import { queryKeys, SERVER_STATE_STALE_TIME } from '../query/queryConfig';
import { useAuth } from '../contexts/AuthContext';

export const DASHBOARD_QUERY_KEY = queryKeys.dashboard;

export const useDashboard = () => {
  const auth = useAuth();
  const enabled = auth === null ? true : Boolean(auth.user);
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEY,
    queryFn: fetchDashboardData,
    enabled,
    staleTime: SERVER_STATE_STALE_TIME,
    retry: 1,
  });
};

export const invalidateDashboardQuery = (queryClient) => {
  if (queryClient && typeof queryClient.invalidateQueries === 'function') {
    return queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
  }
  return Promise.resolve();
};

export const useInvalidateDashboard = () => {
  let queryClient = null;
  try {
    queryClient = useQueryClient();
  } catch {
    queryClient = null;
  }

  return useCallback(() => {
    return invalidateDashboardQuery(queryClient);
  }, [queryClient]);
};
