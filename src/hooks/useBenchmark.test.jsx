import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BENCHMARK_QUERY_KEY, useReplacementBenchmark } from './useBenchmark';
import * as benchmarkService from '../services/benchmarkService';

vi.mock('../services/benchmarkService', () => ({
  fetchReplacementBenchmark: vi.fn(),
}));

describe('useReplacementBenchmark hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('defines BENCHMARK_QUERY_KEY as ["replacement-benchmark"]', () => {
    expect(BENCHMARK_QUERY_KEY).toEqual(['replacement-benchmark']);
  });

  it('fetches benchmark data when itemId and positive price are provided', async () => {
    const mockData = {
      benchmarkItemId: 'item-1',
      requiredDaysToMatchFinalRate: 100,
      benchmarkCostPerDay: 4.5,
    };
    benchmarkService.fetchReplacementBenchmark.mockResolvedValueOnce(mockData);

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

    const { result } = renderHook(() => useReplacementBenchmark('item-1', 450), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockData);
    expect(benchmarkService.fetchReplacementBenchmark).toHaveBeenCalledWith('item-1', 450);
  });

  it('is disabled when price is invalid or non-positive', () => {
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

    const { result } = renderHook(() => useReplacementBenchmark('item-1', 0), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(benchmarkService.fetchReplacementBenchmark).not.toHaveBeenCalled();
  });
});
