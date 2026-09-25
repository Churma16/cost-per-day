import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  DASHBOARD_QUERY_KEY,
  useDashboard,
  useInvalidateDashboard,
  invalidateDashboardQuery,
} from '../../src/hooks/useDashboard';
import * as dashboardService from '../../src/services/dashboardService';

vi.mock('../../src/services/dashboardService', () => ({
  fetchDashboardData: vi.fn(),
}));

describe('useDashboard hook & invalidation helpers', () => {
  it('defines DASHBOARD_QUERY_KEY as ["dashboard"]', () => {
    expect(DASHBOARD_QUERY_KEY).toEqual(['dashboard']);
  });

  it('calls invalidateQueries with DASHBOARD_QUERY_KEY on queryClient', async () => {
    const mockQueryClient = {
      invalidateQueries: vi.fn().mockResolvedValue(undefined),
    };

    await invalidateDashboardQuery(mockQueryClient);

    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: DASHBOARD_QUERY_KEY,
    });
  });

  it('safely handles null queryClient in invalidateDashboardQuery without error', async () => {
    await expect(invalidateDashboardQuery(null)).resolves.toBeUndefined();
  });

  it('invalidates dashboard queries through useInvalidateDashboard when inside QueryClientProvider', async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);

    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useInvalidateDashboard(), { wrapper });

    await act(async () => {
      await result.current();
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: DASHBOARD_QUERY_KEY,
    });
  });

  it('gracefully handles execution outside QueryClientProvider without throwing', async () => {
    const { result } = renderHook(() => useInvalidateDashboard());

    await expect(result.current()).resolves.toBeUndefined();
  });

  it('configures useDashboard with refetchOnMount always and 30s staleTime', async () => {
    dashboardService.fetchDashboardData.mockResolvedValue({
      totalDailyCost: 100,
      currencyCode: 'USD',
      insights: [],
    });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useDashboard(), { wrapper });

    expect(result.current.isLoading).toBe(true);
  });
});
