import React from 'react';
import { act, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import Home, { HomeHeader } from '../../src/components/Home';
import { useCurrency } from '../../src/contexts/CurrencyContext';
import { useDashboard } from '../../src/hooks/useDashboard';
import { useItems } from '../../src/hooks/useItems';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => ({
      totalDailyCost: 'Daily Ownership Cost',
      perDay: '/day',
      dailyOwnershipReflection: `Today, what you own is worth about ${options?.amount} per day.`,
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
  let intersectionCallback;
  let observeMock;
  let disconnectMock;

  beforeEach(() => {
    vi.clearAllMocks();
    useCurrency.mockReturnValue({ currencyCode: 'USD' });
    useItems.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    class IntersectionObserverMock {
      constructor(callback) {
        intersectionCallback = callback;
        observeMock = vi.fn();
        disconnectMock = vi.fn();
        this.observe = observeMock;
        this.disconnect = disconnectMock;
      }
    }

    vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('presents a large IDR daily cost as supporting prose inside a standalone hero card', () => {
    useCurrency.mockReturnValue({ currencyCode: 'IDR' });

    render(<HomeHeader totalDailyCost={987654321012} currencyCode="IDR" />);

    const summary = screen.getByText(/Today, what you own is worth about/);
    const header = screen.getByRole('banner');
    const brandRow = screen.getByLabelText('Worthwhile');
    const brandPlacement = brandRow.parentElement;
    const heroCard = brandPlacement.nextElementSibling;
    const reflectionSurface = heroCard.firstElementChild;
    const headerContent = reflectionSurface.firstElementChild;

    expect(header).toHaveClass('w-full', 'min-w-0');
    expect(header).not.toHaveClass('sticky', 'top-0');
    expect(brandRow).toHaveTextContent('Worthwhile');
    expect(brandPlacement).toHaveClass('max-w-lg', 'mb-3', 'px-1');
    expect(brandRow.querySelector('img')).toHaveAttribute('src', '/worthwhile-icon-192-v2.png');
    expect(screen.getByText('Worthwhile')).toHaveClass(
      'text-xl',
      'font-semibold',
      'leading-6',
      'tracking-[-0.015em]'
    );
    expect(heroCard).toHaveClass('home-insight-card', 'rounded-[1.25rem]', 'bg-white');
    expect(reflectionSurface).toHaveClass('home-reflection-surface');
    expect(headerContent).toHaveClass('w-full', 'min-w-0');
    expect(summary.parentElement).toBe(heroCard);
    expect(summary).toHaveClass('text-sm', 'leading-5');
    expect(summary).toHaveTextContent(/Rp/);
    expect(summary).toHaveTextContent(/per day\.$/);
    expect(observeMock).toHaveBeenCalledWith(heroCard);
  });

  test('shows only the compact brand header after the hero leaves the top boundary', () => {
    const { container } = render(<HomeHeader totalDailyCost={12.5} currencyCode="USD" />);

    expect(container.querySelector('[data-home-header="compact"]')).not.toBeInTheDocument();

    act(() => {
      intersectionCallback([{
        isIntersecting: false,
        boundingClientRect: { bottom: 120 },
        rootBounds: { top: 0 },
      }]);
    });

    expect(container.querySelector('[data-home-header="compact"]')).not.toBeInTheDocument();

    act(() => {
      intersectionCallback([{
        isIntersecting: false,
        boundingClientRect: { bottom: -1 },
        rootBounds: { top: 0 },
      }]);
    });

    const compactHeader = container.querySelector('[data-home-header="compact"]');

    expect(compactHeader).toHaveClass('sticky', 'top-0', 'z-10', 'h-14');
    expect(within(compactHeader).getByLabelText('Worthwhile')).toHaveTextContent('Worthwhile');
    expect(within(compactHeader).queryByText('Insight carousel')).not.toBeInTheDocument();
    expect(within(compactHeader).queryByText(/Today, what you own is worth about/)).not.toBeInTheDocument();

    act(() => {
      intersectionCallback([{
        isIntersecting: true,
        boundingClientRect: { bottom: 180 },
        rootBounds: { top: 0 },
      }]);
    });

    expect(container.querySelector('[data-home-header="compact"]')).not.toBeInTheDocument();
  });

  test('disconnects the hero observer when the header unmounts', () => {
    const { unmount } = render(<HomeHeader totalDailyCost={12.5} currencyCode="USD" />);

    unmount();

    expect(disconnectMock).toHaveBeenCalledTimes(1);
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

    expect(screen.getByText(/Today, what you own is worth about/)).toHaveTextContent('$42.50');
    expect(screen.getByText('Item list: 1')).toBeInTheDocument();
    expect(useItems).toHaveBeenCalledTimes(1);
  });

  test('falls back to active items when cached dashboard data is stale after a refetch error', () => {
    useDashboard.mockReturnValue({
      data: {
        totalDailyCost: 42.5,
        currencyCode: 'USD',
      },
      isError: true,
      isRefetchError: true,
    });
    useItems.mockReturnValue({
      data: [
        { id: 'active-1', status: 'active', grossCostPerDay: 4 },
        { id: 'active-2', status: 'active', grossCostPerDay: 1.5 },
        { id: 'sold-1', status: 'sold', grossCostPerDay: 10 },
      ],
      isLoading: false,
      error: null,
    });

    render(<Home />);

    expect(screen.getByText(/Today, what you own is worth about/)).toHaveTextContent('$5.50');
    expect(screen.getByText('Item list: 3')).toBeInTheDocument();
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

    expect(screen.getByText(/Today, what you own is worth about/)).toHaveTextContent('$5.50');
    expect(screen.getByText('Item list: 3')).toBeInTheDocument();
    expect(useItems).toHaveBeenCalledTimes(1);
  });
});
