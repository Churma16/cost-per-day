import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  DURABILITY_ANALYTICS_QUERY_KEY,
  CATEGORIES_QUERY_KEY,
  BRANDS_QUERY_KEY,
  useDurabilityAnalytics,
  useCategories,
  useBrands,
  invalidateDurabilityQuery,
} from '../../src/hooks/useDurabilityAnalytics';
import * as durabilityService from '../../src/services/durabilityService';

vi.mock('../../src/services/durabilityService', () => ({
  fetchDurabilityAnalytics: vi.fn(),
  fetchCategories: vi.fn(),
  fetchBrands: vi.fn(),
}));

describe('useDurabilityAnalytics hooks', () => {
  let queryClient;

  beforeEach(() => {
    vi.restoreAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('defines query keys correctly', () => {
    expect(DURABILITY_ANALYTICS_QUERY_KEY).toEqual(['durability-analytics']);
    expect(CATEGORIES_QUERY_KEY).toEqual(['categories']);
    expect(BRANDS_QUERY_KEY).toEqual(['brands']);
  });

  it('invalidates queries correctly with queryClient', async () => {
    const mockClient = {
      invalidateQueries: vi.fn().mockResolvedValue(undefined),
    };
    await invalidateDurabilityQuery(mockClient);
    expect(mockClient.invalidateQueries).toHaveBeenCalledTimes(3);
  });

  it('fetches durability analytics via useDurabilityAnalytics', async () => {
    const mockAnalytics = {
      totalCompletedItems: 2,
      categories: [{ category: 'Audio', completedCount: 2 }],
    };
    durabilityService.fetchDurabilityAnalytics.mockResolvedValueOnce(mockAnalytics);

    const { result } = renderHook(() => useDurabilityAnalytics({ category: 'Audio' }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockAnalytics);
    expect(durabilityService.fetchDurabilityAnalytics).toHaveBeenCalledWith({
      category: 'Audio',
      brand: '',
    });
  });

  it('fetches categories via useCategories', async () => {
    const mockCategories = [{ id: 1, name: 'Audio' }];
    durabilityService.fetchCategories.mockResolvedValueOnce(mockCategories);

    const { result } = renderHook(() => useCategories(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockCategories);
  });

  it('fetches brands via useBrands', async () => {
    const mockBrands = [{ id: 1, name: 'Sony' }];
    durabilityService.fetchBrands.mockResolvedValueOnce(mockBrands);

    const { result } = renderHook(() => useBrands(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockBrands);
  });
});
