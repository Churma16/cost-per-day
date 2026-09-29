import React from 'react';
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from 'motion/react';

export const CALM_EASE = [0.16, 1, 0.3, 1];
export const CALM_HEIGHT_EASE = [0.22, 1, 0.36, 1];

export const CALM_COLLAPSE_DURATION = {
  expand: 0.58,
  collapse: 0.5,
  fadeIn: 0.34,
  fadeOut: 0.24,
};

function CalmCollapseContent({ id, ariaLabelledby, children, className }) {
  const isPresent = useIsPresent();
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      id={id}
      role="region"
      aria-labelledby={ariaLabelledby}
      aria-hidden={isPresent ? undefined : 'true'}
      inert={!isPresent}
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{
        height: {
          duration: shouldReduceMotion
            ? 0
            : isPresent
              ? CALM_COLLAPSE_DURATION.expand
              : CALM_COLLAPSE_DURATION.collapse,
          ease: CALM_HEIGHT_EASE,
        },
        opacity: {
          duration: shouldReduceMotion
            ? 0
            : isPresent
              ? CALM_COLLAPSE_DURATION.fadeIn
              : CALM_COLLAPSE_DURATION.fadeOut,
          ease: CALM_EASE,
        },
      }}
      className={`overflow-hidden${isPresent ? '' : ' pointer-events-none'} ${className}`.trim()}
    >
      {children}
    </motion.div>
  );
}

/**
 * Reusable presence-based disclosure for content-driven card heights.
 * Exiting content stays mounted for the glide but becomes inert immediately.
 */
export function CalmCollapse({
  isOpen,
  id,
  ariaLabelledby,
  children,
  className = '',
}) {
  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <CalmCollapseContent
          key={id || 'calm-collapse-content'}
          id={id}
          ariaLabelledby={ariaLabelledby}
          className={className}
        >
          {children}
        </CalmCollapseContent>
      )}
    </AnimatePresence>
  );
}

export default CalmCollapse;
