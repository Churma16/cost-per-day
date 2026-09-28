import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  IoAdd,
  IoPencilOutline,
  IoScaleOutline,
  IoTrashOutline,
} from 'react-icons/io5';
import { formatCurrency } from '../../utils/formatters';
import {
  SETTINGS_ROW_CLASS,
  SettingsCard,
  SettingsDivider,
  SettingsRowIcon,
  SettingsRowText,
  SettingsSection,
} from './SettingsList';
import {
  CardListSkeleton,
  EmptyState,
  NoticeCard,
  SlowLoadIndicator,
} from '../ui/AsyncState';
import { useLoadingPhases } from '../../hooks/useLoadingPhases';

function ValueEquivalentsSection({
  valueEquivalents,
  isLoading,
  error,
  isInteractionBlocked,
  onAdd,
  onEdit,
  onDelete,
  onRetry,
}) {
  const { t } = useTranslation();
  const loadingState = useLoadingPhases(isLoading);

  return (
    <SettingsSection
      id="value-equivalents-heading"
      title={t('valueEquivalents')}
      description={t('valueEquivalentsSubtitle')}
      action={!isLoading && !error && valueEquivalents.length > 0 ? (
        <button
          type="button"
          className="flex min-h-9 flex-none items-center gap-1 rounded-lg px-2 text-xs font-semibold text-[#2F7473] transition-colors hover:bg-teal-50/60 hover:text-[#265e5d]"
          onClick={() => {
            if (!isInteractionBlocked) onAdd();
          }}
          aria-label={t('addEquivalent')}
        >
          <IoAdd className="text-sm" />
          <span>{t('add')}</span>
        </button>
      ) : null}
    >

      {loadingState.phase !== 'idle' ? (
        <div aria-busy="true" className="min-h-[132px]">
          {loadingState.phase !== 'blank' && (
            <>
              <CardListSkeleton count={2} paused={loadingState.showSlowIndicator} />
              {loadingState.showSlowIndicator && (
                <SlowLoadIndicator message={t('stillLoadingEquivalents')} />
              )}
            </>
          )}
        </div>
      ) : error ? (
        <NoticeCard
          body={t('equivalentsLoadErrorBody')}
          actionLabel={t('tryAgain')}
          onAction={onRetry}
        />
      ) : valueEquivalents.length === 0 ? (
        <EmptyState
          motif="home"
          title={t('noEquivalents')}
          description={t('equivalentsEmptyDescription')}
          actionLabel={t('addEquivalent')}
          onAction={() => {
            if (!isInteractionBlocked) onAdd();
          }}
          className="py-6"
        />
      ) : (
        <SettingsCard>
          {valueEquivalents.map((equivalentItem, index) => (
            <React.Fragment key={equivalentItem.id}>
              {index > 0 && <SettingsDivider />}
              <div className={`${SETTINGS_ROW_CLASS} hover:bg-slate-50/50`}>
                <SettingsRowIcon tone="brand">
                  <IoScaleOutline className="h-4 w-4" />
                </SettingsRowIcon>
                <SettingsRowText
                  title={equivalentItem.name}
                  subtitle={formatCurrency(Number(equivalentItem.amount || 0), equivalentItem.currencyCode)}
                />
                <div className="flex flex-none items-center gap-0.5">
                  <button
                    type="button"
                    aria-label={`${t('editEquivalent')} ${equivalentItem.name}`}
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    onClick={() => {
                      if (!isInteractionBlocked) onEdit(equivalentItem);
                    }}
                  >
                    <IoPencilOutline className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`${t('deleteEquivalent')} ${equivalentItem.name}`}
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--error-text)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--error-outline)]"
                    onClick={() => {
                      if (!isInteractionBlocked) onDelete(equivalentItem);
                    }}
                  >
                    <IoTrashOutline className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </React.Fragment>
          ))}
        </SettingsCard>
      )}
    </SettingsSection>
  );
}

export default ValueEquivalentsSection;
