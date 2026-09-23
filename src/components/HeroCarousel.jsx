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

export const GenericInsightSlide = ({ insight }) => {
  const IconComponent = getInsightIcon(insight.kind);

  return (
    <div className="flex flex-col items-center justify-center text-center px-4 py-3 min-h-[140px]">
      <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/20 text-white text-xs font-semibold uppercase tracking-wider mb-2">
        {IconComponent && <IconComponent className="text-sm" aria-hidden="true" />}
        <span>{insight.eyebrow}</span>
      </div>
      <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight line-clamp-1">
        {insight.primary}
      </h2>
      <p className="text-lg sm:text-xl font-semibold text-white/95 mt-1 font-orbitron">
        {insight.secondary}
      </p>
      <p className="text-xs sm:text-sm text-white/80 mt-1 max-w-md line-clamp-2">
        {insight.caption}
      </p>
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
    touchStartXReference.current = event.touches[0].clientX;
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
      <div className="flex items-center justify-center p-6 text-white/70 min-h-[140px]">
        <p className="text-sm animate-pulse">{t('loading')}</p>
      </div>
    );
  }

  if (isError && !insightsOverride) {
    return null;
  }

  if (insights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center px-4 py-3 min-h-[140px]">
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/20 text-white text-xs font-semibold uppercase tracking-wider mb-2">
          <IoSparkles className="text-sm" aria-hidden="true" />
          <span>{t('insights')}</span>
        </div>
        <h2 className="text-xl font-bold text-white">
          {t('insightsWelcomeTitle')}
        </h2>
        <p className="text-xs sm:text-sm text-white/80 mt-1 max-w-md">
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
      <div
        role="group"
        aria-roledescription="slide"
        aria-label={t('slideOf', { current: activeSlideIndex + 1, total: insights.length })}
        className="transition-opacity duration-300"
      >
        <SlideComponent insight={currentInsight} />
      </div>

      {insights.length > 1 && (
        <>
          {/* Previous Slide Button */}
          <button
            type="button"
            onClick={handlePreviousSlide}
            aria-label={t('previousInsight')}
            className="absolute left-0 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40"
          >
            <IoChevronBack className="text-xl" aria-hidden="true" />
          </button>

          {/* Next Slide Button */}
          <button
            type="button"
            onClick={handleNextSlide}
            aria-label={t('nextInsight')}
            className="absolute right-0 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40"
          >
            <IoChevronForward className="text-xl" aria-hidden="true" />
          </button>

          {/* Dot Indicators */}
          <div className="flex justify-center items-center gap-1.5 mt-2 pb-1">
            {insights.map((insight, slideIndex) => {
              const isSelected = slideIndex === activeSlideIndex;
              return (
                <button
                  key={`${insight.kind}-${slideIndex}`}
                  type="button"
                  onClick={() => handleSelectSlide(slideIndex)}
                  aria-label={t('goToSlide', { number: slideIndex + 1 })}
                  aria-current={isSelected ? 'true' : undefined}
                  className={`h-1.5 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50 ${
                    isSelected ? 'w-5 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70'
                  }`}
                />
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

export default HeroCarousel;
