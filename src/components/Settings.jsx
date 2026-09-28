import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { usePersistence } from '../contexts/PersistenceContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useValueEquivalents } from '../contexts/ValueEquivalentsContext';
import { useAuth } from '../contexts/AuthContext';
import { getSupportedCurrencies } from '../utils/currencyConfig';
import { useReplaceItems } from '../hooks/useItems';
import { queryKeys, SERVER_STATE_STALE_TIME } from '../query/queryConfig';
import {
  buildExportFilename,
  serializeItemsExport,
  validateImportedItems,
} from '../utils/settingsDataTransfer';
import GeneralSettingsSection from './settings/GeneralSettingsSection';
import ValueEquivalentsSection from './settings/ValueEquivalentsSection';
import DataManagementSection from './settings/DataManagementSection';
import AccountSettingsSection from './settings/AccountSettingsSection';
import LegalSettingsSection from './settings/LegalSettingsSection';
import LanguageSelectionModal from './settings/LanguageSelectionModal';
import CurrencySelectionModal from './settings/CurrencySelectionModal';
import ImportConfirmDialog from './settings/ImportConfirmDialog';
import EquivalentFormModal from './settings/EquivalentFormModal';
import DeleteEquivalentConfirmDialog from './settings/DeleteEquivalentConfirmDialog';
import { PageHeader } from './ui/PageHeader';
import { PageContainer } from './ui/PageContainer';

const NOTIFICATION_DURATION_MS = 3000;

