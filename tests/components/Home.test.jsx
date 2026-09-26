import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import Home, { HomeHeader } from '../../src/components/Home';
import { useCurrency } from '../../src/contexts/CurrencyContext';
import { useDashboard } from '../../src/hooks/useDashboard';
import { useItems } from '../../src/hooks/useItems';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => ({
      totalDailyCost: 'Daily Ownership Cost',
      perDay: '/day',
    }[key] || key),
  }),
}));

vi.mock('../../src/components/HeroCarousel', () => ({
  default: () => <div>Insight carousel</div>,
}));

vi.mock('../../src/components/ItemList', () => ({
  ItemListContent: ({ itemsQuery }) => (
    <div>Item list: {itemsQuery.data?.length ?? 0}</div>
  ),
}));

vi.mock('../../src/contexts/CurrencyContext', () => ({
  useCurrency: vi.fn(),
}));

vi.mock('../../src/hooks/useDashboard', () => ({
  useDashboard: vi.fn(),
}));

vi.mock('../../src/hooks/useItems', () => ({
  useItems: vi.fn(),
}));

describe('HomeHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCurrency.mockReturnValue({ currencyCode: 'USD' });
    useItems.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
  });

  test('keeps a large IDR daily cost inside a wrapping summary row', () => {
    useCurrency.mockReturnValue({ currencyCode: 'IDR' });

    render(<HomeHeader totalDailyCost={987654321012} currencyCode="IDR" />);

    const label = screen.getByText('Daily Ownership Cost');
    const summaryRow = label.parentElement;
    const value = label.nextElementSibling;
    const header = screen.getByRole('banner');
    const headerContent = header.firstElementChild;

    expect(header).toHaveClass('w-full', 'min-w-0');
    expect(headerContent).toHaveClass('w-full', 'min-w-0', 'max-w-lg');
    expect(summaryRow).toHaveClass(
      'w-full',
      'min-w-0',
      'grid-cols-[minmax(0,1fr)_auto]'
    );
    expect(value).toHaveClass('max-w-full', 'whitespace-nowrap', 'text-right');
    expect(value).toHaveTextContent(/Rp/);
    expect(value).toHaveTextContent('/day');
  });

  test('uses dashboard data as the canonical Home daily cost when available', () => {
    useDashboard.mockReturnValue({
      data: {
        totalDailyCost: 42.5,
        currencyCode: 'USD',
      },
    });
    useItems.mockReturnValue({
      data: [
        { id: '1', status: 'active', grossCostPerDay: 99 },
      ],
      isLoading: false,
      error: null,
    });

    render(<Home />);

    expect(screen.getByText('Daily Ownership Cost').nextElementSibling).toHaveTextContent('$42.50');
    expect(screen.getByText('Item list: 1')).toBeInTheDocument();
    expect(useItems).toHaveBeenCalledTimes(1);
  });

  test('falls back to active items when dashboard data is unavailable', () => {
    useDashboard.mockReturnValue({
      data: undefined,
      isError: true,
    });
    useItems.mockReturnValue({
      data: [
        { id: 'active-1', status: 'active', grossCostPerDay: 4 },
        { id: 'active-default', grossCostPerDay: 1.5 },
        { id: 'sold-1', status: 'sold', grossCostPerDay: 10 },
      ],
      isLoading: false,
      error: null,
    });

    render(<Home />);

    expect(screen.getByText('Daily Ownership Cost').nextElementSibling).toHaveTextContent('$5.50');
    expect(screen.getByText('Item list: 3')).toBeInTheDocument();
    expect(useItems).toHaveBeenCalledTimes(1);
  });
});
