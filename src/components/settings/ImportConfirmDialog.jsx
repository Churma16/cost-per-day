import React from 'react';
import { useTranslation } from 'react-i18next';
import { IoWarningOutline } from 'react-icons/io5';
import SettingsModalTransition from './SettingsModalTransition';

function ImportConfirmDialog({
  isOpen,
  isImporting,
  onCancel,
  onConfirm,
  onExitComplete,
}) {
  const { t } = useTranslation();

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
        <div className="flex items-center gap-3 text-amber-500">
          <IoWarningOutline className="text-2xl" />
          <h2 id="import-confirm-title" className="text-xl font-semibold text-gray-800">
            {t('importWarning')}
          </h2>
        </div>
        <p className="text-gray-600 text-sm">{t('importConfirmation')}</p>
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            disabled={isImporting || isExiting}
            className="flex-1 py-3 px-4 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors duration-200 text-sm"
            onClick={onCancel}
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            disabled={isImporting || isExiting}
            className="flex-1 py-3 px-4 rounded-xl bg-amber-600 text-white font-medium hover:bg-amber-700 disabled:opacity-50 transition-all duration-200 text-sm shadow-sm"
            onClick={onConfirm}
          >
            {isImporting ? t('loading') : t('confirm')}
          </button>
        </div>
        </>
      )}
    </SettingsModalTransition>
  );
}

export default ImportConfirmDialog;
