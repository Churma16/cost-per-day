import { describe, it, expect, vi, beforeEach } from 'vitest';
import { benchmarkHttpClient, fetchReplacementBenchmark } from './benchmarkService';

describe('benchmarkService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('successfully fetches replacement benchmark payload', async () => {
    const mockBenchmarkData = {
      itemId: 'item-1',
      itemName: 'Old Phone',
      itemStatus: 'retired',
      previousPrice: 500.0,
      finalOwnershipDays: 100,
      finalCostPerDay: 5.0,
      candidatePrice: 600.0,
      daysToMatchPrevious: 120,
      daysToBeatPrevious: 121,
      hasTarget: true,
      targetCostPerDay: 3.0,
      daysToMatchTarget: 200,
    };

    vi.spyOn(benchmarkHttpClient, 'get').mockResolvedValueOnce({
      data: {
        meta: { code: 200, message: 'Success' },
        data: mockBenchmarkData,
      },
    });

    const result = await fetchReplacementBenchmark('item-1', 600.0);
    expect(result).toEqual(mockBenchmarkData);
    expect(benchmarkHttpClient.get).toHaveBeenCalledWith(
      '/api/items/item-1/replacement-benchmark',
      {
        params: { price: 600.0 },
      }
    );
  });

  it('surfaces backend error message when request fails', async () => {
    vi.spyOn(benchmarkHttpClient, 'get').mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          meta: { code: 400, message: 'Benchmark requires a completed item.' },
        },
      },
    });

    await expect(fetchReplacementBenchmark('item-1', 500)).rejects.toThrow('Benchmark requires a completed item.');
  });

  it('handles general network failure gracefully', async () => {
    vi.spyOn(benchmarkHttpClient, 'get').mockRejectedValueOnce(new Error('Network Error'));

    await expect(fetchReplacementBenchmark('item-1', 500)).rejects.toThrow(
      'Unable to reach the server. Check your connection and try again.'
    );
  });
});
