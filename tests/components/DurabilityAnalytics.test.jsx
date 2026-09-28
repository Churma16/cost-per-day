import React from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
        noDurabilityDataDescription: 'Retire or mark items as sold, with a category and brand, to see how long things last.',
        totalSpentOnBrand: `Total spent: ${options?.amount}`,
        evidence: 'Evidence',
        daysShort: 'days',
        loading: 'Loading...',
        perDay: '/day',
        analyticsLoadErrorDescription: "Couldn't load your history. Check your connection and try again.",
        refreshShowingSavedData: "Couldn't refresh right now. Showing your last saved data.",
        analyticsFilteredEmptyDescription: 'Try another category or view all of your history.',
        clearCategoryFilter: 'View all history',
        tryAgain: 'Try again',
        stillLoadingHistory: 'Still loading your history...',
        replacementNeedsMoreData: 'Not enough history yet. Add at least 2 completed items in the same category to see a replacement pattern.',
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

  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses blank, skeleton, then slow-load feedback while history loads', () => {
    useDurabilityAnalytics.mockReturnValue({
      data: null,
      isLoading: true,
      isError: false,
    });

    vi.useFakeTimers();
    const { container } = render(<DurabilityAnalytics />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(container.querySelector('.state-skeleton')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(container.querySelectorAll('.state-skeleton').length).toBeGreaterThan(0);

    act(() => {
      vi.advanceTimersByTime(1800);
    });
    expect(screen.getByRole('status')).toHaveTextContent('Still loading your history...');
  });

  it('renders a recoverable initial load error without raw transport copy', () => {
    const refetch = vi.fn();
    useDurabilityAnalytics.mockReturnValue({
      data: null,
      isLoading: false,
      isError: true,
      error: new Error('raw analytics failure'),
      refetch,
    });

    render(<DurabilityAnalytics />);

    const errorState = screen.getByRole('status');
    expect(errorState).toHaveTextContent("Couldn't load your history. Check your connection and try again.");
    expect(errorState).not.toHaveTextContent('raw analytics failure');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalledTimes(1);
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
    expect(screen.getByText('Retire or mark items as sold, with a category and brand, to see how long things last.')).toBeInTheDocument();
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
    expect(screen.getByText("Couldn't refresh right now. Showing your last saved data.")).toBeInTheDocument();
    expect(screen.queryByText('Temporary network failure')).not.toBeInTheDocument();
  });

  it('distinguishes a category filter with no matching history and can clear it', async () => {
    useDurabilityAnalytics.mockImplementation(({ category }) => ({
      data: category
        ? {
            totalCompletedItems: 3,
            totalCategorizedCompletedItems: 3,
            mostFrequentlyReplacedCategory: null,
            categories: [],
          }
        : {
            totalCompletedItems: 3,
            totalCategorizedCompletedItems: 3,
            mostFrequentlyReplacedCategory: null,
            categories: [{
              category: 'Footwear',
              completedCount: 1,
              averageLifetimeDays: 180,
              medianLifetimeDays: 180,
              averageFinalCostPerDay: 1,
              brands: [],
            }],
          },
      isLoading: false,
      isError: false,
    }));

    render(<DurabilityAnalytics />);
    fireEvent.click(screen.getByRole('button', { name: 'Audio' }));

    expect(await screen.findByText('Try another category or view all of your history.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'View all history' }));
    expect(useDurabilityAnalytics).toHaveBeenLastCalledWith({ category: '' });
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
