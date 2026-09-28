import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { vi } from 'vitest';
import ItemCard from '../../../src/components/item-list/ItemCard';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'en' },
    t: (key, options) => {
      if (key === 'remainingDaysToTarget') {
        return `${options?.days} days remaining`;
      }
      if (key === 'daysBeyondTarget') {
        return `${options?.days} days beyond target`;
      }
      if (key === 'equivalentPerDay') {
        return `${options?.count} ${options?.name}/day`;
      }
      if (key === 'equivalentEveryNDays') {
        return `1 ${options?.name} every ${options?.count} days`;
      }
      if (key === 'equivalentPerMonth') {
        return `${options?.count} ${options?.name}/month`;
      }
      return {
        statusActiveEarly: 'Just Joined You',
        statusActive: 'Still With You',
        statusRetired: 'No Longer in Use',
        statusSold: 'Changed Hands',
        statusLost: 'Lost',
        finalGrossCostPerDay: 'Final gross cost per day',
        purchaseAmount: 'Purchase amount',
        purchaseDate: 'Purchase date',
        unitDays: 'days',
        unitMonths: 'months',
        unitYears: 'years',
        clickToCycleUnit: 'Click to switch between days, months, and years',
        category: 'Category',
        brand: 'Brand',
        ownershipEndDate: 'Ownership end date',
        salePrice: 'Sale price',
        netOwnershipCost: 'Cost after sale',
        netCostPerDay: 'Net cost per day',
        perDay: '/day',
        targetMilestone: 'Target milestone',
        targetStateReached: 'Target reached',
        targetStateNew: 'New',
        benchmarkReplacement: 'Benchmark replacement',
        edit: 'Edit',
        deleteItem: 'Delete',
      }[key] || key;
    },
  }),
}));

describe('ItemCard', () => {
  test('keeps lifecycle state out of the collapsed price summary and in expanded details', () => {
    const item = {
      id: 3,
      name: 'Sold Phone',
      price: 900,
      purchaseDate: '2026-01-01T00:00:00Z',
      ownershipDays: 180,
      grossCostPerDay: 5,
      status: 'sold',
    };

    const { rerender } = render(
      <ItemCard
        item={item}
        isExpanded={false}
        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onBenchmark={vi.fn()}
        currencyCode="USD"
        valueEquivalents={[]}
      />
    );

    const trigger = screen.getByRole('button', { name: /Sold Phone/i });
    const details = document.getElementById('item-details-3');
    const valueStack = trigger.querySelector('[data-item-card-value-stack]');
    expect(valueStack).toHaveClass('flex-col', 'items-end', 'self-stretch', 'justify-between');
    expect(valueStack.lastElementChild.tagName.toLowerCase()).toBe('svg');
    expect(within(trigger).queryByText('Changed Hands')).not.toBeInTheDocument();
    expect(within(trigger).queryByText('Final gross cost per day')).not.toBeInTheDocument();
    expect(within(details).getByText('Changed Hands')).toBeInTheDocument();
    expect(details).toHaveAttribute('aria-hidden', 'true');

    rerender(
      <ItemCard
        item={item}
        isExpanded
        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onBenchmark={vi.fn()}
        currencyCode="USD"
        valueEquivalents={[]}
      />
    );

    expect(document.getElementById('item-details-3')).toHaveAttribute('aria-hidden', 'false');
  });

  test('keeps duration cycling local to the item presentation boundary', () => {
    const item = {
      id: 1,
      name: 'Laptop',
      price: 1200,
      purchaseDate: '2026-08-01T00:00:00Z',
      ownershipDays: 45,
      grossCostPerDay: 20,
      status: 'active',
      category: 'Laptop',
    };

    render(
      <ItemCard
        item={item}
        isExpanded
        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onBenchmark={vi.fn()}
        currencyCode="USD"
        valueEquivalents={[]}
      />
    );

    const durationButton = screen.getByRole('button', { name: 'Still With You: 45 days' });
    fireEvent.click(durationButton);

    expect(screen.getByRole('button', { name: /Still With You: ~1\.5 months/ })).toBeInTheDocument();
  });

  test('delegates mutation intent to the feature coordinator', () => {
    const onDelete = vi.fn();
    const item = {
      id: 2,
      name: 'Headphones',
      price: 200,
      purchaseDate: '2026-08-01T00:00:00Z',
      ownershipDays: 20,
      grossCostPerDay: 10,
      status: 'active',
    };

    render(
      <ItemCard
        item={item}
        isExpanded
        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={onDelete}
        onBenchmark={vi.fn()}
        currencyCode="USD"
        valueEquivalents={[]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalledWith(item);
  });

  test('shows guest-local value equivalents on the same item comparison surface', () => {
    const item = {
      id: 'guest-item-equivalent',
      name: 'Guest headphones',
      price: 200,
      purchaseDate: '2026-09-01T00:00:00Z',
      ownershipDays: 20,
      grossCostPerDay: 10,
      status: 'active',
    };

    render(
      <ItemCard
        item={item}
        isExpanded={false}
        isGuest
        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onBenchmark={vi.fn()}
        currencyCode="USD"
        valueEquivalents={[
          { id: 'guest-equivalent-1', name: 'Coffee', amount: 5, currencyCode: 'USD' },
        ]}
      />
    );

    expect(screen.getByText('≈ 2 Coffee/day')).toBeInTheDocument();
  });

  test('does not expose the API-only replacement benchmark to guests', () => {
    const onBenchmark = vi.fn();
    const item = {
      id: 'guest-item-1',
      name: 'Retired guest phone',
      price: 500,
      purchaseDate: '2025-01-01T00:00:00Z',
      ownershipDays: 365,
      grossCostPerDay: 1.37,
      status: 'retired',
    };

    render(
      <ItemCard
        item={item}
        isExpanded
        isGuest
        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onBenchmark={onBenchmark}
        currencyCode="USD"
        valueEquivalents={[]}
      />
    );

    expect(screen.queryByRole('button', { name: 'Benchmark replacement' }))
      .not.toBeInTheDocument();
    expect(onBenchmark).not.toHaveBeenCalled();
  });
});
