import React from 'react';
import { useTranslation } from 'react-i18next';
import SettingsModalTransition from './SettingsModalTransition';

function CurrencySelectionModal({
  isOpen,
  currencyOptions,
  selectedCurrencyCode,
  onSelect,
  onRequestClose,
  onExitComplete,
}) {
  const { t } = useTranslation();

  return (
    <SettingsModalTransition
      isOpen={isOpen}
      backdropClassName="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      dialogClassName="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
      ariaLabelledby="currency-selection-title"
      onBackdropClick={onRequestClose}
      onExitComplete={onExitComplete}
    >
      {({ isExiting }) => (
        <>
        <div className="p-3.5 border-b border-gray-100 bg-slate-50">
          <h3 id="currency-selection-title" className="text-center font-semibold text-sm text-slate-800">
            {t('selectCurrency')}
          </h3>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {currencyOptions.map((currencyOption) => (
            <button
              key={currencyOption.code}
              type="button"
              className={
                'w-full text-left p-4 hover:bg-slate-50 transition-colors border-b border-gray-100 last:border-0 font-medium text-sm flex items-center justify-between ' +
                (currencyOption.code === selectedCurrencyCode
                  ? 'text-[#2F7473] font-semibold'
                  : 'text-gray-700')
              }
              onClick={() => onSelect(currencyOption.code)}
              disabled={isExiting}
            >
              <span>
                {currencyOption.symbol} {currencyOption.name}
              </span>
              {currencyOption.code === selectedCurrencyCode && (
                <span className="w-2 h-2 rounded-full bg-[#2F7473]" />
              )}
            </button>
          ))}
        </div>
        </>
      )}
    </SettingsModalTransition>
  );
}

export default CurrencySelectionModal;
