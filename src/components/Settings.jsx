import React, { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getAllItems, replaceAllItems } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useValueEquivalents } from '../contexts/ValueEquivalentsContext';
import { useAuth } from '../contexts/AuthContext';
import { getSupportedCurrencies } from '../utils/currencyConfig';
import { useInvalidateItems } from '../hooks/useItems';
import { queryKeys, SERVER_STATE_STALE_TIME } from '../query/queryConfig';
import { PRODUCT_EXPORT_PREFIX, APP_VERSION } from '../constants/branding';
import GeneralSettingsSection from './settings/GeneralSettingsSection';
import ValueEquivalentsSection from './settings/ValueEquivalentsSection';
import DataManagementSection from './settings/DataManagementSection';
import AccountSettingsSection from './settings/AccountSettingsSection';
import LanguageSelectionModal from './settings/LanguageSelectionModal';
import CurrencySelectionModal from './settings/CurrencySelectionModal';
import ImportConfirmDialog from './settings/ImportConfirmDialog';
import EquivalentFormModal from './settings/EquivalentFormModal';
import DeleteEquivalentConfirmDialog from './settings/DeleteEquivalentConfirmDialog';

function Settings() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { language, changeLanguage, error: languageError } = useLanguage();
  const { currencyCode, changeCurrency, error: currencyError } = useCurrency();
  const { user, signOut, error: authError } = useAuth();
  const {
    valueEquivalents = [],
    isLoading: isLoadingEquivalents,
    addEquivalent,
    editEquivalent,
    removeEquivalent,
    error: equivalentsError
  } = useValueEquivalents();
  const invalidateItems = useInvalidateItems();

  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [importData, setImportData] = useState(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState(null);
  const [closingModal, setClosingModal] = useState(null);
  const [activeDeleteTarget, setActiveDeleteTarget] = useState(null);

  // Value Equivalents modal and form state
  const [showEquivalentModal, setShowEquivalentModal] = useState(false);
  const [editingEquivalent, setEditingEquivalent] = useState(null);
  const [equivalentFormName, setEquivalentFormName] = useState('');
  const [equivalentFormAmount, setEquivalentFormAmount] = useState('');
  const [equivalentFormCurrency, setEquivalentFormCurrency] = useState(currencyCode);
  const [equivalentFormError, setEquivalentFormError] = useState(null);
  const [showDeleteEquivalentConfirm, setShowDeleteEquivalentConfirm] = useState(null);
  const [isSavingEquivalent, setIsSavingEquivalent] = useState(false);
  const [isDeletingEquivalent, setIsDeletingEquivalent] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const fileInputRef = useRef(null);
  const closingTimeoutRef = useRef(null);

  const closeModalWithAnimation = (modalType, onClosed) => {
    if (closingModal) return;
    setClosingModal(modalType);
    if (closingTimeoutRef.current) {
      clearTimeout(closingTimeoutRef.current);
    }
    closingTimeoutRef.current = setTimeout(() => {
      onClosed();
      setClosingModal(null);
    }, 200);
  };

  useEffect(() => {
    return () => {
      if (closingTimeoutRef.current) {
        clearTimeout(closingTimeoutRef.current);
      }
    };
  }, []);

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

  useEffect(() => {
    const settingsError = languageError || currencyError;
    if (settingsError) {
      setNotification({
        message: settingsError.message || 'Failed to load shared settings from the server.',
        type: 'error'
      });
    }
  }, [languageError, currencyError]);

  const handleLanguageChange = async (code) => {
    closeModalWithAnimation('language', () => setShowLanguageDropdown(false));
    setNotification(null);
    try {
      await changeLanguage(code);
      setNotification(null);
    } catch (error) {
      console.error('Error updating language:', error);
      setNotification({
        message: error.message || 'Failed to update the language setting.',
        type: 'error'
      });
    }
  };

  const handleCurrencyChange = async (selectedCurrencyCode) => {
    closeModalWithAnimation('currency', () => setShowCurrencyDropdown(false));
    setNotification(null);
    try {
      await changeCurrency(selectedCurrencyCode);
      setNotification(null);
    } catch (error) {
      console.error('Error updating currency:', error);
      setNotification({
        message: error.message || 'Failed to update the currency setting.',
        type: 'error'
      });
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
        queryFn: getAllItems,
        staleTime: SERVER_STATE_STALE_TIME,
      });

      if (!items || items.length === 0) {
        setNotification({
          message: t('noDataForExport'),
          type: 'warning'
        });
        setTimeout(() => {
          setNotification(null);
        }, 3000);
        return;
      }

      const dataStr = JSON.stringify(items, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

      const exportFileDefaultName = `${PRODUCT_EXPORT_PREFIX}-${new Date().toISOString().split('T')[0]}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();

      setNotification({
        message: t('exportSuccess'),
        type: 'success'
      });
      setTimeout(() => {
        setNotification(null);
      }, 3000);
    } catch (error) {
      console.error('Error exporting data:', error);
      setNotification({
        message: t('exportError'),
        type: 'error'
      });
      setTimeout(() => {
        setNotification(null);
      }, 3000);
    }
  };

  const handleImportData = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setNotification({
        message: t('invalidFileFormat'),
        type: 'error'
      });
      setTimeout(() => setNotification(null), 3000);
      event.target.value = '';
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = JSON.parse(e.target.result);
          validateAndProcessImport(content);
        } catch (error) {
          console.error('Error parsing JSON:', error);
          setNotification({
            message: t('invalidJsonFormat'),
            type: 'error'
          });
          setTimeout(() => setNotification(null), 3000);
        }
      };
      reader.readAsText(file);
    } catch (error) {
      console.error('Error reading file:', error);
      setNotification({
        message: t('errorReadingFile'),
        type: 'error'
      });
      setTimeout(() => setNotification(null), 3000);
    }

    event.target.value = '';
  };

  const validateAndProcessImport = (data) => {
    if (!Array.isArray(data)) {
      setNotification({
        message: t('invalidDataFormat'),
        type: 'error'
      });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    for (const item of data) {
      if (!item.name || !Number.isFinite(Number(item.price)) || Number(item.price) <= 0 || !item.purchaseDate) {
        setNotification({
          message: t('invalidDataFormat'),
          type: 'error'
        });
        setTimeout(() => setNotification(null), 3000);
        return;
      }
    }

    setImportData(data);
    setShowImportConfirm(true);
  };

  const confirmImport = async () => {
    if (isImporting || closingModal === 'import') return;
    setIsImporting(true);
    try {
      const replacedItems = await replaceAllItems(importData);
      queryClient.setQueryData(queryKeys.items, replacedItems);
      await invalidateItems();

      setNotification({
        message: t('importSuccess'),
        type: 'success'
      });
      setTimeout(() => setNotification(null), 3000);
      closeModalWithAnimation('import', () => {
        setShowImportConfirm(false);
        setIsImporting(false);
      });
    } catch (error) {
      console.error('Error importing data:', error);
      setNotification({
        message: error.message || t('importError'),
        type: 'error'
      });
      setTimeout(() => setNotification(null), 3000);
      setIsImporting(false);
    }
  };

  const handleOpenAddEquivalent = () => {
    setEditingEquivalent(null);
    setEquivalentFormName('');
    setEquivalentFormAmount('');
    setEquivalentFormCurrency(currencyCode);
    setEquivalentFormError(null);
    setShowEquivalentModal(true);
  };

  const handleOpenEditEquivalent = (equivalentItem) => {
    setEditingEquivalent(equivalentItem);
    setEquivalentFormName(equivalentItem.name);
    setEquivalentFormAmount(String(equivalentItem.amount));
    setEquivalentFormCurrency(equivalentItem.currencyCode || currencyCode);
    setEquivalentFormError(null);
    setShowEquivalentModal(true);
  };

  const handleSaveEquivalent = async (event) => {
    event.preventDefault();
    if (isSavingEquivalent || closingModal === 'equivalent') return;
    setEquivalentFormError(null);

    const trimmedName = equivalentFormName.trim();
    if (!trimmedName) {
      setEquivalentFormError(t('enterItemName'));
      return;
    }

    const numericAmount = Number(equivalentFormAmount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setEquivalentFormError(t('enterPrice'));
      return;
    }

    setIsSavingEquivalent(true);
    try {
      if (editingEquivalent) {
        await editEquivalent(editingEquivalent.id, {
          name: trimmedName,
          amount: numericAmount,
          currencyCode: equivalentFormCurrency
        });
      } else {
        await addEquivalent({
          name: trimmedName,
          amount: numericAmount,
          currencyCode: equivalentFormCurrency
        });
      }
      closeModalWithAnimation('equivalent', () => {
        setShowEquivalentModal(false);
        setIsSavingEquivalent(false);
      });
      setNotification({
        message: t('save'),
        type: 'success'
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (saveError) {
      console.error('Error saving value equivalent:', saveError);
      setEquivalentFormError(saveError.message || 'Failed to save value equivalent.');
      setIsSavingEquivalent(false);
    }
  };

  const handleOpenDeleteConfirm = (equivalentItem) => {
    setActiveDeleteTarget(equivalentItem);
    setShowDeleteEquivalentConfirm(equivalentItem);
  };

  const handleCloseDeleteConfirm = () => {
    if (isDeletingEquivalent || closingModal === 'delete') return;
    closeModalWithAnimation('delete', () => {
      setShowDeleteEquivalentConfirm(null);
      setActiveDeleteTarget(null);
      setIsDeletingEquivalent(false);
    });
  };

  const handleConfirmDeleteEquivalent = async () => {
    if (isDeletingEquivalent || closingModal === 'delete') return;
    const targetToDelete = showDeleteEquivalentConfirm || activeDeleteTarget;
    if (!targetToDelete) return;

    setIsDeletingEquivalent(true);
    try {
      await removeEquivalent(targetToDelete.id);
      closeModalWithAnimation('delete', () => {
        setShowDeleteEquivalentConfirm(null);
        setActiveDeleteTarget(null);
        setIsDeletingEquivalent(false);
      });
      setNotification({
        message: t('confirmDelete'),
        type: 'success'
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (deleteError) {
      console.error('Error deleting value equivalent:', deleteError);
      setNotification({
        message: deleteError.message || 'Failed to delete value equivalent.',
        type: 'error'
      });
      setTimeout(() => setNotification(null), 3000);
      setIsDeletingEquivalent(false);
    }
  };

  return (
    <>
      <div className="px-4 space-y-4 page-content settings-page-content pb-24">
        {/* Header */}
        <div className="pt-6 pb-1 px-1">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {t('settings')}
          </h1>
        </div>

        {/* Notification */}
        {notification && (
          <div
            className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg
            ${notification.type === 'success' ? 'bg-green-600' : notification.type === 'warning' ? 'bg-yellow-600' : 'bg-red-600'} 
            text-white font-medium text-sm`}
          >
            {notification.message}
          </div>
        )}

        <GeneralSettingsSection
          language={language}
          languageName={getLanguageName(language)}
          selectedCurrencyOption={selectedCurrencyOption}
          isInteractionBlocked={Boolean(closingModal)}
          onOpenLanguage={() => setShowLanguageDropdown(true)}
          onOpenCurrency={() => setShowCurrencyDropdown(true)}
        />

        <ValueEquivalentsSection
          valueEquivalents={valueEquivalents}
          isLoading={isLoadingEquivalents}
          error={equivalentsError}
          isInteractionBlocked={Boolean(closingModal)}
          onAdd={handleOpenAddEquivalent}
          onEdit={handleOpenEditEquivalent}
          onDelete={handleOpenDeleteConfirm}
        />

        <DataManagementSection
          fileInputRef={fileInputRef}
          isInteractionBlocked={Boolean(closingModal)}
          onExport={handleExportData}
          onImport={handleImportData}
          onFileChange={handleFileChange}
        />

        <AccountSettingsSection
          user={user}
          isSigningOut={isSigningOut}
          isInteractionBlocked={Boolean(closingModal)}
          signOutError={signOutError}
          authError={authError}
          onSignOut={handleSignOut}
        />

        {/* Version Info */}
        <div className="text-center text-gray-400 text-xs py-2">
          <p>{t('versionText', { version: APP_VERSION })}</p>
        </div>
      </div>

      <LanguageSelectionModal
        isOpen={showLanguageDropdown}
        isClosing={closingModal === 'language'}
        languages={languages}
        selectedLanguage={language}
        onSelect={handleLanguageChange}
        onRequestClose={() =>
          closeModalWithAnimation('language', () => setShowLanguageDropdown(false))
        }
      />

      <CurrencySelectionModal
        isOpen={showCurrencyDropdown}
        isClosing={closingModal === 'currency'}
        currencyOptions={currencyOptions}
        selectedCurrencyCode={currencyCode}
        onSelect={handleCurrencyChange}
        onRequestClose={() =>
          closeModalWithAnimation('currency', () => setShowCurrencyDropdown(false))
        }
      />

      <ImportConfirmDialog
        isOpen={showImportConfirm}
        isClosing={closingModal === 'import'}
        isImporting={isImporting}
        onCancel={() =>
          closeModalWithAnimation('import', () => setShowImportConfirm(false))
        }
        onConfirm={confirmImport}
      />

      <EquivalentFormModal
        isOpen={showEquivalentModal}
        isClosing={closingModal === 'equivalent'}
        editingEquivalent={editingEquivalent}
        formName={equivalentFormName}
        formAmount={equivalentFormAmount}
        formCurrency={equivalentFormCurrency}
        formError={equivalentFormError}
        currencyOptions={currencyOptions}
        isSaving={isSavingEquivalent}
        onNameChange={setEquivalentFormName}
        onAmountChange={setEquivalentFormAmount}
        onCurrencyChange={setEquivalentFormCurrency}
        onCancel={() =>
          closeModalWithAnimation('equivalent', () => setShowEquivalentModal(false))
        }
        onSubmit={handleSaveEquivalent}
      />

      <DeleteEquivalentConfirmDialog
        target={showDeleteEquivalentConfirm || activeDeleteTarget}
        isOpen={Boolean(showDeleteEquivalentConfirm)}
        isClosing={closingModal === 'delete'}
        isDeleting={isDeletingEquivalent}
        onCancel={handleCloseDeleteConfirm}
        onConfirm={handleConfirmDeleteEquivalent}
      />
    </>
  );
}

export default Settings;
