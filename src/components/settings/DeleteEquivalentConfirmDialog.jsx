import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../utils/formatters';
import { ActionLoadingContent, ErrorCard } from '../ui/AsyncState';
import SettingsModalTransition from './SettingsModalTransition';

function DeleteEquivalentConfirmDialog({
  target,
  isOpen,
  isDeleting,
  errorMessage,
  onCancel,
  onConfirm,
  onExitComplete,
}) {
  const { t } = useTranslation();
  const keepButtonRef = useRef(null);

  useEffect(() => {
    if (isOpen && target) {
      keepButtonRef.current?.focus();
    }
  }, [isOpen, target]);

  return (
    <SettingsModalTransition
      isOpen={isOpen && Boolean(target)}
      onExitComplete={onExitComplete}
      backdropClassName="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-16 p-4 z-50"
      dialogClassName="bg-white w-full max-w-sm rounded-2xl p-6 space-y-4 shadow-xl"
      ariaLabelledby="delete-equivalent-title"
    >
      {({ isExiting }) => (
        <>
          <h2 id="delete-equivalent-title" className="text-lg font-medium text-[var(--text-primary)]">
            {t('deleteThisEquivalent')}
          </h2>
          <p className="text-sm leading-6 text-[var(--text-secondary)]">
            {t('deleteEquivalentIrreversible', {
              name: target?.name,
              amount: target
                ? formatCurrency(Number(target.amount || 0), target.currencyCode)
                : '',
            })}
          </p>
          {errorMessage && (
            <ErrorCard
              title={t('deleteEquivalentErrorTitle')}
              body={errorMessage}
            />
          )}
          <div className="flex gap-3 pt-2">
            <button
              ref={keepButtonRef}
              type="button"
              disabled={isDeleting || isExiting}
              className="flex-1 rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-medium text-[var(--text-primary)] hover:bg-[#F6F7F8] disabled:opacity-50"
              onClick={onCancel}
            >
              {t('keepIt')}
            </button>
            <button
              type="button"
              disabled={isDeleting || isExiting}
              className="flex-1 rounded-xl border-[1.5px] border-[var(--error-outline)] bg-white px-4 py-3 text-sm font-medium text-[var(--error-text)] disabled:opacity-50"
              onClick={onConfirm}
            >
              {isDeleting ? <ActionLoadingContent /> : t('delete')}
            </button>
          </div>
        </>
      )}
    </SettingsModalTransition>
  );
}

export default DeleteEquivalentConfirmDialog;
