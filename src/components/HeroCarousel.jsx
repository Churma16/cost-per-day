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
  const IconComponent = getInsightIcon(insight.kind);
  const displayEyebrow = getHumanInsightEyebrow(insight, t);

  const hasSecondary = Boolean(insight.secondary);
  const hasCaption = Boolean(insight.caption);

  return (
    <div className="flex flex-col items-start justify-center text-left px-1 py-1 min-h-[95px]">
      {displayEyebrow && (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/25 text-white/90 text-[11px] font-medium tracking-wide mb-1">
          {IconComponent && <IconComponent className="text-xs" aria-hidden="true" />}
          <span>{displayEyebrow}</span>
        </div>
      )}
      <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight line-clamp-1 max-w-md text-left">
        {insight.primary}
      </h2>
      {(hasSecondary || hasCaption) && (
        <div className="mt-0.5 flex items-center justify-start gap-1.5 flex-wrap text-xs text-white/90 font-normal text-left">
          {hasSecondary && <span className="tabular-nums">{insight.secondary}</span>}
          {hasSecondary && hasCaption && <span className="text-white/40">·</span>}
          {hasCaption && <span className="text-white/75">{insight.caption}</span>}
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

  if (isLoading && !insightsOverride) {
    return (
      <div className="flex items-center justify-center p-6 text-white/70 h-[155px]">
        <p className="text-sm animate-pulse">{t('loading')}</p>
      </div>
    );
  }

  if (isError && !insightsOverride) {
    return null;
  }

  if (insights.length === 0) {
    return (
      <div className="flex flex-col items-start justify-center text-left px-4 py-2 min-h-[120px]">
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-black/25 text-white text-xs font-medium uppercase tracking-wider mb-2">
          <IoSparkles className="text-xs" aria-hidden="true" />
          <span>{t('insights')}</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight text-left">
          {t('insightsWelcomeTitle')}
        </h2>
        <p className="text-xs sm:text-sm text-white/85 mt-1 max-w-sm text-left">
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
      className="relative w-full max-w-lg mx-auto"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Sliding Viewport & Track */}
      <div className="overflow-hidden w-full">
        <div
          className={`flex ${
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
                className="w-full flex-shrink-0"
              >
                <SlideItemComponent insight={insightItem} />
              </div>
            );
          })}
        </div>
      </div>

      {insights.length > 1 && (
        <div className="flex items-center justify-start gap-1.5 px-1 mt-1.5 pb-0.5">
          {/* Previous Slide Button (Screen-reader accessible only) */}
          <button
            type="button"
            onClick={handlePreviousSlide}
            aria-label={t('previousInsight')}
            className="sr-only"
          >
            <IoChevronBack aria-hidden="true" />
          </button>

          {/* Dot / Dash Indicators (Left-aligned, dash for active) */}
          {insights.map((insight, slideIndex) => {
            const isSelected = slideIndex === activeSlideIndex;
            return (
              <button
                key={`${insight.kind}-${slideIndex}`}
                type="button"
                onClick={() => handleSelectSlide(slideIndex)}
                aria-label={t('goToSlide', { number: slideIndex + 1 })}
                aria-current={isSelected ? 'true' : undefined}
                className={`h-1 rounded-full transition-all duration-500 ease-out focus:outline-none focus:ring-2 focus:ring-white/50 ${
                  isSelected ? 'w-6 bg-white' : 'w-1.5 bg-white/30 hover:bg-white/60'
                }`}
              />
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
