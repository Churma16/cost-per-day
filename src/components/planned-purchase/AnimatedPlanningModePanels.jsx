import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';

const CONTRIBUTION_MODE = 'contributionToTime';
const TARGET_DATE_MODE = 'targetDateToContribution';
const calmTransition = { duration: 0.32, ease: [0.16, 1, 0.3, 1] };

function AnimatedPlanningModePanels({
  planningMode,
  contributionPanel,
  targetDatePanel,
  isVisible = true,
}) {
  const shouldReduceMotion = useReducedMotion();
  const containerRef = useRef(null);
  const contributionPanelRef = useRef(null);
  const targetDatePanelRef = useRef(null);
  const [activeHeight, setActiveHeight] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const previousModeRef = useRef(planningMode);

  const measureActivePanel = useCallback(() => {
    const activePanel = planningMode === CONTRIBUTION_MODE
      ? contributionPanelRef.current
      : targetDatePanelRef.current;
    if (!activePanel) return;

    const targetElement = activePanel.firstElementChild || activePanel;
    const nextHeight = Math.ceil(
      targetElement.getBoundingClientRect().height ||
      targetElement.scrollHeight ||
      activePanel.getBoundingClientRect().height ||
      activePanel.scrollHeight
    );
    if (nextHeight > 0) {
      setActiveHeight((currentHeight) => (currentHeight === nextHeight ? currentHeight : nextHeight));
    }
  }, [planningMode]);

  useEffect(() => {
    if (previousModeRef.current !== planningMode) {
      previousModeRef.current = planningMode;
      setIsTransitioning(true);
      const timer = window.setTimeout(() => {
        setIsTransitioning(false);
      }, 350);
      return () => window.clearTimeout(timer);
    }
  }, [planningMode]);

  useLayoutEffect(() => {
    measureActivePanel();
    const frameId = window.requestAnimationFrame(measureActivePanel);

    if (typeof ResizeObserver === 'undefined') {
      return () => window.cancelAnimationFrame(frameId);
    }

    const observer = new ResizeObserver(() => {
      measureActivePanel();
    });
    [
      containerRef.current,
      contributionPanelRef.current,
      targetDatePanelRef.current,
      contributionPanelRef.current?.firstElementChild,
      targetDatePanelRef.current?.firstElementChild,
    ].forEach((panel) => panel && observer.observe(panel));

    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [measureActivePanel]);

  useEffect(() => {
    if (isVisible) {
      measureActivePanel();
      const frameId = window.requestAnimationFrame(measureActivePanel);
      return () => window.cancelAnimationFrame(frameId);
    }
  }, [isVisible, measureActivePanel]);

  const handleAnimationComplete = () => {
    setIsTransitioning(false);
    measureActivePanel();
  };

  const transition = shouldReduceMotion ? { duration: 0 } : calmTransition;

  return (
    <motion.div
      ref={containerRef}
      data-testid="planning-mode-panels"
      className="relative w-full overflow-hidden"
      initial={false}
      animate={activeHeight ? { height: activeHeight } : undefined}
      transition={transition}
      onAnimationComplete={handleAnimationComplete}
    >
      <motion.div
        className="flex w-full items-start"
        initial={false}
        animate={{ x: planningMode === CONTRIBUTION_MODE ? '0%' : '-100%' }}
        transition={transition}
      >
        <div
          ref={contributionPanelRef}
          data-testid="contribution-planning-panel"
          className={`w-full shrink-0 transition-opacity duration-200 motion-reduce:transition-none ${
            planningMode === CONTRIBUTION_MODE
              ? 'opacity-100'
              : `pointer-events-none opacity-0 ${!isTransitioning ? 'h-0 overflow-hidden' : ''}`
          }`}
          aria-hidden={planningMode !== CONTRIBUTION_MODE}
          inert={planningMode !== CONTRIBUTION_MODE}
        >
          {contributionPanel}
        </div>

        <div
          ref={targetDatePanelRef}
          data-testid="target-date-planning-panel"
          className={`w-full shrink-0 transition-opacity duration-200 motion-reduce:transition-none ${
            planningMode === TARGET_DATE_MODE
              ? 'opacity-100'
              : `pointer-events-none opacity-0 ${!isTransitioning ? 'h-0 overflow-hidden' : ''}`
          }`}
          aria-hidden={planningMode !== TARGET_DATE_MODE}
          inert={planningMode !== TARGET_DATE_MODE}
        >
          {targetDatePanel}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default AnimatedPlanningModePanels;
