import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { IoClose, IoCreateOutline } from 'react-icons/io5';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import PlannedPurchaseForm from '../PlannedPurchaseForm';

/**
 * PlannedPurchaseEditDialog - A responsive bottom sheet drawer (mobile) and modal (desktop)
 * for editing planned purchases without causing layout shifts in the main planning list.
 */
export function PlannedPurchaseEditDialog({
  isOpen,
  item,
  onClose,
  onSubmit,
  isSubmitting = false,
  errorMessage = null,
}) {
  const { t } = useTranslation();
  const shouldReduceMotion = useReducedMotion();
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    // Focus close button on open for accessibility
    closeButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusableElements = [
        ...(dialogRef.current?.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
        ) || []),
      ];

      if (focusableElements.length === 0) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }

      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && (activeElement === firstFocusable || !dialogRef.current?.contains(activeElement))) {
        event.preventDefault();
        lastFocusable.focus();
      } else if (!event.shiftKey && (activeElement === lastFocusable || !dialogRef.current?.contains(activeElement))) {
        event.preventDefault();
        firstFocusable.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const backdropVariants = {
    closed: {
      opacity: 0,
      transition: { duration: shouldReduceMotion ? 0 : 0.2, ease: [0.25, 0.8, 0.25, 1] },
    },
    open: {
      opacity: 1,
      transition: { duration: shouldReduceMotion ? 0 : 0.25, ease: [0.25, 0.8, 0.25, 1] },
    },
  };

  const sheetVariants = {
    closed: {
      y: shouldReduceMotion ? '0%' : '100%',
      opacity: shouldReduceMotion ? 0 : 1,
      transition: { duration: shouldReduceMotion ? 0 : 0.35, ease: [0.4, 0, 0.6, 1] },
    },
    open: {
      y: '0%',
      opacity: 1,
      transition: { duration: shouldReduceMotion ? 0 : 0.4, ease: [0.25, 0.8, 0.25, 1] },
    },
  };

  return (
    <AnimatePresence>
      {isOpen && item && (
        <motion.div
          key="planned-purchase-edit-window"
          initial="closed"
          animate="open"
          exit="closed"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
        >
          {/* Backdrop */}
          <motion.div
            aria-hidden="true"
            variants={backdropVariants}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onMouseDown={onClose}
          />

          {/* Drawer / Modal Shell */}
          <motion.div
            ref={dialogRef}
            variants={sheetVariants}
            role="dialog"
            tabIndex={-1}
            aria-modal="true"
            aria-labelledby="planned-purchase-edit-title"
            className="relative z-10 w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl border border-gray-100 flex flex-col"
          >
            {/* Header */}
            <div className="sticky top-0 z-20 flex items-center justify-between p-4 border-b border-[#E6E8EC] bg-white">
              <div className="flex items-center gap-2">
                <IoCreateOutline className="text-lg text-[#2F7473]" aria-hidden="true" />
                <h2 id="planned-purchase-edit-title" className="font-semibold text-[#20242A] text-base">
                  {t('editPlannedPurchase')}
                </h2>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                aria-label={t('close')}
                className="w-9 h-9 rounded-full flex items-center justify-center text-[#6F7782] hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              >
                <IoClose className="text-xl" aria-hidden="true" />
              </button>
            </div>

            {/* Form Content */}
            <div className="p-4 overflow-y-auto">
              <PlannedPurchaseForm
                initialData={item}
                onSubmit={onSubmit}
                onCancel={onClose}
                isSubmitting={isSubmitting}
                errorMessage={errorMessage}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default PlannedPurchaseEditDialog;
