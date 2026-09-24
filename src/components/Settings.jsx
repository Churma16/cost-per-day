import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  IoChevronForward,
  IoLanguageOutline,
  IoCashOutline,
  IoRestaurantOutline,
  IoCloudDownloadOutline,
  IoCloudUploadOutline,
  IoLogOutOutline,
  IoWarningOutline,
  IoAdd,
  IoTrashOutline,
  IoPencilOutline,
  IoClose
} from 'react-icons/io5';
import { getAllItems, replaceAllItems } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useValueEquivalents } from '../contexts/ValueEquivalentsContext';
import { useAuth } from '../contexts/AuthContext';
import { getSupportedCurrencies } from '../utils/currencyConfig';
import { formatCurrency } from '../utils/formatters';
import { useInvalidateDashboard } from '../hooks/useDashboard';
import { PRODUCT_EXPORT_PREFIX } from '../constants/branding';

function Settings() {
  const { t } = useTranslation();
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
  const invalidateDashboard = useInvalidateDashboard();

  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [importData, setImportData] = useState(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState(null);

  // Value Equivalents modal and form state
  const [showEquivalentModal, setShowEquivalentModal] = useState(false);
  const [editingEquivalent, setEditingEquivalent] = useState(null);
  const [equivalentFormName, setEquivalentFormName] = useState('');
  const [equivalentFormAmount, setEquivalentFormAmount] = useState('');
  const [equivalentFormCurrency, setEquivalentFormCurrency] = useState(currencyCode);
  const [equivalentFormError, setEquivalentFormError] = useState(null);
  const [showDeleteEquivalentConfirm, setShowDeleteEquivalentConfirm] = useState(null);
  const [isSavingEquivalent, setIsSavingEquivalent] = useState(false);

  const fileInputRef = useRef(null);

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
    setNotification(null);
    try {
      await changeLanguage(code);
      await invalidateDashboard();
      setNotification(null);
    } catch (error) {
      console.error('Error updating language:', error);
      setNotification({
        message: error.message || 'Failed to update the language setting.',
        type: 'error'
      });
    }
    setShowLanguageDropdown(false);
  };

  const handleCurrencyChange = async (selectedCurrencyCode) => {
    setNotification(null);
    try {
      await changeCurrency(selectedCurrencyCode);
      await invalidateDashboard();
      setNotification(null);
    } catch (error) {
      console.error('Error updating currency:', error);
      setNotification({
        message: error.message || 'Failed to update the currency setting.',
        type: 'error'
      });
    }
    setShowCurrencyDropdown(false);
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
      const items = await getAllItems();

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
    try {
      await replaceAllItems(importData);
      await invalidateDashboard();

      setNotification({
        message: t('importSuccess'),
        type: 'success'
      });
      setTimeout(() => setNotification(null), 3000);
      setShowImportConfirm(false);
    } catch (error) {
      console.error('Error importing data:', error);
      setNotification({
        message: error.message || t('importError'),
        type: 'error'
      });
      setTimeout(() => setNotification(null), 3000);
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
      await invalidateDashboard();

      setShowEquivalentModal(false);
      setNotification({
        message: t('save'),
        type: 'success'
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (saveError) {
      console.error('Error saving value equivalent:', saveError);
      setEquivalentFormError(saveError.message || 'Failed to save value equivalent.');
    } finally {
      setIsSavingEquivalent(false);
    }
  };

  const handleConfirmDeleteEquivalent = async () => {
    if (!showDeleteEquivalentConfirm) return;

    try {
      await removeEquivalent(showDeleteEquivalentConfirm.id);
      await invalidateDashboard();
      setShowDeleteEquivalentConfirm(null);
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

        {/* Section 1: Umum (General) */}
        <div>
          <h2 className="text-xs font-medium text-gray-500 mb-1.5 px-1">
            {t('general')}
          </h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Language Selector Row */}
            <button
              type="button"
              className="w-full flex items-center justify-between py-2.5 px-3.5 hover:bg-slate-50/70 transition-colors text-left"
              onClick={() => setShowLanguageDropdown(true)}
              aria-label={`${t('language')}: ${getLanguageName(language)}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-slate-100/80 flex items-center justify-center text-slate-600 flex-shrink-0">
                  <IoLanguageOutline className="text-base" />
                </div>
                <span className="text-sm font-medium text-gray-800">{t('language')}</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                <span>{getLanguageName(language)}</span>
                <IoChevronForward className="text-gray-400 text-sm" />
              </div>
            </button>

            <div className="border-b border-gray-100 mx-3.5" />

            {/* Currency Selector Row */}
            <button
              type="button"
              className="w-full flex items-center justify-between py-2.5 px-3.5 hover:bg-slate-50/70 transition-colors text-left"
              onClick={() => setShowCurrencyDropdown(true)}
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

        {/* Section 2: Perbandingan Nilai (Value Equivalents) */}
        <div>
          <div className="flex items-center justify-between mb-0.5 px-1">
            <h2 className="text-xs font-medium text-gray-500">
              {t('valueEquivalents')}
            </h2>
            <button
              type="button"
              className="text-xs font-semibold text-[#2F7473] hover:text-[#265e5d] flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded-md hover:bg-teal-50/60"
              onClick={handleOpenAddEquivalent}
              aria-label={t('addEquivalent')}
            >
              <IoAdd className="text-sm" />
              <span>{t('add')}</span>
            </button>
          </div>
          <p className="text-xs text-gray-400 mb-1.5 px-1">
            {t('valueEquivalentsSubtitle')}
          </p>

          {isLoadingEquivalents ? (
            <div className="text-center py-6 text-gray-400 text-sm">
              <p>{t('loading')}</p>
            </div>
          ) : equivalentsError ? (
            <div role="alert" className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-medium border border-red-100">
              {equivalentsError.message || t('errorLoadingEquivalents')}
            </div>
          ) : valueEquivalents.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center shadow-sm">
              <p className="text-sm text-gray-400">{t('noEquivalents')}</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {valueEquivalents.map((equivalentItem, index) => (
                <React.Fragment key={equivalentItem.id}>
                  {index > 0 && <div className="border-b border-gray-100 mx-3.5" />}
                  <div className="py-2.5 px-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center flex-shrink-0 border border-amber-100/60">
                        <IoRestaurantOutline className="text-base" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-gray-900 truncate leading-tight">{equivalentItem.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-tight">
                          {formatCurrency(Number(equivalentItem.amount || 0), equivalentItem.currencyCode)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <button
                        type="button"
                        aria-label={`${t('editEquivalent')} ${equivalentItem.name}`}
                        className="p-1.5 text-gray-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                        onClick={() => handleOpenEditEquivalent(equivalentItem)}
                      >
                        <IoPencilOutline className="text-base" />
                      </button>
                      <button
                        type="button"
                        aria-label={`${t('deleteEquivalent')} ${equivalentItem.name}`}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        onClick={() => setShowDeleteEquivalentConfirm(equivalentItem)}
                      >
                        <IoTrashOutline className="text-base" />
                      </button>
                    </div>
                  </div>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {/* Section 3: Data */}
        <div>
          <h2 className="text-xs font-medium text-gray-500 mb-1.5 px-1">
            {t('data')}
          </h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Export Row */}
            <button
              type="button"
              className="w-full flex items-center justify-between py-2.5 px-3.5 hover:bg-slate-50/70 transition-colors text-left"
              onClick={handleExportData}
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-slate-100/80 flex items-center justify-center text-slate-600 flex-shrink-0">
                  <IoCloudDownloadOutline className="text-base" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-900 leading-tight">{t('exportData')}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-tight">{t('exportDataSubtitle')}</p>
                </div>
              </div>
              <IoChevronForward className="text-gray-400 text-sm flex-shrink-0" />
            </button>

            <div className="border-b border-gray-100 mx-3.5" />

            {/* Import Row */}
            <button
              type="button"
              className="w-full flex items-center justify-between py-2.5 px-3.5 hover:bg-slate-50/70 transition-colors text-left"
              onClick={handleImportData}
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-slate-100/80 flex items-center justify-center text-slate-600 flex-shrink-0">
                  <IoCloudUploadOutline className="text-base" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-900 leading-tight">{t('importData')}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-tight">{t('importDataSubtitle')}</p>
                </div>
              </div>
              <IoChevronForward className="text-gray-400 text-sm flex-shrink-0" />
            </button>

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".json"
              onChange={handleFileChange}
            />
          </div>
        </div>

        {/* Section 4: Akun / Keluar Akun */}
        <div>
          <button
            type="button"
            className="w-full flex items-center justify-center gap-2 py-3 px-3.5 bg-white border border-red-200/90 rounded-2xl text-red-600 hover:bg-red-50/60 active:bg-red-100/60 transition-colors font-medium text-sm shadow-sm disabled:opacity-50"
            onClick={handleSignOut}
            disabled={isSigningOut}
            aria-label={t('signOut')}
            title={user?.displayName || user?.email || t('signOut')}
          >
            <IoLogOutOutline className="text-lg" />
            <span>{isSigningOut ? t('loading') : t('signOut')}</span>
          </button>
          {(signOutError || authError) && (
            <p role="alert" className="mt-2 text-center text-xs text-red-600">
              {signOutError || authError?.message || t('signOutError')}
            </p>
          )}
        </div>

        {/* Version Info */}
        <div className="text-center text-gray-400 text-xs py-2">
          <p>{t('versionText', { version: '0.1.0' })}</p>
        </div>
      </div>

      {/* Language Selection Modal */}
      {showLanguageDropdown && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowLanguageDropdown(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="p-3.5 border-b border-gray-100 bg-slate-50">
              <h3 className="text-center font-semibold text-sm text-slate-800">
                {t('selectLanguage')}
              </h3>
            </div>
            {languages.map((lang) => (
              <button
                key={lang.code}
                className={`w-full text-left p-4 hover:bg-slate-50 transition-colors border-b border-gray-100 last:border-0 font-medium text-sm flex items-center justify-between ${
                  lang.code === language ? 'text-[#2F7473] font-semibold' : 'text-gray-700'
                }`}
                onClick={() => handleLanguageChange(lang.code)}
              >
                <span>{lang.name}</span>
                {lang.code === language && <span className="w-2 h-2 rounded-full bg-[#2F7473]" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Currency Selection Modal */}
      {showCurrencyDropdown && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowCurrencyDropdown(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="p-3.5 border-b border-gray-100 bg-slate-50">
              <h3 className="text-center font-semibold text-sm text-slate-800">
                {t('selectCurrency')}
              </h3>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {currencyOptions.map((currencyOption) => (
                <button
                  key={currencyOption.code}
                  className={`w-full text-left p-4 hover:bg-slate-50 transition-colors border-b border-gray-100 last:border-0 font-medium text-sm flex items-center justify-between ${
                    currencyOption.code === currencyCode ? 'text-[#2F7473] font-semibold' : 'text-gray-700'
                  }`}
                  onClick={() => handleCurrencyChange(currencyOption.code)}
                >
                  <span>
                    {currencyOption.symbol} {currencyOption.name}
                  </span>
                  {currencyOption.code === currencyCode && (
                    <span className="w-2 h-2 rounded-full bg-[#2F7473]" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Import Confirmation Dialog */}
      {showImportConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-16 p-4 z-50">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-amber-500">
              <IoWarningOutline className="text-2xl" />
              <h2 className="text-xl font-semibold text-gray-800">{t('importWarning')}</h2>
            </div>
            <p className="text-gray-600 text-sm">{t('importConfirmation')}</p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                className="flex-1 py-3 px-4 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors duration-200 text-sm"
                onClick={() => setShowImportConfirm(false)}
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                className="flex-1 py-3 px-4 rounded-xl bg-amber-600 text-white font-medium hover:bg-amber-700 transition-all duration-200 text-sm shadow-sm"
                onClick={confirmImport}
              >
                {t('confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Equivalent Modal */}
      {showEquivalentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-16 p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-lg font-semibold text-gray-800">
                {editingEquivalent ? t('editEquivalent') : t('addEquivalent')}
              </h2>
              <button
                type="button"
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                onClick={() => setShowEquivalentModal(false)}
              >
                <IoClose className="text-xl" />
              </button>
            </div>

            {equivalentFormError && (
              <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-medium border border-red-100">
                {equivalentFormError}
              </div>
            )}

            <form onSubmit={handleSaveEquivalent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                  {t('equivalentName')}
                </label>
                <input
                  type="text"
                  required
                  value={equivalentFormName}
                  onChange={(event) => setEquivalentFormName(event.target.value)}
                  placeholder={t('enterEquivalentName')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2F7473]/30 focus:border-[#2F7473]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                  {t('equivalentAmount')}
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.000001"
                  required
                  value={equivalentFormAmount}
                  onChange={(event) => setEquivalentFormAmount(event.target.value)}
                  placeholder={t('enterEquivalentAmount')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2F7473]/30 focus:border-[#2F7473]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                  {t('currency')}
                </label>
                <select
                  value={equivalentFormCurrency}
                  onChange={(event) => setEquivalentFormCurrency(event.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2F7473]/30 focus:border-[#2F7473] bg-white"
                >
                  {currencyOptions.map((currencyOption) => (
                    <option key={currencyOption.code} value={currencyOption.code}>
                      {currencyOption.code} ({currencyOption.symbol}) - {currencyOption.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  disabled={isSavingEquivalent}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors text-sm"
                  onClick={() => setShowEquivalentModal(false)}
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSavingEquivalent}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#2F7473] hover:bg-[#265e5d] text-white font-medium transition-all text-sm disabled:opacity-50 shadow-sm"
                >
                  {isSavingEquivalent ? t('loading') : t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Equivalent Confirmation Dialog */}
      {showDeleteEquivalentConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-16 p-4 z-50">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-red-500">
              <IoWarningOutline className="text-2xl" />
              <h2 className="text-xl font-semibold text-gray-800">{t('deleteEquivalent')}</h2>
            </div>
            <p className="text-gray-600 text-sm">{t('confirmDeleteEquivalent')}</p>
            <p className="font-semibold text-gray-800 text-sm bg-gray-50 p-2.5 rounded-lg border border-gray-100">
              {showDeleteEquivalentConfirm.name} (
              {formatCurrency(
                Number(showDeleteEquivalentConfirm.amount || 0),
                showDeleteEquivalentConfirm.currencyCode
              )}
              )
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                className="flex-1 py-3 px-4 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors duration-200 text-sm"
                onClick={() => setShowDeleteEquivalentConfirm(null)}
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                className="flex-1 py-3 px-4 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-all duration-200 text-sm"
                onClick={handleConfirmDeleteEquivalent}
              >
                {t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Settings;