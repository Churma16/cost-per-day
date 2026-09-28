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
import { StatePanel } from '../ui/AsyncState';

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

      {isLoading ? (
        <StatePanel
          variant="loading"
          title={t('equivalentsLoadingTitle')}
          description={t('equivalentsLoadingDescription')}
          className="py-6"
        />
      ) : error ? (
        <StatePanel
          variant="error"
          title={t('equivalentsLoadErrorTitle')}
          description={t('errorLoadingEquivalents')}
          actionLabel={t('retry')}
          onAction={onRetry}
          className="py-6"
        />
      ) : valueEquivalents.length === 0 ? (
        <StatePanel
          variant="empty"
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
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
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