function Settings() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { repositories } = usePersistence();
  const {
    language,
    changeLanguage,
    loadError: languageLoadError,
    isLoading: isLoadingLanguage,
    refetchSettings: refetchLanguageSettings,
  } = useLanguage();
  const {
    currencyCode,
    changeCurrency,
    loadError: currencyLoadError,
    isLoading: isLoadingCurrency,
    refetchSettings: refetchCurrencySettings,
  } = useCurrency();
  const {
    isGuest,
    signIn,
    signOut,
    error: authError,
    guestMigrationError,
    isMigratingGuestData,
    retryGuestMigration,
  } = useAuth();
  const {
    valueEquivalents = [],
    isLoading: isLoadingEquivalents,
    addEquivalent,
    editEquivalent,
    removeEquivalent,
    refreshEquivalents,
    error: equivalentsError
  } = useValueEquivalents();
  const replaceItemsMutation = useReplaceItems();

  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [notification, setNotification] = useState(null);
  const [preferenceError, setPreferenceError] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [dataTransferError, setDataTransferError] = useState(null);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [importData, setImportData] = useState(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const [showEquivalentModal, setShowEquivalentModal] = useState(false);
  const [editingEquivalent, setEditingEquivalent] = useState(null);
  const [showDeleteEquivalentConfirm, setShowDeleteEquivalentConfirm] = useState(null);
  const [isDeletingEquivalent, setIsDeletingEquivalent] = useState(false);
  const [deleteEquivalentError, setDeleteEquivalentError] = useState(null);

  const fileInputRef = useRef(null);
  const notificationTimeoutRef = useRef(null);

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'id', name: 'Bahasa Indonesia' }
  ];

  const currencyOptions = getSupportedCurrencies().map((currencyConfiguration) => ({
    code: currencyConfiguration.code,
    symbol: currencyConfiguration.symbol,
    name: t(currencyConfiguration.nameKey)
  }));

  const selectedCurrencyOption = currencyOptions.find(
    (currencyOption) => currencyOption.code === currencyCode
  );

  const getLanguageName = (code) => {
    const matchedLanguage = languages.find((lang) => lang.code === code);
    return matchedLanguage ? matchedLanguage.name : 'English';
  };

  const clearNotificationTimer = useCallback(() => {
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
      notificationTimeoutRef.current = null;
    }
  }, []);

  const clearNotification = useCallback(() => {
    clearNotificationTimer();
    setNotification(null);
  }, [clearNotificationTimer]);

  const showNotification = useCallback((nextNotification, { autoDismiss = true } = {}) => {
    clearNotificationTimer();
    setNotification(nextNotification);

    if (autoDismiss) {
      notificationTimeoutRef.current = setTimeout(() => {
        notificationTimeoutRef.current = null;
        setNotification(null);
      }, NOTIFICATION_DURATION_MS);
    }
  }, [clearNotificationTimer]);

  useEffect(() => () => {
    clearNotificationTimer();
  }, [clearNotificationTimer]);

  const generalLoadError = languageLoadError || currencyLoadError;
  const handleRetryGeneralSettings = useCallback(() => {
    if (typeof refetchLanguageSettings === 'function') {
      refetchLanguageSettings();
    }
    if (typeof refetchCurrencySettings === 'function') {
      refetchCurrencySettings();
    }
  }, [refetchLanguageSettings, refetchCurrencySettings]);

  const handleLanguageChange = async (code) => {
    setShowLanguageDropdown(false);
    setPreferenceError(null);
    try {
      await changeLanguage(code);
      setPreferenceError(null);
    } catch (error) {
      console.error('Error updating language:', error);
      setPreferenceError(t('errorUpdatingLanguage'));
    }
  };

  const handleCurrencyChange = async (selectedCurrencyCode) => {
    setShowCurrencyDropdown(false);
    setPreferenceError(null);
    try {
      await changeCurrency(selectedCurrencyCode);
      setPreferenceError(null);
    } catch (error) {
      console.error('Error updating currency:', error);
      setPreferenceError(t('errorUpdatingCurrency'));
    }
  };

  const handleSignOut = async () => {
    setSignOutError(null);
    setIsSigningOut(true);
    try {
      if (signOut) {
        await signOut();
      }
    } catch (error) {
      console.error('Error signing out:', error);
      setSignOutError(t('signOutErrorBody'));
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleExportData = async () => {
    setDataTransferError(null);
    setIsExporting(true);
    try {
      const items = await queryClient.fetchQuery({
        queryKey: queryKeys.items,
        queryFn: () => repositories.items.list(),
        staleTime: SERVER_STATE_STALE_TIME,
      });

      if (!items || items.length === 0) {
        showNotification({
          message: t('noDataForExport'),
          type: 'warning'
        });
        return;
      }

      const dataStr = serializeItemsExport(items);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      const exportFileDefaultName = buildExportFilename(new Date());

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();

      showNotification({
        message: t('exportSuccess'),
        type: 'success'
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      setDataTransferError(t('exportErrorBody'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportData = () => {
    setDataTransferError(null);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setDataTransferError(t('importFileErrorBody'));
      event.target.value = '';
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        try {
          const content = JSON.parse(loadEvent.target.result);

          if (!validateImportedItems(content)) {
            setDataTransferError(t('importFileErrorBody'));
            return;
          }

          setImportData(content);
          setActiveModal('import');
          setShowImportConfirm(true);
        } catch (error) {
          console.error('Error parsing JSON:', error);
          setDataTransferError(t('importFileErrorBody'));
        }
      };
      reader.onerror = () => {
        setDataTransferError(t('importFileErrorBody'));
      };
      reader.readAsText(file);
    } catch (error) {
      console.error('Error reading file:', error);
      setDataTransferError(t('importFileErrorBody'));
    }

    event.target.value = '';
  };

  const confirmImport = async () => {
    if (replaceItemsMutation.isPending || !importData) return;

    setDataTransferError(null);
    try {
      await replaceItemsMutation.mutateAsync(importData);
      showNotification({
        message: t('importSuccess'),
        type: 'success'
      });
      setShowImportConfirm(false);
    } catch (error) {
      console.error('Error importing data:', error);
      setShowImportConfirm(false);
      setDataTransferError(t('importErrorBody'));
    }
  };

  const handleOpenAddEquivalent = () => {
    setEditingEquivalent(null);
    setActiveModal('equivalent');
    setShowEquivalentModal(true);
  };

  const handleOpenEditEquivalent = (equivalentItem) => {
    setEditingEquivalent(equivalentItem);
    setActiveModal('equivalent');
    setShowEquivalentModal(true);
  };

  const handleSaveEquivalent = async (equivalentData) => {
    try {
      if (editingEquivalent) {
        await editEquivalent(editingEquivalent.id, equivalentData);
      } else {
        await addEquivalent(equivalentData);
      }
    } catch (saveError) {
      if (saveError?.code === 'guest_value_equivalent_limit') {
        const localizedError = new Error(t('guestValueEquivalentLimitReached', {
          limit: saveError.limit,
        }));
        localizedError.code = saveError.code;
        localizedError.limit = saveError.limit;
        throw localizedError;
      }
      throw new Error(t('equivalentSaveErrorBody'));
    }

    setShowEquivalentModal(false);
    showNotification({
      message: t('save'),
      type: 'success'
    });
  };

  const handleOpenDeleteConfirm = (equivalentItem) => {
    setDeleteEquivalentError(null);
    setActiveModal('delete');
    setShowDeleteEquivalentConfirm(equivalentItem);
  };

  const handleCloseDeleteConfirm = () => {
    if (isDeletingEquivalent) return;
    setDeleteEquivalentError(null);
    setShowDeleteEquivalentConfirm(null);
  };

  const handleConfirmDeleteEquivalent = async () => {
    if (isDeletingEquivalent) return;
    const targetToDelete = showDeleteEquivalentConfirm;
    if (!targetToDelete) return;

    setIsDeletingEquivalent(true);
    setDeleteEquivalentError(null);
    try {
      await removeEquivalent(targetToDelete.id);
      setShowDeleteEquivalentConfirm(null);
      showNotification({
        message: t('confirmDelete'),
        type: 'success'
      });
    } catch (deleteError) {
      console.error('Error deleting value equivalent:', deleteError);
      setDeleteEquivalentError(t('deleteEquivalentErrorBody'));
      setIsDeletingEquivalent(false);
    }
  };

  return (
    <>
      <PageContainer className="settings-page-content">
        <PageHeader title={t('settings')} />

        {notification && (
          <div
            role="status"
            className={`fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-xl border px-4 py-2 text-sm font-medium shadow-sm ${
              notification.type === 'success'
                ? 'border-[#B8D7D1] bg-white text-[var(--accent-strong)]'
                : 'border-[var(--border)] bg-white text-[var(--text-primary)]'
            }`}
          >
            {notification.message}
          </div>
        )}

        {isGuest && (
          <AccountSettingsSection
            isInteractionBlocked={Boolean(activeModal)}
            authError={authError}
            onSignIn={signIn}
          />
        )}

        <GeneralSettingsSection
          language={language}
          languageName={getLanguageName(language)}
          selectedCurrencyOption={selectedCurrencyOption}
          isLoading={Boolean(isLoadingLanguage || isLoadingCurrency)}
          loadError={generalLoadError ? t('errorLoadingSettings') : null}
          onRetry={handleRetryGeneralSettings}
          isInteractionBlocked={Boolean(activeModal)}
          onOpenLanguage={() => {
            setActiveModal('language');
            setShowLanguageDropdown(true);
          }}
          onOpenCurrency={() => {
            setActiveModal('currency');
            setShowCurrencyDropdown(true);
          }}
          errorMessage={preferenceError}
          onDismissError={() => setPreferenceError(null)}
        />

        <ValueEquivalentsSection
          valueEquivalents={valueEquivalents}
          isLoading={isLoadingEquivalents}
          error={equivalentsError}
          isInteractionBlocked={Boolean(activeModal)}
          onAdd={handleOpenAddEquivalent}
          onEdit={handleOpenEditEquivalent}
          onDelete={handleOpenDeleteConfirm}
          onRetry={refreshEquivalents}
        />

        {!isGuest && <DataManagementSection
          fileInputRef={fileInputRef}
          isInteractionBlocked={Boolean(activeModal)}
          onExport={handleExportData}
          onImport={handleImportData}
          onFileChange={handleFileChange}
          isExporting={isExporting}
          isImporting={replaceItemsMutation.isPending}
          dataTransferError={dataTransferError}
          onDismissDataTransferError={() => setDataTransferError(null)}
          isSigningOut={isSigningOut}
          signOutError={signOutError}
          authError={authError}
          onSignOut={handleSignOut}
          guestMigrationError={guestMigrationError}
          isMigratingGuestData={isMigratingGuestData}
          onRetryGuestMigration={retryGuestMigration}
        />}

        <LegalSettingsSection isInteractionBlocked={Boolean(activeModal)} />
      </PageContainer>

      <LanguageSelectionModal
        isOpen={showLanguageDropdown}
        languages={languages}
        selectedLanguage={language}
        onSelect={handleLanguageChange}
        onRequestClose={() => setShowLanguageDropdown(false)}
        onExitComplete={() => setActiveModal(null)}
      />

      <CurrencySelectionModal
        isOpen={showCurrencyDropdown}
        currencyOptions={currencyOptions}
        selectedCurrencyCode={currencyCode}
        onSelect={handleCurrencyChange}
        onRequestClose={() => setShowCurrencyDropdown(false)}
        onExitComplete={() => setActiveModal(null)}
      />

      {!isGuest && <ImportConfirmDialog
        isOpen={showImportConfirm}
        isImporting={replaceItemsMutation.isPending}
        onCancel={() => setShowImportConfirm(false)}
        onConfirm={confirmImport}
        onExitComplete={() => {
          setImportData(null);
          setActiveModal(null);
        }}
      />}

      <EquivalentFormModal
        isOpen={showEquivalentModal}
        equivalent={editingEquivalent}
        defaultCurrency={currencyCode}
        currencyOptions={currencyOptions}
        onCancel={() => setShowEquivalentModal(false)}
        onSave={handleSaveEquivalent}
        onExitComplete={() => setActiveModal(null)}
      />

      <DeleteEquivalentConfirmDialog
        target={showDeleteEquivalentConfirm}
        isOpen={Boolean(showDeleteEquivalentConfirm)}
        isGuest={isGuest}
        isDeleting={isDeletingEquivalent}
        errorMessage={deleteEquivalentError}
        onCancel={handleCloseDeleteConfirm}
        onConfirm={handleConfirmDeleteEquivalent}
        onExitComplete={() => {
          setIsDeletingEquivalent(false);
          setActiveModal(null);
        }}
      />
    </>
  );
}

export default Settings;
