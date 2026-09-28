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
import { ErrorCard, NoticeCard, SlowLoadIndicator } from '../ui/AsyncState';
import { useLoadingPhases } from '../../hooks/useLoadingPhases';

function GeneralSettingsSkeleton({ paused }) {
  const skeletonClass = paused
    ? 'state-skeleton state-skeleton--paused'
    : 'state-skeleton';

  return (
    <SettingsCard className="min-h-[121px]">
      {[0, 1].map((rowIndex) => (
        <React.Fragment key={rowIndex}>
          {rowIndex > 0 && <SettingsDivider />}
          <div aria-hidden="true" className={SETTINGS_ROW_CLASS}>
            <div className={`${skeletonClass} h-8 w-8 flex-none rounded-lg bg-[var(--skeleton-bar)]`} />
            <div className={`${skeletonClass} h-3 w-20 rounded bg-[var(--skeleton-bar)]`} />
            <div className="ml-auto flex items-center gap-1.5">
              <div className={`${skeletonClass} h-3 w-14 rounded bg-[var(--skeleton-bar)]`} />
              <div className={`${skeletonClass} h-4 w-4 rounded bg-[var(--skeleton-bar)]`} />
            </div>
          </div>
        </React.Fragment>
      ))}
    </SettingsCard>
  );
}

function GeneralSettingsSection({
  language,
  languageName,
  selectedCurrencyOption,
  isLoading,
  hasSettingsData = true,
  loadError,
  onRetry,
  isInteractionBlocked,
  onOpenLanguage,
  onOpenCurrency,
  errorMessage,
  onDismissError,
}) {
  const { t } = useTranslation();
  const loadingState = useLoadingPhases(isLoading);
  const showLoadingState = loadingState.phase !== 'idle';
  const showInitialLoadError = Boolean(loadError && !hasSettingsData);

  return (
    <SettingsSection id="general-settings-heading" title={t('general')}>
      {showInitialLoadError ? (
        <NoticeCard
          body={loadError}
          actionLabel={t('tryAgain')}
          onAction={onRetry}
        />
      ) : showLoadingState ? (
        <div aria-busy="true">
          {loadingState.phase === 'blank' ? (
            <SettingsCard className="min-h-[121px]" />
          ) : (
            <GeneralSettingsSkeleton paused={loadingState.showSlowIndicator} />
          )}
          {loadingState.showSlowIndicator && (
            <SlowLoadIndicator message={t('stillLoadingSettings')} />
          )}
        </div>
      ) : (
        <>
          {loadError && (
            <NoticeCard
              body={loadError}
              actionLabel={t('tryAgain')}
              onAction={onRetry}
              className="mb-3"
            />
          )}
          <SettingsCard className="state-content-enter">
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
        </>
      )}
      {errorMessage && (
        <ErrorCard
          title={t('preferenceUpdateErrorTitle')}
          body={errorMessage}
          onDismiss={onDismissError}
        />
      )}
    </SettingsSection>
  );
}

export default GeneralSettingsSection;
