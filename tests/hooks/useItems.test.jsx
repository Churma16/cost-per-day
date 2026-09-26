import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteItem, getAllItems } from '../../src/services/api';
import { queryKeys } from '../../src/query/queryConfig';
import { invalidateItemQueries, useDeleteItem, useItems } from '../../src/hooks/useItems';

vi.mock('../../src/services/api', () => ({
  deleteItem: vi.fn(),
  getAllItems: vi.fn(),
}));

describe('item server-state cache', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders cached items on a fresh route remount without fetching again', async () => {
    const cachedItems = [{ id: '1', name: 'Phone' }];
    getAllItems.mockResolvedValue(cachedItems);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const firstMount = renderHook(() => useItems(), { wrapper });
    await waitFor(() => expect(firstMount.result.current.data).toEqual(cachedItems));
    firstMount.unmount();

    const secondMount = renderHook(() => useItems(), { wrapper });
    expect(secondMount.result.current.data).toEqual(cachedItems);
    expect(secondMount.result.current.isLoading).toBe(false);
    expect(getAllItems).toHaveBeenCalledTimes(1);
  });

  it('owns item deletion transport, cache removal, and invalidation', async () => {
    deleteItem.mockResolvedValue(null);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(queryKeys.items, [
      { id: '1', name: 'Phone' },
      { id: '2', name: 'Laptop' },
    ]);
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);
    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useDeleteItem(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync('1');
    });

    expect(deleteItem).toHaveBeenCalledWith('1');
    expect(queryClient.getQueryData(queryKeys.items)).toEqual([
      { id: '2', name: 'Laptop' },
    ]);

    const invalidatedKeys = invalidateSpy.mock.calls.map(([filters]) => filters.queryKey);
    expect(invalidatedKeys).toEqual(expect.arrayContaining([
      queryKeys.items,
      queryKeys.replacementBenchmarks,
      queryKeys.dashboard,
      queryKeys.durabilityRoot,
      queryKeys.categories,
      queryKeys.brands,
    ]));
  });

  it('invalidates only item-derived resources after create, update, delete, or replace', async () => {
    const queryClient = { invalidateQueries: vi.fn().mockResolvedValue(undefined) };

    await invalidateItemQueries(queryClient);

    const invalidatedKeys = queryClient.invalidateQueries.mock.calls.map(([filters]) => filters.queryKey);
    expect(invalidatedKeys).toEqual(expect.arrayContaining([
      queryKeys.items,
      queryKeys.replacementBenchmarks,
      queryKeys.dashboard,
      queryKeys.durabilityRoot,
      queryKeys.categories,
      queryKeys.brands,
    ]));
    expect(invalidatedKeys).not.toContainEqual(queryKeys.settings);
    expect(invalidatedKeys).not.toContainEqual(queryKeys.valueEquivalents);
  });

  it('marks cached replacement benchmarks stale after an item mutation', async () => {
    const queryClient = new QueryClient();
    const benchmarkKey = queryKeys.replacementBenchmark('completed-1', 1200);
    queryClient.setQueryData(benchmarkKey, { requiredDurationDays: 400 });

    await invalidateItemQueries(queryClient);

    expect(queryClient.getQueryState(benchmarkKey)?.isInvalidated).toBe(true);
  });
});
