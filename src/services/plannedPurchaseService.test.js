import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  plannedPurchaseHttpClient,
  fetchPlannedPurchases,
  fetchPlannedPurchaseById,
  createPlannedPurchase,
  updatePlannedPurchase,
  deletePlannedPurchase,
  convertPlannedPurchase,
} from './plannedPurchaseService';

describe('plannedPurchaseService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('successfully fetches list of planned purchases', async () => {
    const mockList = [
      {
        id: '1',
        name: 'MacBook Air',
        targetPrice: 18000000,
        currencyCode: 'IDR',
        contributionAmount: 25000,
        contributionCadence: 'daily',
        estimatedPeriods: 720,
        estimatedDays: 720,
      },
    ];

    vi.spyOn(plannedPurchaseHttpClient, 'get').mockResolvedValueOnce({
      data: {
        meta: { code: 200, message: 'Success' },
        data: mockList,
      },
    });

    const result = await fetchPlannedPurchases();
    expect(result).toEqual(mockList);
  });

  it('successfully fetches a single planned purchase by ID', async () => {
    const mockPurchase = {
      id: '1',
      name: 'MacBook Air',
      targetPrice: 18000000,
      currencyCode: 'IDR',
    };

    vi.spyOn(plannedPurchaseHttpClient, 'get').mockResolvedValueOnce({
      data: {
        meta: { code: 200, message: 'Success' },
        data: mockPurchase,
      },
    });

    const result = await fetchPlannedPurchaseById('1');
    expect(result).toEqual(mockPurchase);
  });

  it('successfully creates a planned purchase', async () => {
    const payload = {
      name: 'iPad Pro',
      targetPrice: 1000,
      currencyCode: 'USD',
    };
    const mockCreated = { id: '2', ...payload };

    vi.spyOn(plannedPurchaseHttpClient, 'post').mockResolvedValueOnce({
      data: {
        meta: { code: 201, message: 'Created' },
        data: mockCreated,
      },
    });

    const result = await createPlannedPurchase(payload);
    expect(result).toEqual(mockCreated);
  });

  it('successfully updates a planned purchase', async () => {
    const payload = {
      name: 'iPad Pro 13',
      targetPrice: 1200,
      currencyCode: 'USD',
    };
    const mockUpdated = { id: '2', ...payload };

    vi.spyOn(plannedPurchaseHttpClient, 'put').mockResolvedValueOnce({
      data: {
        meta: { code: 200, message: 'Updated' },
        data: mockUpdated,
      },
    });

    const result = await updatePlannedPurchase('2', payload);
    expect(result).toEqual(mockUpdated);
  });

  it('successfully deletes a planned purchase', async () => {
    vi.spyOn(plannedPurchaseHttpClient, 'delete').mockResolvedValueOnce({
      data: {
        meta: { code: 200, message: 'Deleted' },
        data: null,
      },
    });

    const result = await deletePlannedPurchase('2');
    expect(result).toEqual({ meta: { code: 200, message: 'Deleted' }, data: null });
  });

  it('successfully converts a planned purchase into an owned item', async () => {
    const payload = {
      purchasePrice: 1150000,
      currencyCode: 'IDR',
      purchaseDate: '2026-09-24',
    };
    const ownedItem = {
      id: '9',
      name: 'Camera',
      price: 1150000,
      purchaseDate: '2026-09-24T00:00:00Z',
      status: 'active',
    };

    const postSpy = vi.spyOn(plannedPurchaseHttpClient, 'post').mockResolvedValueOnce({
      data: {
        meta: { code: 201, message: 'planned purchase converted successfully' },
        data: ownedItem,
      },
    });

    await expect(convertPlannedPurchase('3', payload)).resolves.toEqual(ownedItem);
    expect(postSpy).toHaveBeenCalledWith('/api/planned-purchases/3/convert', payload);
  });

  it('surfaces backend error message on failure', async () => {
    vi.spyOn(plannedPurchaseHttpClient, 'post').mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          meta: { code: 400, message: 'target date must be in the future' },
        },
      },
    });

    await expect(createPlannedPurchase({})).rejects.toThrow('target date must be in the future');
  });

  it('handles network failure gracefully', async () => {
    vi.spyOn(plannedPurchaseHttpClient, 'get').mockRejectedValueOnce(new Error('Network error'));

    await expect(fetchPlannedPurchases()).rejects.toThrow(
      'Unable to load planned purchases from the server.'
    );
  });
});
