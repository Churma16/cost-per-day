import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  PLANNED_PURCHASES_QUERY_KEY,
  usePlannedPurchases,
  useCreatePlannedPurchase,
  useUpdatePlannedPurchase,
  useDeletePlannedPurchase,
  useConvertPlannedPurchase,
  invalidatePlannedPurchasesQuery,
} from './usePlannedPurchases';
import * as plannedPurchaseService from '../services/plannedPurchaseService';

vi.mock('../services/plannedPurchaseService', () => ({
  fetchPlannedPurchases: vi.fn(),
  createPlannedPurchase: vi.fn(),
  updatePlannedPurchase: vi.fn(),
  deletePlannedPurchase: vi.fn(),
  convertPlannedPurchase: vi.fn(),
}));

describe('usePlannedPurchases hook & mutations', () => {
  let queryClient;

  beforeEach(() => {
    vi.restoreAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('defines PLANNED_PURCHASES_QUERY_KEY as ["planned-purchases"]', () => {
    expect(PLANNED_PURCHASES_QUERY_KEY).toEqual(['planned-purchases']);
  });

  it('invalidates queries correctly with queryClient', async () => {
    const mockClient = {
      invalidateQueries: vi.fn().mockResolvedValue(undefined),
    };
    await invalidatePlannedPurchasesQuery(mockClient);
    expect(mockClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: PLANNED_PURCHASES_QUERY_KEY,
    });
  });

  it('fetches planned purchases via usePlannedPurchases query', async () => {
    const mockList = [
      { id: '1', name: 'Laptop', targetPrice: 1500, currencyCode: 'USD' },
    ];
    plannedPurchaseService.fetchPlannedPurchases.mockResolvedValueOnce(mockList);

    const { result } = renderHook(() => usePlannedPurchases(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockList);
  });

  it('creates planned purchase and invalidates cache', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const newPurchase = { name: 'Watch', targetPrice: 300, currencyCode: 'USD' };
    plannedPurchaseService.createPlannedPurchase.mockResolvedValueOnce({ id: '2', ...newPurchase });

    const { result } = renderHook(() => useCreatePlannedPurchase(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(newPurchase);
    });

    expect(plannedPurchaseService.createPlannedPurchase).toHaveBeenCalledWith(newPurchase);
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: PLANNED_PURCHASES_QUERY_KEY,
    });
  });

  it('updates planned purchase and invalidates cache', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const updatePayload = { name: 'Smart Watch', targetPrice: 350, currencyCode: 'USD' };
    plannedPurchaseService.updatePlannedPurchase.mockResolvedValueOnce({ id: '2', ...updatePayload });

    const { result } = renderHook(() => useUpdatePlannedPurchase(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        plannedPurchaseId: '2',
        plannedPurchasePayload: updatePayload,
      });
    });

    expect(plannedPurchaseService.updatePlannedPurchase).toHaveBeenCalledWith('2', updatePayload);
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: PLANNED_PURCHASES_QUERY_KEY,
    });
  });

  it('converts planned purchase and invalidates cache', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const conversionPayload = {
      purchasePrice: 950,
      currencyCode: 'USD',
      purchaseDate: '2026-09-24',
    };
    plannedPurchaseService.convertPlannedPurchase.mockResolvedValueOnce({ id: 'owned-1' });

    const { result } = renderHook(() => useConvertPlannedPurchase(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        plannedPurchaseId: '2',
        conversionPayload,
      });
    });

    expect(plannedPurchaseService.convertPlannedPurchase).toHaveBeenCalledWith('2', conversionPayload);
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: PLANNED_PURCHASES_QUERY_KEY,
    });
  });

  it('deletes planned purchase and invalidates cache', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    plannedPurchaseService.deletePlannedPurchase.mockResolvedValueOnce({ meta: { code: 200 } });

    const { result } = renderHook(() => useDeletePlannedPurchase(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync('2');
    });

    expect(plannedPurchaseService.deletePlannedPurchase).toHaveBeenCalledWith('2');
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: PLANNED_PURCHASES_QUERY_KEY,
    });
  });
});
