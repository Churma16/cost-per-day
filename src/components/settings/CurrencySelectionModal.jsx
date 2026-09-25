import React from 'react';
import { useTranslation } from 'react-i18next';

function CurrencySelectionModal({
  isOpen,
  isClosing,
  currencyOptions,
  selectedCurrencyCode,
  onSelect,
  onRequestClose,
}) {
  const { t } = useTranslation();

  if (!isOpen && !isClosing) {
    return null;
  }

  return (
    <div
      className={
        'fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 ' +
        (isClosing ? 'animate-calm-backdrop-exit' : 'animate-calm-backdrop')
      }
      onClick={() => {
        if (!isClosing) {
          onRequestClose();
        }
      }}
    >
      <div
        className={
          'w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden ' +
          (isClosing
            ? 'animate-calm-modal-exit pointer-events-none'
            : 'animate-calm-modal-glide')
        }
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="currency-selection-title"
      >
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
      </div>
    </div>
  );
}

export default CurrencySelectionModal;
