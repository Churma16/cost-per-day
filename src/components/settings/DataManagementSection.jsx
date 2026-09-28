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
import { InlineStateNotice } from '../ui/AsyncState';

function DataManagementSection({
  fileInputRef,
  isInteractionBlocked,
  onExport,
  onImport,
  onFileChange,
  isSigningOut,
  signOutError,
  authError,
  onSignOut,
  guestMigrationError,
  isMigratingGuestData,
  onRetryGuestMigration,
}) {
  const { t } = useTranslation();

  return (
    <SettingsSection id="data-settings-heading" title={t('dataAndAccount')}>
      {guestMigrationError && (
        <div role="alert" className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800">
          <p>{t('guestMigrationFailed')}</p>
          <button
            type="button"
            onClick={onRetryGuestMigration}
            disabled={isMigratingGuestData || isInteractionBlocked}
            className="mt-2 font-semibold underline disabled:opacity-50"
          >
            {isMigratingGuestData ? t('loading') : t('retryGuestMigration')}
          </button>
        </div>
      )}
      <SettingsCard>
        <button
          type="button"
          className={`${SETTINGS_ROW_CLASS} hover:bg-slate-50/70`}
          onClick={() => {
            if (!isInteractionBlocked) onExport();
          }}
        >
          <SettingsRowIcon><IoCloudDownloadOutline className="h-4 w-4" /></SettingsRowIcon>
          <SettingsRowText title={t('exportData')} subtitle={t('exportDataSubtitle')} />
          <SettingsChevron />
        </button>

        <SettingsDivider />

        <button
          type="button"
          className={`${SETTINGS_ROW_CLASS} hover:bg-slate-50/70`}
          onClick={() => {
            if (!isInteractionBlocked) onImport();
          }}
        >
          <SettingsRowIcon><IoCloudUploadOutline className="h-4 w-4" /></SettingsRowIcon>
          <SettingsRowText title={t('importData')} subtitle={t('importDataSubtitle')} />
          <SettingsChevron />
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
          className={`${SETTINGS_ROW_CLASS} hover:bg-red-50/60 disabled:opacity-50`}
          onClick={() => {
            if (!isInteractionBlocked) onSignOut();
          }}
          disabled={isSigningOut || isInteractionBlocked}
          aria-label={t('signOut')}
        >
          <SettingsRowIcon tone="danger">
            <IoLogOutOutline className="h-4 w-4" />
          </SettingsRowIcon>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium leading-5 text-red-600">
              {isSigningOut ? t('loading') : t('signOut')}
            </span>
            <span className="mt-0.5 block text-xs leading-5 text-gray-500">
              {t('signOutSubtitle')}
            </span>
          </span>
        </button>
      </SettingsCard>
      {(signOutError || authError) && (
        <InlineStateNotice
          variant="error"
          message={signOutError || t('signOutError')}
          className="mt-2"
        />
      )}
    </SettingsSection>
  );
}

export default DataManagementSection;
