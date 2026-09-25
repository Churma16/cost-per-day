import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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
});
