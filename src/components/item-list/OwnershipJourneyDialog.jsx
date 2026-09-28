import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { IoArrowDown, IoClose, IoTimeOutline } from 'react-icons/io5';
import { formatDisplayDate } from '../../utils/formatters';
import { buildOwnershipJourney } from '../../utils/itemLineage';

function OwnershipJourneyDialog({
  isOpen,
  item,
  items,
  onClose,
}) {
  const { t, i18n } = useTranslation();
  const shouldReduceMotion = useReducedMotion();
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const currentItemId = item?.id === null || item?.id === undefined
    ? null
    : String(item.id);
  const journeyItems = isOpen && item
    ? buildOwnershipJourney(items, item)
    : [];

  useEffect(() => {
    if (!isOpen) return undefined;

    closeButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusableElements = [...(dialogRef.current?.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      ) || [])];

      if (focusableElements.length === 0) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }

      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (
        event.shiftKey
        && (activeElement === firstFocusable || !dialogRef.current?.contains(activeElement))
      ) {
        event.preventDefault();
        lastFocusable.focus();
      } else if (
        !event.shiftKey
        && (activeElement === lastFocusable || !dialogRef.current?.contains(activeElement))
      ) {
        event.preventDefault();
        firstFocusable.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (currentItemId) {
        document.getElementById(`ownership-journey-trigger-${currentItemId}`)?.focus();
      }
    };
  }, [currentItemId, isOpen, onClose]);

  const backdropVariants = {
    closed: {
      opacity: 0,
      transition: {
        duration: shouldReduceMotion ? 0 : 0.25,
        ease: [0.25, 0.8, 0.25, 1],
      },
    },
    open: {
      opacity: 1,
      transition: {
        duration: shouldReduceMotion ? 0 : 0.3,
        ease: [0.25, 0.8, 0.25, 1],
      },
    },
  };

  const sheetVariants = {
    closed: {
      y: shouldReduceMotion ? '0%' : '100%',
      transition: {
        duration: shouldReduceMotion ? 0 : 0.4,
        ease: [0.4, 0, 0.6, 1],
      },
    },
    open: {
      y: '0%',
      transition: {
        duration: shouldReduceMotion ? 0 : 0.5,
        ease: [0.25, 0.8, 0.25, 1],
      },
    },
  };

  return (
    <AnimatePresence>
      {isOpen && item && (
        <motion.div
          key="ownership-journey-window"
          initial="closed"
          animate="open"
          exit="closed"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
        >
          <motion.div
            aria-hidden="true"
            variants={backdropVariants}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onMouseDown={onClose}
          />

          <motion.div
            ref={dialogRef}
            variants={sheetVariants}
            role="dialog"
            tabIndex={-1}
            aria-modal="true"
            aria-labelledby="ownership-journey-title"
            aria-describedby="ownership-journey-description"
            className="relative z-10 w-full sm:max-w-md max-h-[88vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-white shadow-xl border border-gray-100"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-[#E6E8EC] bg-white">
              <div className="flex items-center gap-2 min-w-0">
                <IoTimeOutline className="text-lg text-[#2F7473] flex-shrink-0" aria-hidden="true" />
                <h2 id="ownership-journey-title" className="font-semibold text-[#20242A] truncate">
                  {t('ownershipJourney')}
                </h2>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                aria-label={t('close')}
                className="w-9 h-9 rounded-full flex items-center justify-center text-[#6F7782] hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              >
                <IoClose aria-hidden="true" />
              </button>
            </div>

            <div className="p-4">
              <p id="ownership-journey-description" className="text-sm leading-5 text-[#6F7782]">
                {t('ownershipJourneyDescription')}
              </p>

              <div className="mt-4">
                {journeyItems.map((journeyItem, index) => {
                  const journeyItemId = String(journeyItem.id);
                  const isCurrent = journeyItemId === currentItemId;

                  return (
                    <React.Fragment key={journeyItemId}>
                      <div
                        aria-current={isCurrent ? 'true' : undefined}
                        className={`rounded-xl border p-3 ${isCurrent
                          ? 'border-teal-200 bg-teal-50/60'
                          : 'border-[#E6E8EC] bg-[#F6F7F8]'}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-[#20242A] break-words">
                              {journeyItem.name}
                            </p>
                            {journeyItem.purchaseDate && (
                              <p className="mt-0.5 text-xs text-[#6F7782]">
                                {t('purchaseDate')}: {formatDisplayDate(
                                  journeyItem.purchaseDate,
                                  i18n?.language,
                                )}
                              </p>
                            )}
                          </div>
                          {isCurrent && (
                            <span className="flex-shrink-0 rounded-full border border-teal-200 bg-white px-2 py-1 text-[11px] font-medium text-teal-700">
                              {t('ownershipJourneyThisItem')}
                            </span>
                          )}
                        </div>
                      </div>

                      {index < journeyItems.length - 1 && (
                        <div className="flex justify-center py-1 text-[#9AA1AA]" aria-hidden="true">
                          <IoArrowDown className="text-sm" />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default OwnershipJourneyDialog;
