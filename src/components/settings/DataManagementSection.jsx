import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  IoCloudDownloadOutline,
  IoCloudUploadOutline,
  IoLogOutOutline,
} from 'react-icons/io5';
import {
  SETTINGS_ROW_CLASS,
  SettingsCard,
  SettingsChevron,
  SettingsDivider,
  SettingsRowIcon,
  SettingsRowText,
  SettingsSection,
} from './SettingsList';
import {
  ActionLoadingContent,
  ErrorCard,
} from '../ui/AsyncState';
import { useSlowAction } from '../../hooks/useLoadingPhases';

function DataManagementSection({
  fileInputRef,
  isInteractionBlocked,
  onExport,
  onImport,
  onFileChange,
  isExporting,
  isImporting,
  dataTransferError,
  onDismissDataTransferError,
  isSigningOut,
  signOutError,
  authError,
  onSignOut,
  guestMigrationError,
  isMigratingGuestData,
  onRetryGuestMigration,
}) {
  const { t } = useTranslation();
  const isSlowExporting = useSlowAction(isExporting);
  const isSlowImporting = useSlowAction(isImporting);

  return (
    <SettingsSection id="data-settings-heading" title={t('dataAndAccount')}>
      {guestMigrationError && (
        <ErrorCard
          title={t('guestMigrationFailed')}
          body={t('guestMigrationRetryBody')}
          actionLabel={isMigratingGuestData ? undefined : t('tryAgain')}
          onAction={isMigratingGuestData ? undefined : onRetryGuestMigration}
          className="mb-3"
        />
      )}

      {dataTransferError && (
        <ErrorCard
          title={t('dataTransferErrorTitle')}
          body={dataTransferError}
          onDismiss={onDismissDataTransferError}
          className="mb-3"
        />
      )}

      <SettingsCard>
        <button
          type="button"
          className={`${SETTINGS_ROW_CLASS} hover:bg-slate-50/70 disabled:opacity-50`}
          onClick={() => {
            if (!isInteractionBlocked) onExport();
          }}
          disabled={isExporting || isImporting || isInteractionBlocked}
          aria-busy={isExporting ? 'true' : undefined}
        >
          <SettingsRowIcon><IoCloudDownloadOutline className="h-4 w-4" /></SettingsRowIcon>
          <SettingsRowText title={t('exportData')} subtitle={t('exportDataSubtitle')} />
          {isExporting ? <ActionLoadingContent /> : <SettingsChevron />}
        </button>

        <SettingsDivider />

        <button
          type="button"
          className={`${SETTINGS_ROW_CLASS} hover:bg-slate-50/70 disabled:opacity-50`}
          onClick={() => {
            if (!isInteractionBlocked) onImport();
          }}
          disabled={isExporting || isImporting || isInteractionBlocked}
          aria-busy={isImporting ? 'true' : undefined}
        >
          <SettingsRowIcon><IoCloudUploadOutline className="h-4 w-4" /></SettingsRowIcon>
          <SettingsRowText title={t('importData')} subtitle={t('importDataSubtitle')} />
          {isImporting ? <ActionLoadingContent /> : <SettingsChevron />}
        </button>

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".json"
          onChange={onFileChange}
        />

        <SettingsDivider />

        <button
          type="button"
          className={`${SETTINGS_ROW_CLASS} hover:bg-slate-50/70 disabled:opacity-50`}
          onClick={() => {
            if (!isInteractionBlocked) onSignOut();
          }}
          disabled={isSigningOut || isInteractionBlocked}
          aria-label={t('signOut')}
          aria-busy={isSigningOut ? 'true' : undefined}
        >
          <SettingsRowIcon tone="danger">
            <IoLogOutOutline className="h-4 w-4" />
          </SettingsRowIcon>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium leading-5 text-[var(--error-text)]">
              {isSigningOut ? <ActionLoadingContent /> : t('signOut')}
            </span>
            <span className="mt-0.5 block text-xs leading-5 text-gray-500">
              {t('signOutSubtitle')}
            </span>
          </span>
        </button>
      </SettingsCard>

      {(isSlowExporting || isSlowImporting) && (
        <p role="status" className="mt-2 text-center text-xs text-[var(--text-secondary)]">
          {isSlowExporting ? t('exporting') : t('importing')}
        </p>
      )}

      {(signOutError || authError) && (
        <ErrorCard
          title={t('signOutErrorTitle')}
          body={signOutError || t('signOutErrorBody')}
          className="mt-2"
        />
      )}
    </SettingsSection>
  );
}

export default DataManagementSection;
