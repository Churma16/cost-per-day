import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addItem,
  deleteItem,
  getAllItems,
  replaceAllItems,
  updateItem,
} from '../../src/services/api';
import { queryKeys } from '../../src/query/queryConfig';
import {
  invalidateItemQueries,
  useCreateItem,
  useDeleteItem,
  useItems,
  useReplaceItems,
  useUpdateItem,
} from '../../src/hooks/useItems';

vi.mock('../../src/services/api', () => ({
  addItem: vi.fn(),
  deleteItem: vi.fn(),
  getAllItems: vi.fn(),
  replaceAllItems: vi.fn(),
  updateItem: vi.fn(),
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

  it('owns item creation transport, cache insertion, and invalidation', async () => {
    const itemData = {
      name: 'Phone',
      price: 500,
      purchaseDate: '2026-09-01T12:00:00.000Z',
    };
    const savedItem = { id: 'new-1', ...itemData };
    addItem.mockResolvedValue(savedItem);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(queryKeys.items, [{ id: '1', name: 'Laptop' }]);
    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useCreateItem(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(itemData);
    });

    expect(addItem).toHaveBeenCalledWith(itemData);
    expect(queryClient.getQueryData(queryKeys.items)).toEqual([
      { id: '1', name: 'Laptop' },
      savedItem,
    ]);
  });

  it('owns item update transport, cache replacement, and invalidation', async () => {
    const itemData = {
      name: 'Updated Phone',
      price: 450,
      purchaseDate: '2026-09-01T12:00:00.000Z',
    };
    const savedItem = { id: '1', ...itemData };
    updateItem.mockResolvedValue(savedItem);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(queryKeys.items, [
      { id: '1', name: 'Phone' },
      { id: '2', name: 'Laptop' },
    ]);
    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useUpdateItem(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ itemId: '1', itemData });
    });

    expect(updateItem).toHaveBeenCalledWith('1', itemData);
    expect(queryClient.getQueryData(queryKeys.items)).toEqual([
      savedItem,
      { id: '2', name: 'Laptop' },
    ]);
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

  it('owns replace-all transport, cache replacement, and item-derived invalidation', async () => {
    const importedItems = [{
      name: 'Imported Phone',
      price: 600,
      purchaseDate: '2026-09-20T12:00:00.000Z',
    }];
    const replacedItems = [{ id: 'imported-1', ...importedItems[0] }];
    replaceAllItems.mockResolvedValue(replacedItems);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(queryKeys.items, [{ id: 'old-1', name: 'Old item' }]);
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);
    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useReplaceItems(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(importedItems);
    });

    expect(replaceAllItems).toHaveBeenCalledWith(importedItems);
    expect(queryClient.getQueryData(queryKeys.items)).toEqual(replacedItems);

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
