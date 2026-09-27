import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  IoCashOutline,
  IoLanguageOutline,
} from 'react-icons/io5';
import {
  SETTINGS_ROW_CLASS,
  SettingsCard,
  SettingsChevron,
  SettingsDivider,
  SettingsRowIcon,
  SettingsSection,
} from './SettingsList';

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
    <SettingsSection id="general-settings-heading" title={t('general')}>
      <SettingsCard>
        <button
          type="button"
          className={`${SETTINGS_ROW_CLASS} hover:bg-slate-50/70`}
          onClick={() => {
            if (!isInteractionBlocked) onOpenLanguage();
          }}
          aria-label={`${t('language')}: ${languageName}`}
        >
          <SettingsRowIcon><IoLanguageOutline className="h-4 w-4" /></SettingsRowIcon>
          <span className="min-w-0 flex-1 text-sm font-medium text-gray-900">{t('language')}</span>
          <span className="flex items-center gap-1.5 text-sm text-gray-500">
            <span>{languageName}</span>
            <SettingsChevron />
          </span>
        </button>

        <SettingsDivider />

        <button
          type="button"
          className={`${SETTINGS_ROW_CLASS} hover:bg-slate-50/70`}
          onClick={() => {
            if (!isInteractionBlocked) onOpenCurrency();
          }}
          aria-label={`${t('currency')}: ${selectedCurrencyOption?.symbol} ${selectedCurrencyOption?.name}`}
        >
          <SettingsRowIcon><IoCashOutline className="h-4 w-4" /></SettingsRowIcon>
          <span className="min-w-0 flex-1 text-sm font-medium text-gray-900">{t('currency')}</span>
          <span className="flex items-center gap-1.5 text-sm text-gray-500">
            <span>
              {selectedCurrencyOption?.symbol} {selectedCurrencyOption?.code}
            </span>
            <SettingsChevron />
          </span>
        </button>
      </SettingsCard>
    </SettingsSection>
  );
}

export default GeneralSettingsSection;
