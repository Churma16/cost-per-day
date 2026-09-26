import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import HeroCarousel from '../../src/components/HeroCarousel';
import { useDashboard } from '../../src/hooks/useDashboard';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => {
      if (key === 'slideOf') {
        return `Slide ${options?.current} of ${options?.total}`;
      }
      if (key === 'goToSlide') {
        return `Go to slide ${options?.number}`;
      }
      return {
        insightsCarousel: 'Insights Carousel',
        carouselPosition: 'Insight position',
        previousInsight: 'Previous insight',
        nextInsight: 'Next insight',
        insightsWelcomeTitle: 'Ownership Over Time',
        insightsWelcomeCaption: 'Track your purchases and see how their daily cost evolves over time.',
        loading: 'Loading...',
        insightTitleBiggestContributor: 'Most Influential Right Now',
        insightTitleBestValue: 'Lowest Daily Cost So Far',
        insightTitleOwnershipCostTrend: 'Growing More Valuable Over Time',
        insightTitleRecentPurchaseImpact: 'Shifting Your Daily Cost',
        insightTitleMilestone: 'A Milestone Reached',
        insightTitlePortfolioMilestone: 'A Collection Milestone',
        insightTitleEquivalent: 'Compared to the Familiar',
        insightTitleTarget: 'Heading Toward Your Target',
        insightTitleBenchmark: 'If You Replace It',
        insightTitleDurability: 'Lasting Longer for You'
      }[key] || key;
    }
  })
}));

vi.mock('../../src/hooks/useDashboard', () => ({
  useDashboard: vi.fn()
}));

const mockInsights = [
  {
    kind: 'best_value',
    eyebrow: 'Lowest Daily Cost So Far',
    primary: 'Bantal Orthopedic',
    secondary: 'Rp 1.280/day',
    caption: 'Owned for 508 days'
  },
  {
    kind: 'biggest_contributor',
    eyebrow: 'Most Influential Right Now',
    primary: 'Laptop Pro',
    secondary: '41% of your current total cost/day',
    caption: 'Rp 25.000/day'
  },
  {
    kind: 'ownership_cost_trend',
    eyebrow: 'Growing More Valuable Over Time',
    primary: 'Your daily ownership cost is lower than 30 days ago',
    secondary: 'down Rp 6.800/day over the last 30 days',
    caption: 'More ownership time spreads the purchase cost across more days.'
  }
];

