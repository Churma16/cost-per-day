import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  IoChevronBack,
  IoChevronForward,
  IoRibbon,
  IoFlame,
  IoTime,
  IoTrendingUp,
  IoTrendingDown,
  IoCafe,
  IoAlbums,
  IoSparkles
} from 'react-icons/io5';
import { useDashboard } from '../hooks/useDashboard';

const DEFAULT_AUTO_ADVANCE_MS = 6000;

export const getInsightIcon = (kind) => {
  switch (kind) {
    case 'best_value':
      return IoRibbon;
    case 'biggest_contributor':
      return IoFlame;
    case 'milestone':
      return IoTime;
    case 'recent_purchase_impact':
      return IoTrendingUp;
    case 'ownership_cost_trend':
      return IoTrendingDown;
    case 'equivalent':
      return IoCafe;
    case 'portfolio_milestone':
      return IoAlbums;
    default:
      return IoSparkles;
  }
};

const LEGACY_TECHNICAL_TITLES = {
  'biggest contributor': 'insightTitleBiggestContributor',
  'kontributor terbesar': 'insightTitleBiggestContributor',
  'best value': 'insightTitleBestValue',
  'cost trend': 'insightTitleOwnershipCostTrend',
  'ownership cost trend': 'insightTitleOwnershipCostTrend',
  'purchase impact': 'insightTitleRecentPurchaseImpact',
  'recent purchase impact': 'insightTitleRecentPurchaseImpact',
  'target progress': 'insightTitleTarget',
  'ownership target': 'insightTitleTarget',
  'replacement benchmark': 'insightTitleBenchmark',
  'repeat-buy benchmark': 'insightTitleBenchmark',
  'brand durability': 'insightTitleDurability',
  'durability history': 'insightTitleDurability',
  'value equivalent': 'insightTitleEquivalent',
  'equivalent': 'insightTitleEquivalent',
  'ownership milestone': 'insightTitleMilestone',
  'milestone': 'insightTitleMilestone',
  'portfolio milestone': 'insightTitlePortfolioMilestone',
  'portfolio_milestone': 'insightTitlePortfolioMilestone'
};

const INSIGHT_KIND_KEY_MAP = {
  'biggest_contributor': 'insightTitleBiggestContributor',
  'best_value': 'insightTitleBestValue',
  'ownership_cost_trend': 'insightTitleOwnershipCostTrend',
  'recent_purchase_impact': 'insightTitleRecentPurchaseImpact',
  'milestone': 'insightTitleMilestone',
  'portfolio_milestone': 'insightTitlePortfolioMilestone',
  'equivalent': 'insightTitleEquivalent',
  'target': 'insightTitleTarget',
  'durability': 'insightTitleDurability'
};

export const getHumanInsightEyebrow = (insight, t) => {
  if (!insight) {
    return '';
  }

  const rawEyebrow = (insight.eyebrow || '').trim();
  const normalizedEyebrow = rawEyebrow.toLowerCase();

  if (LEGACY_TECHNICAL_TITLES[normalizedEyebrow]) {
    const translationKey = LEGACY_TECHNICAL_TITLES[normalizedEyebrow];
    return t(translationKey);
  }

  if (!rawEyebrow && insight.kind && INSIGHT_KIND_KEY_MAP[insight.kind]) {
    return t(INSIGHT_KIND_KEY_MAP[insight.kind]);
  }

  return rawEyebrow;
};

