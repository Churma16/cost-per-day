import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  durabilityHttpClient,
  fetchDurabilityAnalytics,
  fetchCategories,
  fetchBrands,
} from './durabilityService';

describe('durabilityService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('successfully fetches durability analytics with and without query parameters', async () => {
    const mockAnalytics = {
      totalCompletedItems: 3,
      totalCategorizedCompletedItems: 3,
      mostFrequentlyReplacedCategory: {
        category: 'Audio',
        completedCount: 2,
        typicalReplacementIntervalDays: 365,
      },
      categories: [
        {
          category: 'Audio',
          completedCount: 2,
          averageLifetimeDays: 400,
          medianLifetimeDays: 400,
          averageFinalCostPerDay: 0.5,
          medianFinalCostPerDay: 0.5,
          typicalReplacementIntervalDays: 365,
          longestLastingBrand: 'Sony',
          lowestCostBrand: 'Sony',
          comparisonSummaryText: 'In your history for Audio, Sony lasted longest.',
          brands: [],
        },
      ],
    };

    const getSpy = vi.spyOn(durabilityHttpClient, 'get').mockResolvedValueOnce({
      data: {
        meta: { code: 200, message: 'Success' },
        data: mockAnalytics,
      },
    });

    const result = await fetchDurabilityAnalytics();
    expect(result).toEqual(mockAnalytics);
    expect(getSpy).toHaveBeenCalledWith('/api/insights/durability');

    // With parameters
    getSpy.mockResolvedValueOnce({
      data: {
        meta: { code: 200, message: 'Success' },
        data: mockAnalytics,
      },
    });

    const filteredResult = await fetchDurabilityAnalytics({ category: 'Audio', brand: 'Sony' });
    expect(filteredResult).toEqual(mockAnalytics);
    expect(getSpy).toHaveBeenCalledWith('/api/insights/durability?category=Audio&brand=Sony');
  });

  it('handles backend error message when fetching analytics', async () => {
    vi.spyOn(durabilityHttpClient, 'get').mockRejectedValueOnce({
      response: {
        status: 500,
        data: {
          meta: { message: 'Database connection failed' },
        },
      },
    });

    await expect(fetchDurabilityAnalytics()).rejects.toThrow('Database connection failed');
  });

  it('successfully fetches categories list', async () => {
    const mockCategories = [
      { id: 1, name: 'Audio' },
      { id: 2, name: 'Footwear' },
    ];

    vi.spyOn(durabilityHttpClient, 'get').mockResolvedValueOnce({
      data: {
        meta: { code: 200, message: 'Success' },
        data: mockCategories,
      },
    });

    const result = await fetchCategories();
    expect(result).toEqual(mockCategories);
  });

  it('successfully fetches brands list', async () => {
    const mockBrands = [
      { id: 1, name: 'Sony' },
      { id: 2, name: 'Nike' },
    ];

    vi.spyOn(durabilityHttpClient, 'get').mockResolvedValueOnce({
      data: {
        meta: { code: 200, message: 'Success' },
        data: mockBrands,
      },
    });

    const result = await fetchBrands();
    expect(result).toEqual(mockBrands);
  });
});