describe('HeroCarousel component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useDashboard.mockReturnValue({ data: null, isLoading: false, isError: false });
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('renders welcome empty state when there are no insights', () => {
    render(<HeroCarousel insightsOverride={[]} />);

    expect(screen.getByText('Ownership Over Time')).toBeInTheDocument();
    expect(screen.getByText(/Track your purchases/i)).toBeInTheDocument();
  });

  it('keeps cached insights visible when a background refresh fails', () => {
    useDashboard.mockReturnValue({
      data: { insights: mockInsights },
      isLoading: false,
      isError: true,
      error: new Error('Temporary network failure'),
    });

    render(<HeroCarousel />);

    expect(screen.getByText('Bantal Orthopedic')).toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('renders the initial insight card with presentation fields', () => {
    render(<HeroCarousel insightsOverride={mockInsights} />);

    expect(screen.getByText('Lowest Daily Cost So Far')).toBeInTheDocument();
    expect(screen.getByText('Bantal Orthopedic')).toBeInTheDocument();
    expect(screen.getByText('Rp 1.280/day')).toBeInTheDocument();
    expect(screen.getByText('Owned for 508 days')).toBeInTheDocument();
  });

  it('allows long localized insight copy to wrap and grow beyond the minimum slide height', () => {
    const longInsight = {
      kind: 'ownership_cost_trend',
      eyebrow: 'Semakin Bernilai Seiring Waktu Kepemilikan',
      primary: 'Biaya kepemilikan harianmu terus menurun setelah digunakan dalam periode yang sangat panjang',
      secondary: 'turun Rp 123.456.789.012 per hari dibandingkan dengan 30 hari yang lalu',
      caption: 'Semakin lama barang dimiliki, biaya pembeliannya tersebar ke lebih banyak hari tanpa ada informasi yang terpotong.'
    };

    render(<HeroCarousel insightsOverride={[longInsight]} />);

    const headline = screen.getByText(longInsight.primary);
    const secondary = screen.getByText(longInsight.secondary);
    const caption = screen.getByText(longInsight.caption);
    const eyebrow = screen.getByText(longInsight.eyebrow);

    expect(headline).toHaveClass('w-full', 'min-w-0', 'break-words');
    expect(headline).not.toHaveClass('line-clamp-1');
    expect(eyebrow).toHaveClass('max-w-full', 'min-w-0', 'break-words');
    expect(secondary).toHaveClass('max-w-full', 'min-w-0', 'break-words');
    expect(caption).toHaveClass('max-w-full', 'min-w-0', 'break-words');
    const slideContent = headline.closest('[role="group"]')?.firstElementChild;
    expect(slideContent).toHaveClass('min-h-[172px]', 'sm:min-h-[176px]');
    expect(slideContent).not.toHaveClass('h-[172px]', 'sm:h-[176px]');
    expect(secondary.parentElement).toHaveClass('mt-auto', 'pt-3');
  });

  it('navigates to next and previous slides via controls', () => {
    render(<HeroCarousel insightsOverride={mockInsights} />);

    // Initially at slide 1
    expect(screen.getByText('Bantal Orthopedic')).toBeInTheDocument();

    // Click Next
    const nextButton = screen.getByRole('button', { name: 'Next insight' });
    fireEvent.click(nextButton);

    expect(screen.getByText('Laptop Pro')).toBeInTheDocument();
    expect(screen.getByText('Most Influential Right Now')).toBeInTheDocument();

    // Click Previous
    const previousButton = screen.getByRole('button', { name: 'Previous insight' });
    fireEvent.click(previousButton);

    expect(screen.getByText('Bantal Orthopedic')).toBeInTheDocument();
  });

  it('selects slide directly when dot indicator is clicked', () => {
    render(<HeroCarousel insightsOverride={mockInsights} />);

    const thirdDot = screen.getByRole('button', { name: 'Go to slide 3' });
    fireEvent.click(thirdDot);

    expect(screen.getByText('Your daily ownership cost is lower than 30 days ago')).toBeInTheDocument();
    expect(screen.getByText('down Rp 6.800/day over the last 30 days')).toBeInTheDocument();
  });

  it('uses accessible hit targets and strip-shaped position indicators with the shared accent', () => {
    render(<HeroCarousel insightsOverride={mockInsights} />);

    const firstIndicator = screen.getByRole('button', { name: 'Go to slide 1' });
    const secondIndicator = screen.getByRole('button', { name: 'Go to slide 2' });
    const indicatorGroup = screen.getByRole('group', { name: 'Insight position' });

    expect(indicatorGroup).toContainElement(firstIndicator);
    expect(indicatorGroup).toContainElement(secondIndicator);
    expect(firstIndicator).toHaveClass('h-8', 'w-6');
    expect(firstIndicator).toHaveAttribute('aria-current', 'true');
    expect(firstIndicator.firstElementChild).toHaveClass(
      'h-1',
      'w-4',
      'bg-[var(--color-interaction-accent-lighter)]'
    );
    expect(secondIndicator).not.toHaveAttribute('aria-current');
    expect(secondIndicator.firstElementChild).toHaveClass('h-1', 'w-4', 'bg-white/30');
  });

  it('auto-advances slides slowly when not paused', () => {
    render(<HeroCarousel insightsOverride={mockInsights} autoAdvanceIntervalMs={4000} />);

    expect(screen.getByText('Bantal Orthopedic')).toBeInTheDocument();

    // Fast-forward by 4 seconds
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(screen.getByText('Laptop Pro')).toBeInTheDocument();
  });

  it('pauses auto-advance when hovered and resumes after mouse leave', () => {
    render(<HeroCarousel insightsOverride={mockInsights} autoAdvanceIntervalMs={4000} />);

    const carousel = screen.getByRole('region', { name: 'Insights Carousel' });

    // Hover pauses timer
    fireEvent.mouseEnter(carousel);
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    // Should still be on the first slide
    expect(screen.getByText('Bantal Orthopedic')).toBeInTheDocument();

    // Mouse leave resumes timer
    fireEvent.mouseLeave(carousel);
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    // Advanced to next slide
    expect(screen.getByText('Laptop Pro')).toBeInTheDocument();
  });

  it('respects prefers-reduced-motion by disabling auto-advance', () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(<HeroCarousel insightsOverride={mockInsights} autoAdvanceIntervalMs={4000} />);

    act(() => {
      vi.advanceTimersByTime(8000);
    });

    // Still on first slide because auto-advance is disabled for reduced motion
    expect(screen.getByText('Bantal Orthopedic')).toBeInTheDocument();
  });

  it('does not change slide on stationary touch tap without movement', () => {
    render(<HeroCarousel insightsOverride={mockInsights} />);

    const carousel = screen.getByRole('region', { name: 'Insights Carousel' });

    expect(screen.getByText('Bantal Orthopedic')).toBeInTheDocument();

    // Tap: touchstart at 250px, no touchmove, touchend
    fireEvent.touchStart(carousel, { touches: [{ clientX: 250 }] });
    fireEvent.touchEnd(carousel);

    // Remains on first slide
    expect(screen.getByText('Bantal Orthopedic')).toBeInTheDocument();
  });

  it('swipes to next and previous slides via touch gestures', () => {
    render(<HeroCarousel insightsOverride={mockInsights} />);

    const carousel = screen.getByRole('region', { name: 'Insights Carousel' });

    expect(screen.getByText('Bantal Orthopedic')).toBeInTheDocument();

    // Swipe left (advance to next): start at 250px, move to 150px (delta = +100 > 40)
    fireEvent.touchStart(carousel, { touches: [{ clientX: 250 }] });
    fireEvent.touchMove(carousel, { touches: [{ clientX: 150 }] });
    fireEvent.touchEnd(carousel);

    expect(screen.getByText('Laptop Pro')).toBeInTheDocument();

    // Swipe right (go to previous): start at 100px, move to 220px (delta = -120 < -40)
    fireEvent.touchStart(carousel, { touches: [{ clientX: 100 }] });
    fireEvent.touchMove(carousel, { touches: [{ clientX: 220 }] });
    fireEvent.touchEnd(carousel);

    expect(screen.getByText('Bantal Orthopedic')).toBeInTheDocument();
  });

  it('maps legacy technical titles to human interpretation wording', () => {
    const legacyInsights = [
      {
        kind: 'biggest_contributor',
        eyebrow: 'Biggest Contributor',
        primary: 'Laptop Pro',
        secondary: '41% of your daily cost',
        caption: 'Rp 25.000/day'
      }
    ];

    render(<HeroCarousel insightsOverride={legacyInsights} />);

    expect(screen.getByText('Most Influential Right Now')).toBeInTheDocument();
    expect(screen.queryByText('Biggest Contributor')).not.toBeInTheDocument();
  });
});
