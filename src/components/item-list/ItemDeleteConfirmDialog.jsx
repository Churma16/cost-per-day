import React from 'react';
import { useTranslation } from 'react-i18next';

function ItemDeleteConfirmDialog({
  item,
  isDeleting,
  onCancel,
  onConfirm,
}) {
  const { t } = useTranslation();

  if (!item) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="item-delete-dialog-title"
    >
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
        <h3 id="item-delete-dialog-title" className="text-lg font-bold text-gray-900">
          {t('confirmDelete')}
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          {t('deleteConfirmation')}
        </p>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            onClick={onCancel}
            disabled={isDeleting}
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? t('loading') : t('confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ItemDeleteConfirmDialog;
