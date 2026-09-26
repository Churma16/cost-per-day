import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'motion/react';
import AddItem from './AddItem';
import PlannedPurchaseCreateForm from './PlannedPurchaseCreateForm';

const ADD_TYPES = ['item', 'planned'];
const SWIPE_DISTANCE = 64;
const SWIPE_FLICK_DISTANCE = 36;
const SWIPE_VELOCITY = 0.45;
const SWIPE_DIRECTION_RATIO = 1.35;
const INTERACTIVE_SELECTOR = [
  'a',
  'button',
  'input',
  'label',
  'select',
  'textarea',
  '[contenteditable="true"]',
  '[data-swipe-ignore]',
  '[role="button"]',
  '[role="slider"]',
].join(',');

function AddEntryPage() {
  const { t } = useTranslation();
  const shouldReduceMotion = useReducedMotion();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedType = searchParams.get('type');
  const activeType = ADD_TYPES.includes(requestedType) ? requestedType : 'item';
  const tabRefs = useRef({});
  const pageRef = useRef(null);
  const itemPanelRef = useRef(null);
  const plannedPanelRef = useRef(null);
  const swipeStartRef = useRef(null);
  const [panelHeights, setPanelHeights] = useState({});

  useEffect(() => {
    if (requestedType !== activeType) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('type', activeType);
      setSearchParams(nextParams, { replace: true });
    }
  }, [activeType, requestedType, searchParams, setSearchParams]);

  useLayoutEffect(() => {
    const panels = {
      item: itemPanelRef.current,
      planned: plannedPanelRef.current,
    };

    const measurePanels = () => {
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
    };

    measurePanels();

    if (typeof ResizeObserver === 'undefined') return undefined;

    const observer = new ResizeObserver(measurePanels);
    Object.values(panels).forEach((panel) => panel && observer.observe(panel));

    return () => observer.disconnect();
  }, []);

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
    if (event.target.closest?.(INTERACTIVE_SELECTOR)) return;

    swipeStartRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      timestamp: event.timeStamp,
    };
  };

  const handlePointerUp = (event) => {
    const swipeStart = swipeStartRef.current;
    swipeStartRef.current = null;

    if (!swipeStart || swipeStart.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - swipeStart.x;
    const deltaY = event.clientY - swipeStart.y;
    const elapsed = Math.max(event.timeStamp - swipeStart.timestamp, 1);
    const horizontalDistance = Math.abs(deltaX);
    const isHorizontal = horizontalDistance > Math.abs(deltaY) * SWIPE_DIRECTION_RATIO;
    const isCommittedSwipe = horizontalDistance >= SWIPE_DISTANCE
      || (horizontalDistance >= SWIPE_FLICK_DISTANCE
        && horizontalDistance / elapsed >= SWIPE_VELOCITY);

    if (!isHorizontal || !isCommittedSwipe) return;

    const nextType = deltaX < 0 ? 'planned' : 'item';
    if (nextType === activeType) return;

    pageRef.current?.scrollIntoView?.({
      behavior: shouldReduceMotion ? 'auto' : 'smooth',
      block: 'start',
    });
    selectType(nextType);
  };

  const handlePointerCancel = () => {
    swipeStartRef.current = null;
  };

  const calmTransition = {
    duration: shouldReduceMotion ? 0 : 0.32,
    ease: [0.16, 1, 0.3, 1],
  };
  const activePanelHeight = panelHeights[activeType];

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
            initial={false}
            animate={{ x: activeType === 'item' ? '0%' : '100%' }}
            transition={{ type: 'spring', stiffness: 240, damping: 30, mass: 0.9 }}
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
        data-testid="add-form-viewport"
        className="relative w-full overflow-hidden touch-pan-y"
        initial={false}
        animate={activePanelHeight ? { height: activePanelHeight } : undefined}
        transition={calmTransition}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <motion.div
          className="flex w-full items-start"
          initial={false}
          animate={{ x: activeType === 'item' ? '0%' : '-100%' }}
          transition={calmTransition}
        >
          <div
            ref={itemPanelRef}
            id="add-item-panel"
            role="tabpanel"
            aria-labelledby="add-item-tab"
            aria-hidden={activeType !== 'item'}
            inert={activeType !== 'item'}
            className={`w-full shrink-0 transition-opacity duration-200 motion-reduce:transition-none ${
              activeType === 'item' ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
          >
            <AddItem showHeader={false} />
          </div>
          <div
            ref={plannedPanelRef}
            id="add-planned-panel"
            role="tabpanel"
            aria-labelledby="add-planned-tab"
            aria-hidden={activeType !== 'planned'}
            inert={activeType !== 'planned'}
            className={`w-full shrink-0 transition-opacity duration-200 motion-reduce:transition-none ${
              activeType === 'planned' ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
          >
            <PlannedPurchaseCreateForm />
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default AddEntryPage;
