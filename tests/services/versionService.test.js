import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchVersion } from '../../src/services/versionService';

describe('versionService', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('fetches version.json with browser caching disabled', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({ version: '0.2.0-beta.1', revision: 'build-a' }),
    });

    const result = await fetchVersion();

    expect(result).toEqual({ version: '0.2.0-beta.1', revision: 'build-a' });
    expect(fetch).toHaveBeenCalledWith('/version.json', {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    });
  });

  it('rejects non-success responses', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
    });

    await expect(fetchVersion()).rejects.toThrow(
      'Version request failed with status 503'
    );
  });

  it('propagates network errors', async () => {
    fetch.mockRejectedValueOnce(new Error('Network Error'));

    await expect(fetchVersion()).rejects.toThrow('Network Error');
  });
});
