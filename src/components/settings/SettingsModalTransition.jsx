import React from 'react';
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from 'motion/react';

const CALM_EASE = [0.16, 1, 0.3, 1];

function SettingsModalWindow({
  ariaLabelledby,
  backdropClassName,
  children,
  dialogClassName,
  onBackdropClick,
}) {
  const isPresent = useIsPresent();
  const shouldReduceMotion = useReducedMotion();
  const backdropDuration = shouldReduceMotion ? 0 : (isPresent ? 0.25 : 0.2);
  const dialogDuration = shouldReduceMotion ? 0 : (isPresent ? 0.3 : 0.2);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: backdropDuration, ease: CALM_EASE }}
      className={backdropClassName}
      onClick={(event) => {
        if (isPresent && event.target === event.currentTarget) {
          onBackdropClick?.();
        }
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 12, scale: shouldReduceMotion ? 1 : 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: shouldReduceMotion ? 0 : 10, scale: shouldReduceMotion ? 1 : 0.98 }}
        transition={{ duration: dialogDuration, ease: CALM_EASE }}
        className={`${dialogClassName}${isPresent ? '' : ' pointer-events-none'}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledby}
      >
        {children({ isExiting: !isPresent })}
      </motion.div>
    </motion.div>
  );
}

function SettingsModalTransition({ isOpen, onExitComplete, ...windowProps }) {
  return (
    <AnimatePresence onExitComplete={onExitComplete}>
      {isOpen && <SettingsModalWindow key="settings-modal" {...windowProps} />}
    </AnimatePresence>
  );
}

export default SettingsModalTransition;
