import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dashboardHttpClient, fetchDashboardData } from './dashboardService';

describe('dashboardService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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

    vi.spyOn(dashboardHttpClient, 'get').mockResolvedValueOnce({
      data: {
        meta: { code: 200, message: 'Success' },
        data: mockDashboardData,
      },
    });

    const result = await fetchDashboardData();
    expect(result).toEqual(mockDashboardData);
  });

  it('surfaces backend error message when request fails', async () => {
    vi.spyOn(dashboardHttpClient, 'get').mockRejectedValueOnce({
      response: {
        status: 401,
        data: {
          meta: { code: 401, message: 'Authentication required.' },
        },
      },
    });

    await expect(fetchDashboardData()).rejects.toThrow('Authentication required.');
  });

  it('handles general network failure gracefully', async () => {
    vi.spyOn(dashboardHttpClient, 'get').mockRejectedValueOnce(new Error('Network Error'));

    await expect(fetchDashboardData()).rejects.toThrow(
      'Unable to reach the server. Check your connection and try again.'
    );
  });
});
