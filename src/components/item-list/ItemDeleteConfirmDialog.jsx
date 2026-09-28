import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ActionLoadingContent } from '../ui/AsyncState';

function ItemDeleteConfirmDialog({
  item,
  isDeleting,
  onCancel,
  onConfirm,
}) {
  const { t } = useTranslation();
  const keepButtonRef = useRef(null);

  useEffect(() => {
    if (item) {
      keepButtonRef.current?.focus();
    }
  }, [item]);

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
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h3 id="item-delete-dialog-title" className="text-lg font-medium text-[var(--text-primary)]">
          {t('deleteThisItem')}
        </h3>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          {t('deleteItemIrreversible', { name: item.name })}
        </p>
        <div className="mt-6 flex gap-3">
          <button
            ref={keepButtonRef}
            type="button"
            className="flex-1 rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[#F6F7F8] disabled:opacity-50"
            onClick={onCancel}
            disabled={isDeleting}
          >
            {t('keepIt')}
          </button>
          <button
            type="button"
            className="flex-1 rounded-xl border-[1.5px] border-[var(--error-outline)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--error-text)] disabled:opacity-50"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? <ActionLoadingContent /> : t('delete')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ItemDeleteConfirmDialog;