export const GenericInsightSlide = ({ insight }) => {
  const { t } = useTranslation();
  const displayEyebrow = getHumanInsightEyebrow(insight, t);

  const hasSecondary = Boolean(insight.secondary);
  const hasCaption = Boolean(insight.caption);

  return (
    <div className="flex h-[172px] w-full min-w-0 flex-col items-start px-0.5 py-2 text-left sm:h-[176px]">
      <div className="w-full min-w-0">
        {displayEyebrow && (
          <p className="mb-3 max-w-full min-w-0 break-words text-[11px] font-semibold uppercase leading-4 tracking-[0.16em] text-white/70">
            {displayEyebrow}
          </p>
        )}
        <h2 className="w-full min-w-0 break-words text-[1.55rem] font-semibold leading-[1.12] tracking-[-0.025em] text-white sm:text-[1.75rem]">
          {insight.primary}
        </h2>
      </div>
      {(hasSecondary || hasCaption) && (
        <div className="mt-auto flex w-full min-w-0 flex-col items-start gap-1 pt-3 text-sm font-normal leading-5 text-white/80">
          {hasSecondary && <span className="min-w-0 max-w-full break-words font-medium text-white/90 tabular-nums">{insight.secondary}</span>}
          {hasCaption && <span className="min-w-0 max-w-full break-words">{insight.caption}</span>}
        </div>
      )}
    </div>
  );
};

// Renderer registry for potential specialized insight views
export const insightRenderers = {
  // Can be extended with custom renderer components if needed
};

