import React from 'react';
import { useTranslation } from 'react-i18next';
import { IoWarningOutline } from 'react-icons/io5';
import { formatCurrency } from '../../utils/formatters';

function DeleteEquivalentConfirmDialog({
  target,
  isOpen,
  isClosing,
  isDeleting,
  onCancel,
  onConfirm,
}) {
  const { t } = useTranslation();

  if ((!isOpen && !isClosing) || !target) {
    return null;
  }

  return (
    <div
      className={
        'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-16 p-4 z-50 ' +
        (isClosing ? 'animate-calm-backdrop-exit' : 'animate-calm-backdrop')
      }
      onClick={(event) => event.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-equivalent-title"
    >
      <div
        className={
          'bg-white w-full max-w-sm rounded-2xl p-6 space-y-4 shadow-xl ' +
          (isClosing
            ? 'animate-calm-modal-exit pointer-events-none'
            : 'animate-calm-modal-glide')
        }
      >
        <div className="flex items-center gap-3 text-red-500">
          <IoWarningOutline className="text-2xl" />
          <h2 id="delete-equivalent-title" className="text-xl font-semibold text-gray-800">
            {t('deleteEquivalent')}
          </h2>
        </div>
        <p className="text-gray-600 text-sm">{t('confirmDeleteEquivalent')}</p>
        <p className="font-semibold text-gray-800 text-sm bg-gray-50 p-2.5 rounded-lg border border-gray-100">
          {target.name} (
          {formatCurrency(Number(target.amount || 0), target.currencyCode)}
          )
        </p>
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            disabled={isDeleting || isClosing}
            className="flex-1 py-3 px-4 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors duration-200 text-sm"
            onClick={onCancel}
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            disabled={isDeleting || isClosing}
            className="flex-1 py-3 px-4 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 transition-all duration-200 text-sm"
            onClick={onConfirm}
          >
            {isDeleting ? t('loading') : t('delete')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteEquivalentConfirmDialog;
