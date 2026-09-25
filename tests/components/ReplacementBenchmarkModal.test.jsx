import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ReplacementBenchmarkModal from '../../src/components/ReplacementBenchmarkModal';
import { useCurrency } from '../../src/contexts/CurrencyContext';
import { useReplacementBenchmark } from '../../src/hooks/useBenchmark';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => {
      const dictionary = {
        replacementBenchmark: 'Past Item Baseline',
        benchmarkDescription: "Use your previous item's history to see how long this purchase needs to last to reach the same final daily ownership cost.",
        candidatePrice: 'New item price',
        enterCandidatePrice: 'Enter new item price',
        previousOwnershipDays: `Duration: ${options?.days} days`,
        previousFinalCostPerDay: `Final daily ownership cost: ${options?.amount}/day`,
        previousTargetCostPerDay: `Previous target: ${options?.amount}/day`,
        benchmarkResultRequiredDuration: `To reach your previous item's final daily ownership cost (${options?.rate}/day):`,
        benchmarkResultTargetDuration: `To reach the previous target daily ownership cost (${options?.rate}/day):`,
        benchmarkResultDays: `~${options?.days} days`,
        benchmarkResultDaysToBeat: `After ${options?.days} days, its daily ownership cost would be lower than your previous item's`,
        useBenchmarkAsTarget: 'Set as Ownership Target',
        benchmarkEmptyHint: `Enter a price above to calculate how long this purchase needs to last to reach the same daily ownership cost of ${options?.amount}/day.`,
        benchmarkUnmatchableZeroCost: 'This item had a zero or negative net ownership cost (sold at or above purchase price). A new purchase cannot match a zero-cost baseline.',
        cancel: 'Cancel',
        close: 'Close',
        loading: 'Loading...',
        statusRetired: 'No Longer in Use',
        statusSold: 'Changed Hands',
        statusLost: 'Lost'
      };
      return dictionary[key] || key;
    }
  })
}));

vi.mock('../../src/contexts/CurrencyContext', () => ({
  useCurrency: vi.fn()
}));

vi.mock('../../src/hooks/useBenchmark', () => ({
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

  it('displays empty state prompt and disabled apply button when price is empty', () => {
    render(
      <ReplacementBenchmarkModal
        isOpen={true}
        onClose={vi.fn()}
        completedItem={mockCompletedItem}
        initialCandidatePrice=""
        onApplyBenchmark={vi.fn()}
      />
    );

    expect(screen.getByText(/Enter a price above to calculate/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Set as Ownership Target' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();
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

    expect(screen.getByText('Past Item Baseline')).toBeInTheDocument();
    expect(screen.getByText('Old Headphones')).toBeInTheDocument();
    expect(screen.getByText('Duration: 200 days')).toBeInTheDocument();
    expect(screen.getByText('Final daily ownership cost: $1.50/day')).toBeInTheDocument();
    expect(screen.getByText('No Longer in Use')).toBeInTheDocument();

    const priceInput = screen.getByPlaceholderText('Enter new item price');
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
        initialCandidatePrice={300}
        onApplyBenchmark={onApplyBenchmark}
      />
    );

    expect(screen.getByText('~200 days')).toBeInTheDocument();
    expect(screen.getByText("After 201 days, its daily ownership cost would be lower than your previous item's")).toBeInTheDocument();
    expect(screen.getByText('~300 days')).toBeInTheDocument();

    const applyButton = screen.getByRole('button', { name: 'Set as Ownership Target' });
    expect(applyButton).toBeEnabled();
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

    const priceInput = screen.getByPlaceholderText('Enter new item price');
    fireEvent.change(priceInput, { target: { value: '350' } });

    expect(priceInput.value).toBe('350');
    expect(onCandidatePriceChange).toHaveBeenCalledWith('350');
  });

  it('displays unmatchable warning notice and disables apply button when benchmark is unmatchable', () => {
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
        initialCandidatePrice={300}
        onApplyBenchmark={onApplyBenchmark}
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'This item had a zero or negative net ownership cost'
    );
    expect(screen.getByRole('button', { name: 'Set as Ownership Target' })).toBeDisabled();
    expect(screen.queryByText(/final daily ownership cost/i)).not.toBeInTheDocument();
  });
});
