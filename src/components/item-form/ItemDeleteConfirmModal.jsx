import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';

function ItemDeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
}) {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="delete-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-16 p-4 z-50"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              onClose();
            }
          }}
        >
          <motion.div
            key="delete-modal-dialog"
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white w-full max-w-sm rounded-2xl p-6 space-y-4 shadow-xl"
          >
            <h2 className="text-xl font-semibold text-gray-800">{t('confirmDelete')}</h2>
            <p className="text-gray-600">{t('deleteConfirmation')}</p>
            <div className="flex gap-3 pt-2">
              <button 
                type="button"
                className="flex-1 py-3 px-4 rounded-xl bg-gray-100 text-gray-700 font-medium
                hover:bg-gray-200 transition-colors duration-200"
                onClick={onClose}
              >
                {t('cancel')}
              </button>
              <button 
                type="button"
                className="flex-1 py-3 px-4 rounded-xl bg-red-600 
                text-white font-medium hover:bg-red-700 transition-all duration-200 text-sm shadow-sm"
                onClick={onConfirm}
              >
                {t('confirm')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ItemDeleteConfirmModal;
