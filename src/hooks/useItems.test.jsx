import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAllItems } from '../services/api';
import { queryKeys } from '../query/queryConfig';
import { invalidateItemQueries, useItems } from './useItems';

vi.mock('../services/api', () => ({
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

  it('invalidates only item-derived resources after create, update, delete, or replace', async () => {
    const queryClient = { invalidateQueries: vi.fn().mockResolvedValue(undefined) };

    await invalidateItemQueries(queryClient);

    const invalidatedKeys = queryClient.invalidateQueries.mock.calls.map(([filters]) => filters.queryKey);
    expect(invalidatedKeys).toEqual(expect.arrayContaining([
      queryKeys.items,
      queryKeys.dashboard,
      queryKeys.durabilityRoot,
      queryKeys.categories,
      queryKeys.brands,
    ]));
    expect(invalidatedKeys).not.toContainEqual(queryKeys.settings);
    expect(invalidatedKeys).not.toContainEqual(queryKeys.valueEquivalents);
  });
});
