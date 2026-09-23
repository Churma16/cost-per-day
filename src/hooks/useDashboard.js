import { useQuery } from '@tanstack/react-query';
import { fetchDashboardData } from '../services/dashboardService';

export const DASHBOARD_QUERY_KEY = ['dashboard'];

export const useDashboard = () => {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEY,
    queryFn: fetchDashboardData,
    staleTime: 30 * 1000,
    retry: 1,
  });
};
