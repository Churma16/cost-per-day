import React, { useLayoutEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';

const CONTRIBUTION_MODE = 'contributionToTime';
const TARGET_DATE_MODE = 'targetDateToContribution';
const calmTransition = { duration: 0.32, ease: [0.16, 1, 0.3, 1] };

function AnimatedPlanningModePanels({ planningMode, contributionPanel, targetDatePanel }) {
  const shouldReduceMotion = useReducedMotion();
  const contributionPanelRef = useRef(null);
  const targetDatePanelRef = useRef(null);
  const [panelHeights, setPanelHeights] = useState({});

  useLayoutEffect(() => {
    const panels = {
      [CONTRIBUTION_MODE]: contributionPanelRef.current,
      [TARGET_DATE_MODE]: targetDatePanelRef.current,
    };

    const measurePanels = () => {
      setPanelHeights((currentHeights) => {
        const nextHeights = { ...currentHeights };
        let hasChanged = false;

        Object.entries(panels).forEach(([mode, panel]) => {
          if (!panel) return;

          const nextHeight = panel.getBoundingClientRect().height || panel.scrollHeight;
          if (nextHeight > 0 && nextHeights[mode] !== nextHeight) {
            nextHeights[mode] = nextHeight;
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

  const activeHeight = panelHeights[planningMode];
  const transition = shouldReduceMotion ? { duration: 0 } : calmTransition;

  return (
    <motion.div
      data-testid="planning-mode-panels"
      className="relative w-full overflow-hidden"
      initial={false}
      animate={activeHeight ? { height: activeHeight } : undefined}
      transition={transition}
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
              : 'pointer-events-none opacity-0'
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
              : 'pointer-events-none opacity-0'
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
