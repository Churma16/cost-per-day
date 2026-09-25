import { vi } from 'vitest';
import {
  ApiError,
  apiRequest,
  apiRequestEnvelope,
  buildApiUrl,
  resolveApiBaseUrl,
} from '../../src/services/httpClient';

const response = (status, envelope) => ({
  ok: status >= 200 && status < 300,
  status,
  json: vi.fn().mockResolvedValue(envelope),
});

describe('shared frontend HTTP client', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete global.fetch;
  });

  test('extracts successful response envelopes and centralizes request defaults', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com/');
    global.fetch.mockResolvedValue(response(200, {
      meta: { code: 200, message: 'ok' },
      data: { id: 'item-1' },
    }));

    await expect(apiRequest('/api/items')).resolves.toEqual({ id: 'item-1' });
    expect(resolveApiBaseUrl()).toBe('https://api.example.com');
    expect(buildApiUrl('/api/items')).toBe('https://api.example.com/api/items');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/api/items',
      expect.objectContaining({
        credentials: 'include',
        headers: expect.objectContaining({
          Accept: 'application/json',
        }),
      })
    );
  });

  test('serializes JSON requests and applies the shared content type', async () => {
    global.fetch.mockResolvedValue(response(201, {
      meta: { code: 201, message: 'created' },
      data: { id: 'planned-1' },
    }));

    await apiRequest('/api/planned-purchases', {
      method: 'POST',
      json: { name: 'Laptop', targetPrice: 1000 },
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/planned-purchases', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ name: 'Laptop', targetPrice: 1000 }),
      headers: expect.objectContaining({
        Accept: 'application/json',
        'Content-Type': 'application/json',
      }),
      credentials: 'include',
    }));
  });

  test('preserves backend meta.message and normalized error metadata', async () => {
    global.fetch.mockResolvedValue(response(422, {
      meta: { code: 422, message: 'target date must be in the future' },
      data: null,
    }));

    await expect(apiRequest('/api/planned-purchases')).rejects.toMatchObject({
      name: 'ApiError',
      message: 'target date must be in the future',
      status: 422,
      meta: { code: 422, message: 'target date must be in the future' },
    });
  });

  test('falls back to a predictable HTTP status error when no backend message exists', async () => {
    global.fetch.mockResolvedValue(response(503, {
      meta: { code: 503 },
      data: null,
    }));

    await expect(apiRequest('/api/items')).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Request failed with status 503.',
      status: 503,
    });
  });

  test('rejects malformed successful response envelopes', async () => {
    global.fetch.mockResolvedValue(response(200, {
      meta: { code: 200, message: 'ok' },
    }));

    await expect(apiRequest('/api/items')).rejects.toEqual(
      expect.objectContaining({
        name: 'ApiError',
        message: 'The server returned an unexpected response.',
        status: 200,
      })
    );
  });

  test('normalizes network failures without exposing fetch-specific errors', async () => {
    const fetchError = new TypeError('Failed to fetch');
    global.fetch.mockRejectedValue(fetchError);

    await expect(apiRequest('/api/items')).rejects.toEqual(
      expect.objectContaining({
        name: 'ApiError',
        message: 'Unable to reach the server. Check the backend connection and try again.',
        status: null,
        cause: fetchError,
      })
    );
  });

  test('can return the complete validated envelope when a feature contract requires it', async () => {
    const envelope = {
      meta: { code: 200, message: 'deleted' },
      data: null,
    };
    global.fetch.mockResolvedValue(response(200, envelope));

    await expect(apiRequestEnvelope('/api/planned-purchases/1', {
      method: 'DELETE',
    })).resolves.toEqual(envelope);
  });

  test('uses the centralized development fallback when no base URL is configured', () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    vi.stubEnv('MODE', 'development');

    expect(resolveApiBaseUrl()).toBe('http://localhost:8080');
  });

  test('ApiError remains the application-facing transport error type', () => {
    const error = new ApiError('boom', 500);
    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({
      name: 'ApiError',
      message: 'boom',
      status: 500,
    });
  });
});
