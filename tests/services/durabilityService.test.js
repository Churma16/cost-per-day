import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchDurabilityAnalytics,
  fetchCategories,
  fetchBrands,
} from '../../src/services/durabilityService';

const response = (status, data, message = 'Success') => ({
  ok: status >= 200 && status < 300,
  status,
  json: vi.fn().mockResolvedValue({
    meta: { code: status, message },
    data,
  }),
});

describe('durabilityService', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    delete global.fetch;
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

    global.fetch
      .mockResolvedValueOnce(response(200, mockAnalytics))
      .mockResolvedValueOnce(response(200, mockAnalytics));

    const result = await fetchDurabilityAnalytics();
    expect(result).toEqual(mockAnalytics);
    expect(global.fetch.mock.calls[0][0]).toBe('/api/insights/durability');

    const filteredResult = await fetchDurabilityAnalytics({ category: 'Audio', brand: 'Sony' });
    expect(filteredResult).toEqual(mockAnalytics);
    expect(global.fetch.mock.calls[1][0]).toBe('/api/insights/durability?category=Audio&brand=Sony');
  });

  it('handles backend error message when fetching analytics', async () => {
    global.fetch.mockResolvedValueOnce(response(500, null, 'Database connection failed'));

    await expect(fetchDurabilityAnalytics()).rejects.toThrow('Database connection failed');
  });

  it('keeps durability analytics response validation explicit', async () => {
    global.fetch.mockResolvedValueOnce(response(200, []));

    await expect(fetchDurabilityAnalytics()).rejects.toThrow(
      'The server returned an unexpected durability analytics response structure.'
    );
  });

  it('successfully fetches categories list', async () => {
    const mockCategories = [
      { id: 1, name: 'Audio' },
      { id: 2, name: 'Footwear' },
    ];

    global.fetch.mockResolvedValueOnce(response(200, mockCategories));

    const result = await fetchCategories();
    expect(result).toEqual(mockCategories);
  });

  it('rejects malformed category data', async () => {
    global.fetch.mockResolvedValueOnce(response(200, { name: 'Audio' }));

    await expect(fetchCategories()).rejects.toThrow(
      'The server returned an unexpected categories response structure.'
    );
  });

  it('successfully fetches brands list', async () => {
    const mockBrands = [
      { id: 1, name: 'Sony' },
      { id: 2, name: 'Nike' },
    ];

    global.fetch.mockResolvedValueOnce(response(200, mockBrands));

    const result = await fetchBrands();
    expect(result).toEqual(mockBrands);
  });

  it('uses a feature-specific network fallback without reimplementing transport handling', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    await expect(fetchBrands()).rejects.toThrow(
      'Unable to load brands from the server.'
    );
  });
});
