import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchDashboardData } from './dashboardService';

const response = (status, data, message = 'Success') => ({
  ok: status >= 200 && status < 300,
  status,
  json: vi.fn().mockResolvedValue({
    meta: { code: status, message },
    data,
  }),
});

describe('dashboardService', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    delete global.fetch;
  });

  it('successfully fetches dashboard data payload', async () => {
    const mockDashboardData = {
      totalDailyCost: 15.5,
      currencyCode: 'USD',
      insights: [
        {
          kind: 'best_value',
          eyebrow: 'Best Value',
          primary: 'Office Chair',
          secondary: '$0.50/day',
          caption: 'Owned for 300 days',
        },
      ],
    };

    global.fetch.mockResolvedValueOnce(response(200, mockDashboardData));

    const result = await fetchDashboardData();

    expect(result).toEqual(mockDashboardData);
    expect(global.fetch).toHaveBeenCalledWith('/api/dashboard', expect.objectContaining({
      credentials: 'include',
      headers: expect.objectContaining({ Accept: 'application/json' }),
    }));
  });

  it('surfaces backend error message when request fails', async () => {
    global.fetch.mockResolvedValueOnce(response(401, null, 'Authentication required.'));

    await expect(fetchDashboardData()).rejects.toThrow('Authentication required.');
  });

  it('keeps dashboard response-shape validation explicit', async () => {
    global.fetch.mockResolvedValueOnce(response(200, []));

    await expect(fetchDashboardData()).rejects.toThrow(
      'The server returned an unexpected dashboard response structure.'
    );
  });

  it('handles general network failure gracefully', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network Error'));

    await expect(fetchDashboardData()).rejects.toThrow(
      'Unable to reach the server. Check your connection and try again.'
    );
  });
});
