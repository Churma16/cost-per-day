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
import { APP_VERSION } from '../constants/branding';
import {
  buildExportFilename,
  serializeItemsExport,
  validateImportedItems,
} from '../utils/settingsDataTransfer';
import GeneralSettingsSection from './settings/GeneralSettingsSection';
import ValueEquivalentsSection from './settings/ValueEquivalentsSection';
import DataManagementSection from './settings/DataManagementSection';
import AccountSettingsSection from './settings/AccountSettingsSection';
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
  const { language, changeLanguage, error: languageError } = useLanguage();
  const { currencyCode, changeCurrency, error: currencyError } = useCurrency();
  const {
    user,
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
    error: equivalentsError
  } = useValueEquivalents();
  const replaceItemsMutation = useReplaceItems();

  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [importData, setImportData] = useState(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const [showEquivalentModal, setShowEquivalentModal] = useState(false);
  const [editingEquivalent, setEditingEquivalent] = useState(null);
  const [showDeleteEquivalentConfirm, setShowDeleteEquivalentConfirm] = useState(null);
  const [isDeletingEquivalent, setIsDeletingEquivalent] = useState(false);

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

  useEffect(() => {
    const settingsError = languageError || currencyError;
    if (settingsError) {
      showNotification({
        message: settingsError.message || t('errorLoadingSettings'),
        type: 'error'
      }, { autoDismiss: false });
    }
  }, [languageError, currencyError, showNotification, t]);

  const handleLanguageChange = async (code) => {
    setShowLanguageDropdown(false);
    clearNotification();
    try {
      await changeLanguage(code);
      clearNotification();
    } catch (error) {
      console.error('Error updating language:', error);
      showNotification({
        message: error.message || t('errorUpdatingLanguage'),
        type: 'error'
      }, { autoDismiss: false });
    }
  };

  const handleCurrencyChange = async (selectedCurrencyCode) => {
    setShowCurrencyDropdown(false);
    clearNotification();
    try {
      await changeCurrency(selectedCurrencyCode);
      clearNotification();
    } catch (error) {
      console.error('Error updating currency:', error);
      showNotification({
        message: error.message || t('errorUpdatingCurrency'),
        type: 'error'
      }, { autoDismiss: false });
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
      setSignOutError(error.message || t('signOutError'));
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleExportData = async () => {
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
      showNotification({
        message: t('exportError'),
        type: 'error'
      });
    }
  };

  const handleImportData = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      showNotification({
        message: t('invalidFileFormat'),
        type: 'error'
      });
      event.target.value = '';
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        try {
          const content = JSON.parse(loadEvent.target.result);

          if (!validateImportedItems(content)) {
            showNotification({
              message: t('invalidDataFormat'),
              type: 'error'
            });
            return;
          }

          setImportData(content);
          setActiveModal('import');
          setShowImportConfirm(true);
        } catch (error) {
          console.error('Error parsing JSON:', error);
          showNotification({
            message: t('invalidJsonFormat'),
            type: 'error'
          });
        }
      };
      reader.onerror = () => {
        showNotification({
          message: t('errorReadingFile'),
          type: 'error'
        });
      };
      reader.readAsText(file);
    } catch (error) {
      console.error('Error reading file:', error);
      showNotification({
        message: t('errorReadingFile'),
        type: 'error'
      });
    }

    event.target.value = '';
  };

  const confirmImport = async () => {
    if (replaceItemsMutation.isPending || !importData) return;

    try {
      await replaceItemsMutation.mutateAsync(importData);
      showNotification({
        message: t('importSuccess'),
        type: 'success'
      });
      setShowImportConfirm(false);
    } catch (error) {
      console.error('Error importing data:', error);
      showNotification({
        message: error.message || t('importError'),
        type: 'error'
      });
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
    if (editingEquivalent) {
      await editEquivalent(editingEquivalent.id, equivalentData);
    } else {
      await addEquivalent(equivalentData);
    }

    setShowEquivalentModal(false);
    showNotification({
      message: t('save'),
      type: 'success'
    });
  };

  const handleOpenDeleteConfirm = (equivalentItem) => {
    setActiveModal('delete');
    setShowDeleteEquivalentConfirm(equivalentItem);
  };

  const handleCloseDeleteConfirm = () => {
    if (isDeletingEquivalent) return;
    setShowDeleteEquivalentConfirm(null);
  };

  const handleConfirmDeleteEquivalent = async () => {
    if (isDeletingEquivalent) return;
    const targetToDelete = showDeleteEquivalentConfirm;
    if (!targetToDelete) return;

    setIsDeletingEquivalent(true);
    try {
      await removeEquivalent(targetToDelete.id);
      setShowDeleteEquivalentConfirm(null);
      showNotification({
        message: t('confirmDelete'),
        type: 'success'
      });
    } catch (deleteError) {
      console.error('Error deleting value equivalent:', deleteError);
      showNotification({
        message: deleteError.message || t('errorDeletingEquivalent'),
        type: 'error'
      });
      setIsDeletingEquivalent(false);
    }
  };

  return (
    <>
      <PageContainer className="settings-page-content">
        <PageHeader title={t('settings')} />

        {notification && (
          <div
            className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg
            ${notification.type === 'success' ? 'bg-green-600' : notification.type === 'warning' ? 'bg-yellow-600' : 'bg-red-600'} 
            text-white font-medium text-sm`}
          >
            {notification.message}
          </div>
        )}

        {!isGuest && <GeneralSettingsSection
          language={language}
          languageName={getLanguageName(language)}
          selectedCurrencyOption={selectedCurrencyOption}
          isInteractionBlocked={Boolean(activeModal)}
          onOpenLanguage={() => {
            setActiveModal('language');
            setShowLanguageDropdown(true);
          }}
          onOpenCurrency={() => {
            setActiveModal('currency');
            setShowCurrencyDropdown(true);
          }}
        />}

        {!isGuest && <ValueEquivalentsSection
          valueEquivalents={valueEquivalents}
          isLoading={isLoadingEquivalents}
          error={equivalentsError}
          isInteractionBlocked={Boolean(activeModal)}
          onAdd={handleOpenAddEquivalent}
          onEdit={handleOpenEditEquivalent}
          onDelete={handleOpenDeleteConfirm}
        />}

        {!isGuest && <DataManagementSection
          fileInputRef={fileInputRef}
          isInteractionBlocked={Boolean(activeModal)}
          onExport={handleExportData}
          onImport={handleImportData}
          onFileChange={handleFileChange}
        />}

        <AccountSettingsSection
          user={user}
          isGuest={isGuest}
          isSigningOut={isSigningOut}
          isInteractionBlocked={Boolean(activeModal)}
          signOutError={signOutError}
          authError={authError}
          onSignOut={handleSignOut}
          onSignIn={signIn}
          guestMigrationError={guestMigrationError}
          isMigratingGuestData={isMigratingGuestData}
          onRetryGuestMigration={retryGuestMigration}
        />

        <div className="text-center text-gray-400 text-xs py-2">
          <p>{t('versionText', { version: APP_VERSION })}</p>
        </div>
      </PageContainer>

      {!isGuest && <LanguageSelectionModal
        isOpen={showLanguageDropdown}
        languages={languages}
        selectedLanguage={language}
        onSelect={handleLanguageChange}
        onRequestClose={() => setShowLanguageDropdown(false)}
        onExitComplete={() => setActiveModal(null)}
      />}

      {!isGuest && <CurrencySelectionModal
        isOpen={showCurrencyDropdown}
        currencyOptions={currencyOptions}
        selectedCurrencyCode={currencyCode}
        onSelect={handleCurrencyChange}
        onRequestClose={() => setShowCurrencyDropdown(false)}
        onExitComplete={() => setActiveModal(null)}
      />}

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

      {!isGuest && <EquivalentFormModal
        isOpen={showEquivalentModal}
        equivalent={editingEquivalent}
        defaultCurrency={currencyCode}
        currencyOptions={currencyOptions}
        onCancel={() => setShowEquivalentModal(false)}
        onSave={handleSaveEquivalent}
        onExitComplete={() => setActiveModal(null)}
      />}

      {!isGuest && <DeleteEquivalentConfirmDialog
        target={showDeleteEquivalentConfirm}
        isOpen={Boolean(showDeleteEquivalentConfirm)}
        isDeleting={isDeletingEquivalent}
        onCancel={handleCloseDeleteConfirm}
        onConfirm={handleConfirmDeleteEquivalent}
        onExitComplete={() => {
          setIsDeletingEquivalent(false);
          setActiveModal(null);
        }}
      />}
    </>
  );
}

export default Settings;
