import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ReplacementBenchmarkModal from './ReplacementBenchmarkModal';
import { useCurrency } from '../contexts/CurrencyContext';
import { useReplacementBenchmark } from '../hooks/useBenchmark';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => {
      const dictionary = {
        replacementBenchmark: 'Replacement Benchmark',
        benchmarkDescription: 'Compare a planned replacement purchase against this completed item.',
        candidatePrice: 'Planned replacement price',
        enterCandidatePrice: 'Enter replacement price',
        previousOwnershipDays: `Duration: ${options?.days} days`,
        previousFinalCostPerDay: `Final cost: ${options?.amount}/day`,
        previousTargetCostPerDay: `Previous target: ${options?.amount}/day`,
        benchmarkResultRequiredDuration: `Required duration to match prior final rate (${options?.rate}/day)`,
        benchmarkResultTargetDuration: `Required duration to match prior target (${options?.rate}/day)`,
        benchmarkResultDays: `~${options?.days} days`,
        benchmarkResultDaysToBeat: `Must last at least ${options?.days} days to beat prior rate`,
        useBenchmarkAsTarget: 'Use as Target',
        benchmarkUnmatchableZeroCost: 'This item had a zero or negative net ownership cost (sold at or above purchase price). A new purchase cannot match a zero-cost baseline.',
        close: 'Close',
        loading: 'Loading...'
      };
      return dictionary[key] || key;
    }
  })
}));

vi.mock('../contexts/CurrencyContext', () => ({
  useCurrency: vi.fn()
}));

vi.mock('../hooks/useBenchmark', () => ({
  useReplacementBenchmark: vi.fn()
}));

describe('ReplacementBenchmarkModal component', () => {
  const mockCompletedItem = {
    id: 'item-10',
    name: 'Old Headphones',
    status: 'retired',
    ownershipDays: 200,
    grossCostPerDay: 1.5,
    netCostPerDay: 1.5,
    targetCostPerDay: 1.0,
    targetDurationDays: 300
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useCurrency.mockReturnValue({
      currencyCode: 'USD',
      currencySymbol: '$'
    });
    useReplacementBenchmark.mockReturnValue({
      data: null,
      isLoading: false,
      error: null
    });
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <ReplacementBenchmarkModal
        isOpen={false}
        onClose={vi.fn()}
        completedItem={mockCompletedItem}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders completed item details and accepts candidate price or initial candidate price', () => {
    render(
      <ReplacementBenchmarkModal
        isOpen={true}
        onClose={vi.fn()}
        completedItem={mockCompletedItem}
        initialCandidatePrice={250}
      />
    );

    expect(screen.getByText('Replacement Benchmark')).toBeInTheDocument();
    expect(screen.getByText('Old Headphones')).toBeInTheDocument();
    expect(screen.getByText('Duration: 200 days')).toBeInTheDocument();

    const priceInput = screen.getByPlaceholderText('Enter replacement price');
    expect(priceInput.value).toBe('250');

    fireEvent.change(priceInput, { target: { value: '300' } });
    expect(priceInput.value).toBe('300');
  });

  it('displays benchmark results with canonical backend contract and calls onApplyBenchmark', () => {
    const onApplyBenchmark = vi.fn();
    const onClose = vi.fn();

    useReplacementBenchmark.mockReturnValue({
      data: {
        itemId: 'item-10',
        itemName: 'Old Headphones',
        itemStatus: 'retired',
        previousPrice: 300,
        finalOwnershipDays: 200,
        finalCostPerDay: 1.5,
        candidatePrice: 300,
        daysToMatchPrevious: 200,
        daysToBeatPrevious: 201,
        hasTarget: true,
        targetCostPerDay: 1.0,
        daysToMatchTarget: 300
      },
      isLoading: false,
      error: null
    });

    render(
      <ReplacementBenchmarkModal
        isOpen={true}
        onClose={onClose}
        completedItem={mockCompletedItem}
        onApplyBenchmark={onApplyBenchmark}
      />
    );

    expect(screen.getByText('~200 days')).toBeInTheDocument();
    expect(screen.getByText('Must last at least 201 days to beat prior rate')).toBeInTheDocument();
    expect(screen.getByText('~300 days')).toBeInTheDocument();

    const applyButton = screen.getByRole('button', { name: 'Use as Target' });
    fireEvent.click(applyButton);

    expect(onApplyBenchmark).toHaveBeenCalledWith(expect.objectContaining({
      daysToMatchPrevious: 200
    }));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onCandidatePriceChange when candidate price is modified', () => {
    const onCandidatePriceChange = vi.fn();
    render(
      <ReplacementBenchmarkModal
        isOpen={true}
        onClose={vi.fn()}
        completedItem={mockCompletedItem}
        initialCandidatePrice={250}
        onCandidatePriceChange={onCandidatePriceChange}
      />
    );

    const priceInput = screen.getByPlaceholderText('Enter replacement price');
    fireEvent.change(priceInput, { target: { value: '350' } });

    expect(priceInput.value).toBe('350');
    expect(onCandidatePriceChange).toHaveBeenCalledWith('350');
  });

  it('displays unmatchable warning notice and omits apply button when benchmark is unmatchable', () => {
    const onApplyBenchmark = vi.fn();

    useReplacementBenchmark.mockReturnValue({
      data: {
        itemId: 'item-10',
        itemName: 'Old Headphones',
        itemStatus: 'sold',
        previousPrice: 300,
        finalOwnershipDays: 200,
        finalCostPerDay: 0,
        candidatePrice: 300,
        daysToMatchPrevious: null,
        daysToBeatPrevious: null,
        hasTarget: false,
        isUnmatchable: true,
        unmatchableReason: 'item had zero or negative net ownership cost'
      },
      isLoading: false,
      error: null
    });

    render(
      <ReplacementBenchmarkModal
        isOpen={true}
        onClose={vi.fn()}
        completedItem={mockCompletedItem}
        onApplyBenchmark={onApplyBenchmark}
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'This item had a zero or negative net ownership cost'
    );
    expect(screen.queryByRole('button', { name: 'Use as Target' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Required duration to match prior final rate/i)).not.toBeInTheDocument();
  });
});
