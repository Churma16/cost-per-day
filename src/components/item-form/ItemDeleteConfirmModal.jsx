import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { ActionLoadingContent } from '../ui/AsyncState';

function ItemDeleteConfirmModal({
  isOpen,
  itemName,
  isDeleting = false,
  onClose,
  onConfirm,
}) {
  const { t } = useTranslation();
  const shouldReduceMotion = useReducedMotion();
  const keepButtonRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      window.requestAnimationFrame(() => keepButtonRef.current?.focus());
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="delete-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.16, ease: 'easeOut' }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-16 p-4 z-50"
          onClick={(event) => {
            if (event.target === event.currentTarget && !isDeleting) {
              onClose();
            }
          }}
        >
          <motion.div
            key="delete-modal-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="item-delete-confirm-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.16, ease: 'easeOut' }}
            className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-xl"
          >
            <h2 id="item-delete-confirm-title" className="text-lg font-medium text-[var(--text-primary)]">
              {t('deleteThisItem')}
            </h2>
            <p className="text-sm leading-6 text-[var(--text-secondary)]">
              {t('deleteItemIrreversible', { name: itemName })}
            </p>
            <div className="flex gap-3 pt-2">
              <button
                ref={keepButtonRef}
                type="button"
                disabled={isDeleting}
                className="flex-1 rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-medium text-[var(--text-primary)] hover:bg-[#F6F7F8] disabled:opacity-50"
                onClick={onClose}
              >
                {t('keepIt')}
              </button>
              <button
                type="button"
                disabled={isDeleting}
                className="flex-1 rounded-xl border-[1.5px] border-[var(--error-outline)] bg-white px-4 py-3 text-sm font-medium text-[var(--error-text)] disabled:opacity-50"
                onClick={onConfirm}
              >
                {isDeleting ? <ActionLoadingContent /> : t('delete')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ItemDeleteConfirmModal;
