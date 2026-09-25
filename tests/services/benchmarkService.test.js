import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchReplacementBenchmark } from '../../src/services/benchmarkService';
import * as apiModule from '../../src/services/api';

describe('benchmarkService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('successfully fetches replacement benchmark payload using shared api client', async () => {
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
      isUnmatchable: false
    };

    vi.spyOn(apiModule, 'getReplacementBenchmark').mockResolvedValueOnce(mockBenchmarkData);

    const result = await fetchReplacementBenchmark('item-1', 600.0);
    expect(result).toEqual(mockBenchmarkData);
    expect(apiModule.getReplacementBenchmark).toHaveBeenCalledWith('item-1', 600.0);
  });

  it('surfaces backend error message when api client fails', async () => {
    vi.spyOn(apiModule, 'getReplacementBenchmark').mockRejectedValueOnce(
      new Error('Benchmark requires a completed item.')
    );

    await expect(fetchReplacementBenchmark('item-1', 500)).rejects.toThrow('Benchmark requires a completed item.');
  });
});
