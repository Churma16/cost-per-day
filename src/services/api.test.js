import { vi } from 'vitest';
import {
  addItem,
  updateItem,
  getAllItems,
  getSetting,
  replaceAllItems,
  getCurrentUser,
  logoutCurrentUser,
  getGoogleLoginUrl,
  resolveApiBaseUrl,
  getAllValueEquivalents,
  createValueEquivalent,
  updateValueEquivalent,
  deleteValueEquivalent
} from './api';

const response = (status, data, message = 'ok') => ({
  ok: status >= 200 && status < 300,
  status,
  json: vi.fn().mockResolvedValue({
    meta: { code: status, message },
    data
  })
});

describe('frontend API client', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    delete global.fetch;
  });

  test('loads server-backed items through the centralized API boundary', async () => {
    const items = [{ id: '1', name: 'Laptop', price: 1200, purchaseDate: '2026-09-22T12:00:00Z' }];
    global.fetch.mockResolvedValue(response(200, items, 'items retrieved successfully'));

    await expect(getAllItems()).resolves.toEqual(items);
    expect(global.fetch).toHaveBeenCalledWith('/api/items', expect.objectContaining({
      headers: expect.objectContaining({ Accept: 'application/json' }),
      credentials: 'include'
    }));
  });

  test('creates items without sending server-owned identity fields', async () => {
    global.fetch.mockResolvedValue(response(201, {
      id: '9',
      name: 'Headphones',
      price: 300,
      purchaseDate: '2026-09-22T12:00:00Z'
    }));

    await addItem({
      id: 'legacy-id',
      name: 'Headphones',
      price: 300,
      purchaseDate: '2026-09-22T12:00:00Z',
      createdAt: 'ignored',
      updatedAt: 'ignored'
    });

    const [, options] = global.fetch.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({
      name: 'Headphones',
      price: 300,
      purchaseDate: '2026-09-22T12:00:00Z'
    });
  });

  test('updates lifecycle facts without sending derived ownership metrics', async () => {
    global.fetch.mockResolvedValue(response(200, {
      id: '9',
      name: 'Headphones',
      price: 300,
      purchaseDate: '2026-09-01T12:00:00Z',
      status: 'sold',
      endedAt: '2026-09-11T12:00:00Z',
      salePrice: 100,
      ownershipDays: 10,
      grossCostPerDay: 30,
      netOwnershipCost: 200,
      netCostPerDay: 20
    }));

    await updateItem('9', {
      name: 'Headphones',
      price: 300,
      purchaseDate: '2026-09-01T12:00:00Z',
      status: 'sold',
      endedAt: '2026-09-11T12:00:00Z',
      salePrice: 100,
      ownershipDays: 10,
      grossCostPerDay: 30,
      netOwnershipCost: 200,
      netCostPerDay: 20
    });

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/items/9');
    expect(options.method).toBe('PUT');
    expect(JSON.parse(options.body)).toEqual({
      name: 'Headphones',
      price: 300,
      purchaseDate: '2026-09-01T12:00:00Z',
      status: 'sold',
      endedAt: '2026-09-11T12:00:00Z',
      salePrice: 100
    });
  });

  test('loads shared settings from the backend', async () => {
    global.fetch.mockResolvedValue(response(200, {
      language: 'id',
      currency: 'IDR'
    }));

    await expect(getSetting('language')).resolves.toBe('id');
    expect(global.fetch).toHaveBeenCalledWith('/api/settings', expect.any(Object));
  });

  test('surfaces backend error messages', async () => {
    global.fetch.mockResolvedValue(response(500, null, 'failed to retrieve items'));

    await expect(getAllItems()).rejects.toThrow('failed to retrieve items');
  });

  test('turns network failures into a clear connection error', async () => {
    global.fetch.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(getAllItems()).rejects.toThrow(
      'Unable to reach the server. Check the backend connection and try again.'
    );
  });

  test('replaces all items with one backend request and strips server-owned fields', async () => {
    const imported = [{
      id: 'legacy-id',
      name: 'Imported',
      price: 200,
      purchaseDate: '2026-09-21T12:00:00Z',
      createdAt: 'ignored',
      updatedAt: 'ignored'
    }];
    const replaced = [{
      id: '2',
      name: 'Imported',
      price: 200,
      purchaseDate: '2026-09-21T12:00:00Z'
    }];
    global.fetch.mockResolvedValue(response(200, replaced, 'items replaced successfully'));

    await expect(replaceAllItems(imported)).resolves.toEqual(replaced);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/items/replace');
    expect(options.method).toBe('PUT');
    expect(JSON.parse(options.body)).toEqual([{
      name: 'Imported',
      price: 200,
      purchaseDate: '2026-09-21T12:00:00Z'
    }]);
  });

  test('loads and logs out the current authenticated user with cookies', async () => {
    global.fetch
      .mockResolvedValueOnce(response(200, {
        id: 'user-1',
        email: 'user@example.com',
        displayName: 'User'
      }, 'current user retrieved successfully'))
      .mockResolvedValueOnce(response(200, null, 'logged out successfully'));

    await expect(getCurrentUser()).resolves.toEqual(expect.objectContaining({
      id: 'user-1',
      email: 'user@example.com'
    }));
    await expect(logoutCurrentUser()).resolves.toBeNull();

    expect(global.fetch.mock.calls[0][0]).toBe('/api/me');
    expect(global.fetch.mock.calls[0][1]).toEqual(expect.objectContaining({
      credentials: 'include'
    }));
    expect(global.fetch.mock.calls[1][0]).toBe('/auth/logout');
    expect(global.fetch.mock.calls[1][1]).toEqual(expect.objectContaining({
      method: 'POST',
      credentials: 'include'
    }));
  });

  test('uses static VITE_API_BASE_URL when configured and handles trailing slashes', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com/');

    expect(resolveApiBaseUrl()).toBe('https://api.example.com');
    expect(getGoogleLoginUrl()).toBe('https://api.example.com/auth/google/login');

    global.fetch.mockResolvedValue(response(200, [], 'items retrieved successfully'));
    await getAllItems();

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/api/items',
      expect.objectContaining({ credentials: 'include' })
    );

    vi.unstubAllEnvs();
    expect(resolveApiBaseUrl()).toBe('');
  });

  test('performs value equivalents CRUD operations through API boundary', async () => {
    const sampleEquivalents = [
      { id: '1', name: 'Coffee', amount: 15000, currencyCode: 'IDR' }
    ];

    // List
    global.fetch.mockResolvedValueOnce(response(200, sampleEquivalents, 'value equivalents retrieved'));
    await expect(getAllValueEquivalents()).resolves.toEqual(sampleEquivalents);
    expect(global.fetch).toHaveBeenCalledWith('/api/value-equivalents', expect.objectContaining({
      credentials: 'include'
    }));

    // Create
    global.fetch.mockResolvedValueOnce(response(201, sampleEquivalents[0], 'created'));
    await createValueEquivalent({ name: 'Coffee', amount: 15000, currencyCode: 'idr' });
    expect(global.fetch.mock.calls[1][0]).toBe('/api/value-equivalents');
    expect(global.fetch.mock.calls[1][1]).toEqual(expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ name: 'Coffee', amount: 15000, currencyCode: 'IDR' })
    }));

    // Update
    global.fetch.mockResolvedValueOnce(response(200, { ...sampleEquivalents[0], amount: 18000 }, 'updated'));
    await updateValueEquivalent('1', { name: 'Coffee', amount: 18000, currencyCode: 'IDR' });
    expect(global.fetch.mock.calls[2][0]).toBe('/api/value-equivalents/1');
    expect(global.fetch.mock.calls[2][1]).toEqual(expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({ name: 'Coffee', amount: 18000, currencyCode: 'IDR' })
    }));

    // Delete
    global.fetch.mockResolvedValueOnce(response(200, null, 'deleted'));
    await deleteValueEquivalent('1');
    expect(global.fetch.mock.calls[3][0]).toBe('/api/value-equivalents/1');
    expect(global.fetch.mock.calls[3][1]).toEqual(expect.objectContaining({
      method: 'DELETE'
    }));
  });
});
