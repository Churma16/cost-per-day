import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchPlannedPurchases,
  fetchPlannedPurchaseById,
  createPlannedPurchase,
  updatePlannedPurchase,
  deletePlannedPurchase,
} from '../../src/services/plannedPurchaseService';

const response = (status, data, message = 'Success') => ({
  ok: status >= 200 && status < 300,
  status,
  json: vi.fn().mockResolvedValue({
    meta: { code: status, message },
    data,
  }),
});

describe('plannedPurchaseService', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    delete global.fetch;
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

    global.fetch.mockResolvedValueOnce(response(200, mockList));

    const result = await fetchPlannedPurchases();

    expect(result).toEqual(mockList);
    expect(global.fetch.mock.calls[0][0]).toBe('/api/planned-purchases');
  });

  it('successfully fetches a single planned purchase by ID', async () => {
    const mockPurchase = {
      id: '1',
      name: 'MacBook Air',
      targetPrice: 18000000,
      currencyCode: 'IDR',
    };

    global.fetch.mockResolvedValueOnce(response(200, mockPurchase));

    const result = await fetchPlannedPurchaseById('1');

    expect(result).toEqual(mockPurchase);
    expect(global.fetch.mock.calls[0][0]).toBe('/api/planned-purchases/1');
  });

  it('successfully creates a planned purchase with centralized JSON handling', async () => {
    const payload = {
      name: 'iPad Pro',
      targetPrice: 1000,
      currencyCode: 'USD',
    };
    const mockCreated = { id: '2', ...payload };

    global.fetch.mockResolvedValueOnce(response(201, mockCreated, 'Created'));

    const result = await createPlannedPurchase(payload);

    expect(result).toEqual(mockCreated);
    expect(global.fetch).toHaveBeenCalledWith('/api/planned-purchases', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(payload),
      credentials: 'include',
      headers: expect.objectContaining({
        Accept: 'application/json',
        'Content-Type': 'application/json',
      }),
    }));
  });

  it('successfully updates a planned purchase', async () => {
    const payload = {
      name: 'iPad Pro 13',
      targetPrice: 1200,
      currencyCode: 'USD',
    };
    const mockUpdated = { id: '2', ...payload };

    global.fetch.mockResolvedValueOnce(response(200, mockUpdated, 'Updated'));

    const result = await updatePlannedPurchase('2', payload);

    expect(result).toEqual(mockUpdated);
    expect(global.fetch.mock.calls[0][0]).toBe('/api/planned-purchases/2');
  });

  it('preserves the existing delete response contract', async () => {
    global.fetch.mockResolvedValueOnce(response(200, null, 'Deleted'));

    const result = await deletePlannedPurchase('2');

    expect(result).toEqual({
      meta: { code: 200, message: 'Deleted' },
      data: null,
    });
  });

  it('surfaces backend error message on failure', async () => {
    global.fetch.mockResolvedValueOnce(
      response(400, null, 'target date must be in the future')
    );

    await expect(createPlannedPurchase({})).rejects.toThrow(
      'target date must be in the future'
    );
  });

  it('keeps feature-specific response validation explicit', async () => {
    global.fetch.mockResolvedValueOnce(response(200, null));

    await expect(fetchPlannedPurchaseById('1')).rejects.toThrow(
      'The server returned an unexpected planned purchase response structure.'
    );
  });

  it('handles network failure gracefully', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    await expect(fetchPlannedPurchases()).rejects.toThrow(
      'Unable to load planned purchases from the server.'
    );
  });
});
