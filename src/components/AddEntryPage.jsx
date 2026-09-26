import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'motion/react';
import AddItem from './AddItem';
import PlannedPurchaseCreateForm from './PlannedPurchaseCreateForm';

const ADD_TYPES = ['item', 'planned'];
const SWIPE_DIRECTION_LOCK_DISTANCE = 8;
const SWIPE_FLICK_DISTANCE = 28;
const SWIPE_VELOCITY = 0.5;
const EDGE_RESISTANCE = 0.16;
const isProtectedSwipeTarget = (target) => {
  if (!target) return false;
  if (target.closest?.('[data-swipe-ignore]')) return true;
  const protectedSection = target.closest?.('[data-swipe-protected]');
  if (protectedSection) {
    return Boolean(
      target.closest?.(
        'input, textarea, select, button, label, [contenteditable="true"], [role="button"], [role="slider"]'
      )
    );
  }
  return false;
};

function AddEntryPage() {
  const { t } = useTranslation();
  const shouldReduceMotion = useReducedMotion();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedType = searchParams.get('type');
  const activeType = ADD_TYPES.includes(requestedType) ? requestedType : 'item';
  const activeTypeRef = useRef(activeType);
  activeTypeRef.current = activeType;
  const tabRefs = useRef({});
  const pageRef = useRef(null);
  const formViewportRef = useRef(null);
  const itemPanelRef = useRef(null);
  const plannedPanelRef = useRef(null);
  const swipeStartRef = useRef(null);
  const swipeAnimationRef = useRef(null);
  const [panelHeights, setPanelHeights] = useState({});
  const [viewportWidth, setViewportWidth] = useState(0);
  const trackX = useMotionValue(0);
  const swipeProgress = useTransform(trackX, (latestX) => {
    if (!viewportWidth) return activeType === 'planned' ? 1 : 0;
    return Math.min(Math.max(-latestX / viewportWidth, 0), 1);
  });
  const indicatorX = useTransform(swipeProgress, (progress) => `${progress * 100}%`);

  useEffect(() => {
    if (requestedType !== activeType) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('type', activeType);
      setSearchParams(nextParams, { replace: true });
    }
  }, [activeType, requestedType, searchParams, setSearchParams]);

  const measurePanels = useCallback(() => {
    const panels = {
      item: itemPanelRef.current,
      planned: plannedPanelRef.current,
    };

    const nextViewportWidth = formViewportRef.current?.getBoundingClientRect().width || 0;
    if (nextViewportWidth > 0) {
      setViewportWidth((currentWidth) => {
        if (currentWidth === nextViewportWidth) return currentWidth;
        if (!swipeStartRef.current) {
          trackX.set(activeTypeRef.current === 'planned' ? -nextViewportWidth : 0);
        }
        return nextViewportWidth;
      });
    }

    setPanelHeights((currentHeights) => {
      const nextHeights = { ...currentHeights };
      let hasChanged = false;

      Object.entries(panels).forEach(([type, panel]) => {
        if (!panel) return;

        const nextHeight = panel.getBoundingClientRect().height || panel.scrollHeight;
        if (nextHeight > 0 && nextHeights[type] !== nextHeight) {
          nextHeights[type] = nextHeight;
          hasChanged = true;
        }
      });

      return hasChanged ? nextHeights : currentHeights;
    });
  }, [trackX]);

  useLayoutEffect(() => {
    const panels = [itemPanelRef.current, plannedPanelRef.current];

    measurePanels();

    if (typeof ResizeObserver === 'undefined') return undefined;

    const observer = new ResizeObserver(measurePanels);
    [...panels, formViewportRef.current]
      .forEach((element) => element && observer.observe(element));

    return () => observer.disconnect();
  }, [measurePanels]);

  useEffect(() => {
    measurePanels();
    const frameId = window.requestAnimationFrame(measurePanels);
    return () => window.cancelAnimationFrame(frameId);
  }, [activeType, measurePanels]);

  useEffect(() => {
    if (!viewportWidth || swipeStartRef.current) return undefined;

    swipeAnimationRef.current?.stop();
    const targetX = activeType === 'planned' ? -viewportWidth : 0;
    if (shouldReduceMotion) {
      trackX.set(targetX);
      return undefined;
    }

    const animation = animate(trackX, targetX, {
      type: 'spring',
      stiffness: 280,
      damping: 34,
      mass: 0.85,
    });
    swipeAnimationRef.current = animation;

    return () => animation.stop();
  }, [activeType, shouldReduceMotion, trackX, viewportWidth]);

  const selectType = (type, focus = false) => {
    if (type === activeType) return;

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('type', type);
    setSearchParams(nextParams);
    if (focus) {
      window.requestAnimationFrame(() => tabRefs.current[type]?.focus());
    }
  };

  const handlePointerDown = (event) => {
    if (event.pointerType === 'mouse' || !event.isPrimary) return;
    if (isProtectedSwipeTarget(event.target)) return;

    swipeAnimationRef.current?.stop();
    swipeStartRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      timestamp: event.timeStamp,
      lastX: event.clientX,
      lastTimestamp: event.timeStamp,
      velocityX: 0,
      direction: null,
      startTrackX: trackX.get(),
      hasCapturedPointer: false,
    };
  };

  const handlePointerMove = (event) => {
    const swipeStart = swipeStartRef.current;
    if (!swipeStart || swipeStart.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - swipeStart.x;
    const deltaY = event.clientY - swipeStart.y;
    const horizontalDistance = Math.abs(deltaX);
    const verticalDistance = Math.abs(deltaY);

    if (!swipeStart.direction) {
      if (Math.max(horizontalDistance, verticalDistance) < SWIPE_DIRECTION_LOCK_DISTANCE) return;
      swipeStart.direction = horizontalDistance > verticalDistance ? 'horizontal' : 'vertical';
      if (swipeStart.direction === 'horizontal') {
        event.currentTarget.setPointerCapture?.(event.pointerId);
        swipeStart.hasCapturedPointer = true;
      }
    }

    if (swipeStart.direction !== 'horizontal') return;

    if (!viewportWidth) return;

    const elapsed = Math.max(event.timeStamp - swipeStart.lastTimestamp, 1);
    swipeStart.velocityX = (event.clientX - swipeStart.lastX) / elapsed;
    swipeStart.lastX = event.clientX;
    swipeStart.lastTimestamp = event.timeStamp;

    const rawX = swipeStart.startTrackX + deltaX;
    const resistedX = rawX > 0
      ? rawX * EDGE_RESISTANCE
      : rawX < -viewportWidth
        ? -viewportWidth + ((rawX + viewportWidth) * EDGE_RESISTANCE)
        : rawX;
    trackX.set(resistedX);
  };

  const handlePointerUp = (event) => {
    const swipeStart = swipeStartRef.current;
    swipeStartRef.current = null;

    if (!swipeStart || swipeStart.pointerId !== event.pointerId) return;

    if (swipeStart.hasCapturedPointer) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }

    const deltaX = event.clientX - swipeStart.x;
    const horizontalDistance = Math.abs(deltaX);
    const elapsed = Math.max(event.timeStamp - swipeStart.timestamp, 1);
    const releaseVelocity = swipeStart.velocityX || deltaX / elapsed;
    const distanceThreshold = Math.min(Math.max(viewportWidth * 0.22, 64), 110);
    const movedTowardPlanned = activeType === 'item' && deltaX < 0;
    const movedTowardItem = activeType === 'planned' && deltaX > 0;
    const passedDistance = horizontalDistance >= distanceThreshold;
    const passedVelocity = horizontalDistance >= SWIPE_FLICK_DISTANCE
      && Math.abs(releaseVelocity) >= SWIPE_VELOCITY;
    const shouldCommit = swipeStart.direction === 'horizontal'
      && (movedTowardPlanned || movedTowardItem)
      && (passedDistance || passedVelocity);

    if (shouldCommit) {
      const nextType = movedTowardPlanned ? 'planned' : 'item';
      pageRef.current?.scrollIntoView?.({
        behavior: shouldReduceMotion ? 'auto' : 'smooth',
        block: 'start',
      });
      selectType(nextType);
      return;
    }

    const targetX = activeType === 'planned' ? -viewportWidth : 0;
    if (shouldReduceMotion) {
      trackX.set(targetX);
      return;
    }
    swipeAnimationRef.current = animate(trackX, targetX, {
      type: 'spring',
      stiffness: 320,
      damping: 34,
      mass: 0.8,
    });
  };

  const handlePointerCancel = (event) => {
    const swipeStart = swipeStartRef.current;
    if (swipeStart?.hasCapturedPointer && event?.pointerId) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }
    swipeStartRef.current = null;
    const targetX = activeType === 'planned' ? -viewportWidth : 0;
    if (shouldReduceMotion) {
      trackX.set(targetX);
      return;
    }
    swipeAnimationRef.current = animate(trackX, targetX, {
      type: 'spring',
      stiffness: 320,
      damping: 34,
      mass: 0.8,
    });
  };

  const calmTransition = {
    duration: shouldReduceMotion ? 0 : 0.32,
    ease: [0.16, 1, 0.3, 1],
  };
  const activePanelHeight = panelHeights[activeType];

  const clampPageScroll = () => {
    const scrollContainer = pageRef.current?.closest('.page-content');
    if (!scrollContainer) return;

    const maximumScrollTop = Math.max(
      scrollContainer.scrollHeight - scrollContainer.clientHeight,
      0
    );
    if (scrollContainer.scrollTop > maximumScrollTop) {
      scrollContainer.scrollTop = maximumScrollTop;
    }
  };

  const handleTabKeyDown = (event, currentType) => {
    const currentIndex = ADD_TYPES.indexOf(currentType);
    let nextIndex = null;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % ADD_TYPES.length;
    if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + ADD_TYPES.length) % ADD_TYPES.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = ADD_TYPES.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    selectType(ADD_TYPES[nextIndex], true);
  };

  return (
    <div ref={pageRef} className="max-w-3xl mx-auto">
      <div className="px-4 space-y-4 pb-2">
        <div className="pt-6 pb-1 px-1">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {t('addEntryTitle')}
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-[#6F7782]">
            {t('addEntrySubtitle')}
          </p>
        </div>

        <div
          role="tablist"
          aria-label={t('addEntryTypeLabel')}
          className="relative grid grid-cols-2 rounded-xl bg-gray-200/70 p-1"
        >
          <motion.span
            data-testid="add-type-indicator"
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-1 left-1 z-0 w-[calc(50%_-_0.25rem)] rounded-lg bg-white shadow-sm"
            style={{ x: indicatorX }}
          />
          {ADD_TYPES.map((type) => {
            const isActive = activeType === type;
            return (
              <button
                key={type}
                ref={(node) => { tabRefs.current[type] = node; }}
                id={`add-${type}-tab`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`add-${type}-panel`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => selectType(type)}
                onKeyDown={(event) => handleTabKeyDown(event, type)}
                className={`relative z-10 rounded-lg px-3 py-2 text-sm font-semibold transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-1 ${
                  isActive
                    ? 'text-teal-800'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t(type === 'item' ? 'ownedItemTab' : 'plannedItemTab')}
              </button>
            );
          })}
        </div>
      </div>

      <motion.div
        ref={formViewportRef}
        data-testid="add-form-viewport"
        className="relative w-full overflow-hidden touch-pan-y"
        initial={false}
        animate={activePanelHeight ? { height: activePanelHeight } : undefined}
        transition={calmTransition}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onAnimationComplete={clampPageScroll}
      >
        <motion.div
          data-testid="add-form-track"
          className="flex w-full items-start"
          style={{ x: trackX }}
        >
          <div
            ref={itemPanelRef}
            id="add-item-panel"
            role="tabpanel"
            aria-labelledby="add-item-tab"
            aria-hidden={activeType !== 'item'}
            inert={activeType !== 'item'}
            className={`w-full shrink-0 ${activeType === 'item' ? '' : 'pointer-events-none'}`}
          >
            <AddItem showHeader={false} isVisible={activeType === 'item'} />
          </div>
          <div
            ref={plannedPanelRef}
            id="add-planned-panel"
            role="tabpanel"
            aria-labelledby="add-planned-tab"
            aria-hidden={activeType !== 'planned'}
            inert={activeType !== 'planned'}
            className={`w-full shrink-0 ${activeType === 'planned' ? '' : 'pointer-events-none'}`}
          >
            <PlannedPurchaseCreateForm isVisible={activeType === 'planned'} />
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default AddEntryPage;