function HeroCarousel({ insightsOverride, autoAdvanceIntervalMs = DEFAULT_AUTO_ADVANCE_MS }) {
  const { t } = useTranslation();
  const queryResult = useDashboard();
  const { data: dashboardData, isLoading, isError } = queryResult;

  const insights = insightsOverride ?? (dashboardData?.insights || []);

  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const touchStartXReference = useRef(0);
  const touchEndXReference = useRef(0);

  // Monitor reduced motion preference
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(motionMediaQuery.matches);

    const handleMotionPreferenceChange = (event) => {
      setPrefersReducedMotion(event.matches);
    };

    if (motionMediaQuery.addEventListener) {
      motionMediaQuery.addEventListener('change', handleMotionPreferenceChange);
      return () => motionMediaQuery.removeEventListener('change', handleMotionPreferenceChange);
    }
    motionMediaQuery.addListener(handleMotionPreferenceChange);
    return () => motionMediaQuery.removeListener(handleMotionPreferenceChange);
  }, []);

  // Normalize active index when slides change
  useEffect(() => {
    if (activeSlideIndex >= insights.length && insights.length > 0) {
      setActiveSlideIndex(0);
    }
  }, [activeSlideIndex, insights.length]);

  const handleNextSlide = useCallback(() => {
    if (insights.length <= 1) return;
    setActiveSlideIndex((previousIndex) => (previousIndex + 1) % insights.length);
  }, [insights.length]);

  const handlePreviousSlide = useCallback(() => {
    if (insights.length <= 1) return;
    setActiveSlideIndex((previousIndex) => (previousIndex - 1 + insights.length) % insights.length);
  }, [insights.length]);

  const handleSelectSlide = (targetIndex) => {
    setActiveSlideIndex(targetIndex);
  };

  // Auto-advance timer
  useEffect(() => {
    if (prefersReducedMotion || isPaused || insights.length <= 1) {
      return;
    }

    const autoAdvanceTimer = setInterval(() => {
      handleNextSlide();
    }, autoAdvanceIntervalMs);

    return () => clearInterval(autoAdvanceTimer);
  }, [prefersReducedMotion, isPaused, insights.length, autoAdvanceIntervalMs, handleNextSlide]);

  const handleTouchStart = (event) => {
    const clientX = event.touches[0].clientX;
    touchStartXReference.current = clientX;
    touchEndXReference.current = clientX;
    setIsPaused(true);
  };

  const handleTouchMove = (event) => {
    touchEndXReference.current = event.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
    const touchDelta = touchStartXReference.current - touchEndXReference.current;
    if (Math.abs(touchDelta) > 40) {
      if (touchDelta > 0) {
        handleNextSlide();
      } else {
        handlePreviousSlide();
      }
    }
  };

  if (isLoading && dashboardData == null && !insightsOverride) {
    return (
      <div className="flex h-[178px] items-center justify-center p-6 text-white/70">
        <p className="text-sm animate-pulse">{t('loading')}</p>
      </div>
    );
  }

  if (isError && dashboardData == null && !insightsOverride) {
    return null;
  }

  if (insights.length === 0) {
    return (
      <div className="flex min-h-[178px] flex-col items-start justify-center px-0.5 py-2 text-left">
        <p className="mb-3 text-[11px] font-semibold uppercase leading-4 tracking-[0.16em] text-white/70">
          {t('insights')}
        </p>
        <h2 className="text-[1.55rem] font-semibold leading-[1.12] tracking-[-0.025em] text-white sm:text-[1.75rem]">
          {t('insightsWelcomeTitle')}
        </h2>
        <p className="mt-3 max-w-sm text-sm leading-5 text-white/80">
          {t('insightsWelcomeCaption')}
        </p>
      </div>
    );
  }

  const currentInsight = insights[activeSlideIndex] || insights[0];
  const SlideComponent = insightRenderers[currentInsight.kind] || GenericInsightSlide;

  return (
    <section
      role="region"
      aria-roledescription="carousel"
      aria-label={t('insightsCarousel')}
      className="relative mx-auto w-full min-w-0"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Sliding Viewport & Track */}
      <div className="w-full min-w-0 overflow-hidden">
        <div
          className={`flex w-full min-w-0 ${
            prefersReducedMotion ? '' : 'transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]'
          }`}
          style={{
            transform: `translateX(-${activeSlideIndex * 100}%)`,
          }}
        >
          {insights.map((insightItem, slideIndex) => {
            const SlideItemComponent = insightRenderers[insightItem.kind] || GenericInsightSlide;
            const isCurrent = slideIndex === activeSlideIndex;
            return (
              <div
                key={insightItem.id || `${insightItem.kind}-${slideIndex}`}
                role="group"
                aria-roledescription="slide"
                aria-label={t('slideOf', { current: slideIndex + 1, total: insights.length })}
                aria-hidden={!isCurrent}
                className="w-full min-w-0 flex-shrink-0"
              >
                <SlideItemComponent insight={insightItem} />
              </div>
            );
          })}
        </div>
      </div>

      {insights.length > 1 && (
        <div
          role="group"
          aria-label={t('carouselPosition')}
          className="mt-1 flex items-center justify-start gap-0 pb-0.5"
        >
          {/* Previous Slide Button (Screen-reader accessible only) */}
          <button
            type="button"
            onClick={handlePreviousSlide}
            aria-label={t('previousInsight')}
            className="sr-only"
          >
            <IoChevronBack aria-hidden="true" />
          </button>

          {/* Spacious hit targets keep the quiet indicators easy to use on mobile. */}
          {insights.map((insight, slideIndex) => {
            const isSelected = slideIndex === activeSlideIndex;
            return (
              <button
                key={`${insight.kind}-${slideIndex}`}
                type="button"
                onClick={() => handleSelectSlide(slideIndex)}
                aria-label={t('goToSlide', { number: slideIndex + 1 })}
                aria-current={isSelected ? 'true' : undefined}
                className="group inline-flex h-8 w-6 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-interaction-accent-lighter)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#32636A]"
              >
                <span
                  aria-hidden="true"
                  className={`h-1 w-4 rounded-full transition-colors duration-500 ease-out ${
                    isSelected
                      ? 'bg-[var(--color-interaction-accent-lighter)]'
                      : 'bg-white/30 group-hover:bg-white/60'
                  }`}
                />
              </button>
            );
          })}

          {/* Next Slide Button (Screen-reader accessible only) */}
          <button
            type="button"
            onClick={handleNextSlide}
            aria-label={t('nextInsight')}
            className="sr-only"
          >
            <IoChevronForward aria-hidden="true" />
          </button>
        </div>
      )}
    </section>
  );
}

export default HeroCarousel;
