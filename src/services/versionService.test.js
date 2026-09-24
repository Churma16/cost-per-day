import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { fetchVersion } from './versionService';

vi.mock('axios');

describe('versionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches version.json with no-cache headers and timestamp query param', async () => {
    const mockVersionData = { version: '1.2.3' };
    axios.get.mockResolvedValueOnce({ data: mockVersionData });

    const result = await fetchVersion();

    expect(result).toEqual(mockVersionData);
    expect(axios.get).toHaveBeenCalledWith(
      '/version.json',
      expect.objectContaining({
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
        params: expect.objectContaining({
          timestamp: expect.any(Number),
        }),
      })
    );
  });

  it('propagates error when network request fails', async () => {
    axios.get.mockRejectedValueOnce(new Error('Network Error'));

    await expect(fetchVersion()).rejects.toThrow('Network Error');
  });
});
