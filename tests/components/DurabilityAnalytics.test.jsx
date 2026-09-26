import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DurabilityAnalytics from '../../src/components/DurabilityAnalytics';
import { useDurabilityAnalytics, useCategories } from '../../src/hooks/useDurabilityAnalytics';
import { useCurrency } from '../../src/contexts/CurrencyContext';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => {
      const dictionary = {
        underDevelopment: 'Under Development',
        durabilityAndOwnership: 'Ownership Over Time',
        durabilitySubtitle: 'Personal history of how long categories and brands last.',
        filterByCategory: 'Filter by Category',
        allCategories: 'All Categories',
        completedItemsCount: `${options?.count} completed items`,
        averageLifespan: 'Average lifespan',
        medianLifespan: 'Median lifespan',
        currentCostPerDay: 'Current cost per day',
        typicalReplacementInterval: 'Typical replacement interval',
        mostFrequentlyReplacedCategory: 'Category you replaced most often',
        longestLastingBrand: 'Longest lasting brand',
        lowestCostBrand: 'Lowest observed cost per day',
        brandComparison: 'Brand Comparison',
        patternDetected: `Based on ${options?.count} items`,
        singleObservation: 'Single observation (1 item)',
        viewEvidence: 'View item history',
        hideEvidence: 'Hide item history',
        noDurabilityDataTitle: 'No durability history yet',
        noDurabilityDataDescription: 'Retire or mark items as sold to see insights.',
        totalSpentOnBrand: `Total spent: ${options?.amount}`,
        evidence: 'Evidence',
        daysShort: 'days',
        loading: 'Loading...',
        perDay: '/day',
      };
      return dictionary[key] || key;
    },
  }),
}));

vi.mock('../../src/hooks/useDurabilityAnalytics', () => ({
  useDurabilityAnalytics: vi.fn(),
  useCategories: vi.fn(),
}));

vi.mock('../../src/contexts/CurrencyContext', () => ({
  useCurrency: vi.fn(),
}));

describe('DurabilityAnalytics Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCurrency.mockReturnValue({
      currencySymbol: '$',
      currencyCode: 'USD',
    });
    useCategories.mockReturnValue({
      data: [{ id: 1, name: 'Audio' }, { id: 2, name: 'Footwear' }],
    });
  });

  it('renders loading state when query is loading', () => {
    useDurabilityAnalytics.mockReturnValue({
      data: null,
      isLoading: true,
      isError: false,
    });

    render(<DurabilityAnalytics />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders empty state when there are no completed items', () => {
    useDurabilityAnalytics.mockReturnValue({
      data: {
        totalCompletedItems: 0,
        totalCategorizedCompletedItems: 0,
        mostFrequentlyReplacedCategory: null,
        categories: [],
      },
      isLoading: false,
      isError: false,
    });

    render(<DurabilityAnalytics />);
    expect(screen.getByText('No durability history yet')).toBeInTheDocument();
    expect(screen.getByText('Retire or mark items as sold to see insights.')).toBeInTheDocument();
  });

  it('keeps cached analytics visible when a background refresh fails', () => {
    useDurabilityAnalytics.mockReturnValue({
      data: {
        totalCompletedItems: 0,
        totalCategorizedCompletedItems: 0,
        mostFrequentlyReplacedCategory: null,
        categories: [],
      },
      isLoading: false,
      isError: true,
      error: new Error('Temporary network failure'),
    });

    render(<DurabilityAnalytics />);

    expect(screen.getByText('No durability history yet')).toBeInTheDocument();
    expect(screen.queryByText('Temporary network failure')).not.toBeInTheDocument();
  });

  it('renders category and brand durability analytics with pattern and observation badges', () => {
    useDurabilityAnalytics.mockReturnValue({
      data: {
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
            averageLifetimeDays: 730,
            medianLifetimeDays: 730,
            averageFinalCostPerDay: 0.25,
            medianFinalCostPerDay: 0.25,
            typicalReplacementIntervalDays: 365,
            longestLastingBrand: 'Sony',
            lowestCostBrand: 'Sony',
            comparisonSummaryText: 'In your history for Audio, Sony lasted longest.',
            brands: [
              {
                brand: 'Sony',
                completedCount: 2,
                sampleSize: 2,
                isPattern: true,
                averageLifetimeDays: 730,
                medianLifetimeDays: 730,
                averageFinalCostPerDay: 0.25,
                totalSpent: 365,
                observationText: 'Based on 2 completed items, Sony averaged 730 days.',
                items: [
                  {
                    id: 'item-1',
                    name: 'Sony XM4',
                    status: 'retired',
                    purchaseDate: '2022-01-01',
                    endedAt: '2024-01-01',
                    ownershipDays: 730,
                    finalCostPerDay: 0.25,
                  },
                ],
              },
            ],
          },
        ],
      },
      isLoading: false,
      isError: false,
    });

    render(<DurabilityAnalytics />);

    expect(screen.getByText('Ownership Over Time')).toBeInTheDocument();
    expect(screen.getByText('Under Development')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Audio' })).toBeInTheDocument();
    expect(screen.getByText('In your history for Audio, Sony lasted longest.')).toBeInTheDocument();
    expect(screen.getByText('Based on 2 items')).toBeInTheDocument();
    expect(screen.getByText('"Based on 2 completed items, Sony averaged 730 days."')).toBeInTheDocument();

    // Toggle evidence
    const viewEvidenceButton = screen.getByRole('button', { name: /View item history/i });
    fireEvent.click(viewEvidenceButton);

    expect(screen.getByText('Sony XM4')).toBeInTheDocument();
    expect(screen.getByText('Hide item history (1)')).toBeInTheDocument();
  });

  it('handles category filter selection', () => {
    useDurabilityAnalytics.mockReturnValue({
      data: {
        totalCompletedItems: 1,
        totalCategorizedCompletedItems: 1,
        categories: [],
      },
      isLoading: false,
      isError: false,
    });

    render(<DurabilityAnalytics />);

    const audioButton = screen.getByRole('button', { name: 'Audio' });
    fireEvent.click(audioButton);

    expect(useDurabilityAnalytics).toHaveBeenCalledWith({ category: 'Audio' });
  });
});
