import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ActionLoadingContent } from '../ui/AsyncState';
import { useSlowAction } from '../../hooks/useLoadingPhases';
import SettingsModalTransition from './SettingsModalTransition';

function ImportConfirmDialog({
  isOpen,
  isImporting,
  onCancel,
  onConfirm,
  onExitComplete,
}) {
  const { t } = useTranslation();
  const keepButtonRef = useRef(null);
  const isSlowImporting = useSlowAction(isImporting);

  useEffect(() => {
    if (isOpen) {
      window.requestAnimationFrame(() => keepButtonRef.current?.focus());
    }
  }, [isOpen]);

  return (
    <SettingsModalTransition
      isOpen={isOpen}
      onExitComplete={onExitComplete}
      backdropClassName="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-16 p-4 z-50"
      dialogClassName="bg-white w-full max-w-sm rounded-2xl p-6 space-y-4 shadow-xl"
      ariaLabelledby="import-confirm-title"
    >
      {({ isExiting }) => (
        <>
          <h2 id="import-confirm-title" className="text-lg font-medium text-[var(--text-primary)]">
            {t('importWarning')}
          </h2>
          <p className="text-sm leading-6 text-[var(--text-secondary)]">{t('importConfirmation')}</p>
          {isSlowImporting && (
            <p role="status" className="text-center text-xs text-[var(--text-secondary)]">
              {t('importing')}
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <button
              ref={keepButtonRef}
              type="button"
              disabled={isImporting || isExiting}
              className="flex-1 rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-medium text-[var(--text-primary)] hover:bg-[#F6F7F8] disabled:opacity-50"
              onClick={onCancel}
            >
              {t('keepIt')}
            </button>
            <button
              type="button"
              disabled={isImporting || isExiting}
              aria-busy={isImporting ? 'true' : undefined}
              className="flex-1 rounded-xl border-[1.5px] border-[var(--error-outline)] bg-white px-4 py-3 text-sm font-medium text-[var(--error-text)] disabled:opacity-50"
              onClick={onConfirm}
            >
              {isImporting ? <ActionLoadingContent /> : t('importData')}
            </button>
          </div>
        </>
      )}
    </SettingsModalTransition>
  );
}

export default ImportConfirmDialog;
