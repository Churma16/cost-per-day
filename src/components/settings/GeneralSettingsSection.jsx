import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  IoCashOutline,
  IoChevronForward,
  IoLanguageOutline,
} from 'react-icons/io5';

function GeneralSettingsSection({
  language,
  languageName,
  selectedCurrencyOption,
  isInteractionBlocked,
  onOpenLanguage,
  onOpenCurrency,
}) {
  const { t } = useTranslation();

  return (
    <div>
      <h2 className="text-xs font-medium text-gray-500 mb-1.5 px-1">
        {t('general')}
      </h2>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <button
          type="button"
          className="w-full flex items-center justify-between py-2.5 px-3.5 hover:bg-slate-50/70 transition-colors text-left"
          onClick={() => {
            if (!isInteractionBlocked) onOpenLanguage();
          }}
          aria-label={`${t('language')}: ${languageName}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-slate-100/80 flex items-center justify-center text-slate-600 flex-shrink-0">
              <IoLanguageOutline className="text-base" />
            </div>
            <span className="text-sm font-medium text-gray-800">{t('language')}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <span>{languageName}</span>
            <IoChevronForward className="text-gray-400 text-sm" />
          </div>
        </button>

        <div className="border-b border-gray-100 mx-3.5" />

        <button
          type="button"
          className="w-full flex items-center justify-between py-2.5 px-3.5 hover:bg-slate-50/70 transition-colors text-left"
          onClick={() => {
            if (!isInteractionBlocked) onOpenCurrency();
          }}
          aria-label={`${t('currency')}: ${selectedCurrencyOption?.symbol} ${selectedCurrencyOption?.name}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-slate-100/80 flex items-center justify-center text-slate-600 flex-shrink-0">
              <IoCashOutline className="text-base" />
            </div>
            <span className="text-sm font-medium text-gray-800">{t('currency')}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <span>
              {selectedCurrencyOption?.symbol} {selectedCurrencyOption?.code}
            </span>
            <IoChevronForward className="text-gray-400 text-sm" />
          </div>
        </button>
      </div>
    </div>
  );
}

export default GeneralSettingsSection;
