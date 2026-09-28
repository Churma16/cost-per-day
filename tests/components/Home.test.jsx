import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
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
      homeEmptyHeroTitle: 'Your ownership history starts here',
      homeEmptyHeroBody: 'Add something you already own to see how its cost changes over time.',
      homeDashboardErrorTitle: "Insights aren't available yet",
      homeDashboardErrorBody: 'Your items are still here. Check your connection and try again.',
      insights: 'Insights',
      tryAgain: 'Try again',
      refreshShowingSavedData: "Couldn't refresh just now. Showing your saved data.",
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

  test('presents a large IDR daily cost as supporting prose inside a standalone hero card', () => {
    useCurrency.mockReturnValue({ currencyCode: 'IDR' });

    render(<HomeHeader totalDailyCost={987654321012} currencyCode="IDR" />);

    const summary = screen.getByText(/Today, what you own is worth about/);
    const header = screen.getByRole('banner');
    const brandRow = screen.getByLabelText('Worthwhile');
    const brandPlacement = brandRow.parentElement;
    const heroCard = document.querySelector('.home-insight-card');
    const reflectionSurface = heroCard.firstElementChild;
    const headerContent = reflectionSurface.firstElementChild;

    expect(header).toHaveClass('sticky', 'top-0', 'z-10', 'h-14');
    expect(brandRow).toHaveTextContent('Worthwhile');
    expect(brandPlacement).toHaveClass('max-w-lg', 'h-full', 'px-1');
    expect(brandRow.querySelector('img')).toHaveAttribute('src', '/worthwhile-icon-192-v2.png');
    expect(screen.getByText('Worthwhile')).toHaveClass(
      'text-lg',
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
  });

  test('keeps one calm brand header while the hero remains separate scroll content', () => {
    const { container } = render(<HomeHeader totalDailyCost={12.5} currencyCode="USD" />);

    const brandHeader = container.querySelector('[data-home-header="brand"]');

    expect(container.querySelectorAll('header')).toHaveLength(1);
    expect(brandHeader).toHaveClass('sticky', 'top-0', 'z-10', 'h-14');
    expect(within(brandHeader).getByLabelText('Worthwhile')).toHaveTextContent('Worthwhile');
    expect(within(brandHeader).queryByText('Insight carousel')).not.toBeInTheDocument();
    expect(within(brandHeader).queryByText(/Today, what you own is worth about/)).not.toBeInTheDocument();
    expect(container.querySelector('.home-insight-card')).toHaveTextContent('Insight carousel');
  });

  test('gently tightens the same brand header after scrolling', () => {
    const { container } = render(
      <div className="page-content">
        <HomeHeader totalDailyCost={12.5} currencyCode="USD" />
      </div>
    );
    const scrollRoot = container.querySelector('.page-content');
    const brandHeader = container.querySelector('[data-home-header="brand"]');
    const brandLockup = within(brandHeader).getByLabelText('Worthwhile');
    const wordmark = within(brandHeader).getByText('Worthwhile');

    expect(brandHeader).toHaveAttribute('data-compact', 'false');
    expect(brandHeader).toHaveClass('h-14', 'px-4');
    expect(wordmark).toHaveClass('text-lg', 'leading-6');

    Object.defineProperty(scrollRoot, 'scrollTop', {
      configurable: true,
      value: 24,
    });
    fireEvent.scroll(scrollRoot);

    expect(brandHeader).toHaveAttribute('data-compact', 'true');
    expect(brandHeader).toHaveClass('h-10', 'px-3');
    expect(wordmark).toHaveClass('text-base', 'leading-5');
    expect(brandLockup.firstElementChild).toHaveClass('h-6', 'w-6');
    expect(container.querySelectorAll('header')).toHaveLength(1);
  });

  test('keeps the hero frame but removes zero-value metrics on first-run empty', () => {
    useDashboard.mockReturnValue({
      data: {
        totalDailyCost: 0,
        currencyCode: 'IDR',
      },
    });
    useItems.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    });

    const { container } = render(<Home />);

    expect(screen.getByText('Your ownership history starts here')).toBeInTheDocument();
    expect(screen.getByText('Add something you already own to see how its cost changes over time.')).toBeInTheDocument();
    expect(screen.queryByText(/Today, what you own is worth about/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Rp\s*0/)).not.toBeInTheDocument();
    expect(screen.queryByText('Insight carousel')).not.toBeInTheDocument();
    expect(container.querySelector('.home-insight-card')).toBeInTheDocument();
  });

  test('keeps a minimal base skeleton collapsed, then expands when ready', () => {
    const { container, rerender } = render(
      <HomeHeader
        totalDailyCost={0}
        currencyCode="IDR"
        state="skeleton"
      />
    );

    const heroCard = container.querySelector('.home-insight-card');
    const heroContent = container.querySelector('.home-reflection-content');
    const loadingPanel = container.querySelector('[data-home-hero-loading-panel]');
    const contentPanel = container.querySelector('[data-home-hero-content-panel]');
    const reflectionRow = container.querySelector('[data-home-reflection-row]');

    expect(heroCard).toHaveAttribute('data-hero-state', 'collapsed');
    expect(heroCard).toHaveAttribute('aria-busy', 'true');
    expect(heroContent).toHaveClass('home-reflection-content--collapsed', 'min-h-[218px]');
    expect(container.querySelector('[data-hero-skeleton="base"]')).toHaveClass('min-h-[178px]');
    expect(loadingPanel).toHaveClass('grid-rows-[1fr]', 'duration-300', 'ease-out');
    expect(contentPanel).toHaveClass('grid-rows-[0fr]', 'duration-300', 'ease-out');
    expect(container.querySelector('[data-hero-skeleton="base"]')).toBeInTheDocument();
    expect(reflectionRow).toHaveClass('min-h-[72px]', 'sm:min-h-[52px]');
    expect(reflectionRow).toHaveAttribute('aria-hidden', 'true');
    expect(reflectionRow.querySelector('.state-skeleton')).toBeInTheDocument();
    expect(container.querySelectorAll('.state-skeleton')).toHaveLength(5);
    expect(screen.queryByText('Insight carousel')).not.toBeInTheDocument();
    expect(screen.queryByText(/Today, what you own is worth about/)).not.toBeInTheDocument();

    rerender(
      <HomeHeader
        totalDailyCost={12.5}
        currencyCode="USD"
        state="content"
      />
    );

    expect(heroCard).toHaveAttribute('data-hero-state', 'expanded');
    expect(heroCard).toHaveAttribute('aria-busy', 'false');
    expect(heroContent).not.toHaveClass('home-reflection-content--collapsed');
    expect(loadingPanel).toHaveClass('grid-rows-[0fr]', 'opacity-0', 'invisible');
    expect(loadingPanel).toHaveAttribute('aria-hidden', 'true');
    expect(contentPanel).toHaveClass('grid-rows-[1fr]', 'opacity-100', 'visible');
    const loadedReflectionRow = container.querySelector('[data-home-reflection-row]');
    expect(loadedReflectionRow).toHaveClass('min-h-[72px]', 'sm:min-h-[52px]');
    expect(loadedReflectionRow).not.toHaveAttribute('aria-hidden');
    expect(loadedReflectionRow.querySelector('.state-skeleton')).not.toBeInTheDocument();
    expect(screen.getByText('Insight carousel')).toBeInTheDocument();
    expect(screen.getByText(/Today, what you own is worth about/)).toHaveTextContent('$12.50');
  });

  test('retains empty hero state when cached-empty items background refresh fails', () => {
    useDashboard.mockReturnValue({
      data: { totalDailyCost: 0, currencyCode: 'IDR' },
      isError: false,
    });
    useItems.mockReturnValue({
      data: [],
      isLoading: false,
      isError: true,
      isRefetchError: true,
      error: new Error('Refetch failure'),
    });

    render(<Home />);
    expect(screen.getByText('Your ownership history starts here')).toBeInTheDocument();
    expect(screen.queryByText('Insight carousel')).not.toBeInTheDocument();
  });

  test('waits for initial dashboard insights without putting the loaded item list back into loading', () => {
    useDashboard.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });
    useItems.mockReturnValue({
      data: [{ id: '1', status: 'active', grossCostPerDay: 12.5 }],
      isLoading: false,
      isError: false,
      error: null,
    });

    const { container } = render(<Home />);

    expect(container.querySelector('.home-insight-card')).toHaveAttribute('data-hero-state', 'collapsed');
    expect(container.querySelector('[data-home-hero-loading-panel]')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('Item list: 1')).toBeInTheDocument();
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
    const refetchDashboard = vi.fn();
    useDashboard.mockReturnValue({
      data: {
        totalDailyCost: 42.5,
        currencyCode: 'USD',
      },
      isError: true,
      isRefetchError: true,
      refetch: refetchDashboard,
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
    expect(screen.getByText("Couldn't refresh just now. Showing your saved data.")).toBeInTheDocument();
    expect(useItems).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetchDashboard).toHaveBeenCalledTimes(1);
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

  test('shows a retryable hero error when initial dashboard insights fail without cache', () => {
    const refetchDashboard = vi.fn();
    useDashboard.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      isError: true,
      refetch: refetchDashboard,
    });
    useItems.mockReturnValue({
      data: [{ id: 'active-1', status: 'active', grossCostPerDay: 12.5 }],
      isLoading: false,
      isError: false,
      error: null,
    });

    const { container } = render(<Home />);

    expect(container.querySelector('.home-insight-card')).toHaveAttribute('data-hero-state', 'expanded');
    expect(screen.getByRole('alert')).toHaveTextContent("Insights aren't available yet");
    expect(screen.getByRole('alert')).toHaveTextContent('Your items are still here.');
    expect(screen.getByText(/Today, what you own is worth about/)).toHaveTextContent('$12.50');
    expect(screen.getByText('Item list: 1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetchDashboard).toHaveBeenCalledTimes(1);
  });
});
