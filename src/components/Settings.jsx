import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  IoChevronDown,
  IoCloudDownloadOutline,
  IoCloudUploadOutline,
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
import { getSupportedCurrencies } from '../utils/currencyConfig';
import { formatCurrency } from '../utils/formatters';

function Settings() {
  const { t } = useTranslation();
  const { language, changeLanguage, error: languageError } = useLanguage();
  const { currencyCode, changeCurrency, error: currencyError } = useCurrency();
  const {
    valueEquivalents = [],
    isLoading: isLoadingEquivalents,
    addEquivalent,
    editEquivalent,
    removeEquivalent,
    error: equivalentsError
  } = useValueEquivalents();
  
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [importData, setImportData] = useState(null);

  // Value Equivalents modal and form state
  const [showEquivalentModal, setShowEquivalentModal] = useState(false);
  const [editingEquivalent, setEditingEquivalent] = useState(null);
  const [equivalentFormName, setEquivalentFormName] = useState('');
  const [equivalentFormAmount, setEquivalentFormAmount] = useState('');
  const [equivalentFormCurrency, setEquivalentFormCurrency] = useState(currencyCode);
  const [equivalentFormError, setEquivalentFormError] = useState(null);
  const [showDeleteEquivalentConfirm, setShowDeleteEquivalentConfirm] = useState(null);
  const [isSavingEquivalent, setIsSavingEquivalent] = useState(false);
  
  const languageRef = useRef(null);
  const currencyRef = useRef(null);
  const fileInputRef = useRef(null);

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'Français' },
    { code: 'zh', name: '中文' },
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

  // 根据语言代码获取语言名称
  const getLanguageName = (code) => {
    const lang = languages.find(lang => lang.code === code);
    return lang ? lang.name : 'English';
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

  useEffect(() => {
    // Just check for loading state
    const checkLoading = async () => {
      setIsLoading(false);
    };
    checkLoading();
  }, []);

  // 处理点击外部关闭下拉菜单
  useEffect(() => {
    function handleClickOutside(event) {
      if (languageRef.current && !languageRef.current.contains(event.target)) {
        setShowLanguageDropdown(false);
      }
      if (currencyRef.current && !currencyRef.current.contains(event.target)) {
        setShowCurrencyDropdown(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 更新语言设置
  const handleLanguageChange = async (code) => {
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
    setShowLanguageDropdown(false);
  };

  // 更新货币设置
  const handleCurrencyChange = async (selectedCurrencyCode) => {
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
    setShowCurrencyDropdown(false);
  };

  // Export data function
  const handleExportData = async () => {
    try {
      // Get all items from the shared backend
      const items = await getAllItems();
      
      // Check if there's any data to export
      if (!items || items.length === 0) {
        setNotification({
          message: t('noDataForExport'),
          type: 'warning'
        });
        
        // Clear notification after 3 seconds
        setTimeout(() => {
          setNotification(null);
        }, 3000);
        return;
      }
      
      // Create a data URL for the JSON file
      const dataStr = JSON.stringify(items, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      // Create download link and trigger click
      const exportFileDefaultName = `cost-per-day-export-${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      // Show success notification
      setNotification({
        message: t('exportSuccess'),
        type: 'success'
      });
      
      // Clear notification after 3 seconds
      setTimeout(() => {
        setNotification(null);
      }, 3000);
    } catch (error) {
      console.error('Error exporting data:', error);
      
      // Show error notification
      setNotification({
        message: t('exportError'),
        type: 'error'
      });
      
      // Clear notification after 3 seconds
      setTimeout(() => {
        setNotification(null);
      }, 3000);
    }
  };

  // Import data function
  const handleImportData = () => {
    // Trigger file input click
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Handle file selection
  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    // Check file type
    if (!file.name.endsWith('.json')) {
      setNotification({
        message: t('invalidFileFormat'),
        type: 'error'
      });
      setTimeout(() => setNotification(null), 3000);
      event.target.value = ''; // Reset file input
      return;
    }
    
    try {
      // Read file content
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
    
    // Reset file input
    event.target.value = '';
  };
  
  // Validate import data
  const validateAndProcessImport = (data) => {
    // Check if data is an array
    if (!Array.isArray(data)) {
      setNotification({
        message: t('invalidDataFormat'),
        type: 'error'
      });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    
    // Check if each item has required fields
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
    
    // Data is valid, store it and show confirmation dialog
    setImportData(data);
    setShowImportConfirm(true);
  };
  
  // Perform the actual import
  const confirmImport = async () => {
    try {
      // Replace server-backed data through the centralized API boundary.
      await replaceAllItems(importData);
      
      // Show success notification
      setNotification({
        message: t('importSuccess'),
        type: 'success'
      });
      setTimeout(() => setNotification(null), 3000);
      
      // Close confirmation dialog
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-purple-600">{t('loading')}</div>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div className="text-center py-4">
          <h1 className="text-2xl font-bold text-white">
            {t('settings')}
          </h1>
        </div>
      </div>
      
      <div className="px-4 space-y-6 page-content settings-page-content mt-4">
        {/* Notification */}
        {notification && (
          <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg
            ${notification.type === 'success' ? 'bg-green-500' : 
              notification.type === 'warning' ? 'bg-yellow-500' : 'bg-red-500'} 
            text-white font-medium`}
          >
            {notification.message}
          </div>
        )}

        {/* Language Selector */}
        <div className="bg-white rounded-xl shadow-md">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-lg font-medium text-gray-800">{t('language')}</h2>
          </div>
          <div className="p-4" ref={languageRef}>
            <button
              className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 focus:outline-none"
              onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
            >
              <span>{getLanguageName(language)}</span>
              <IoChevronDown className={`transition-transform ${showLanguageDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showLanguageDropdown && (
              <div className="fixed inset-0 z-50 bg-black/20" onClick={() => setShowLanguageDropdown(false)}>
                <div 
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] max-w-sm bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="p-3 border-b border-gray-100 bg-purple-50">
                    <h3 className="text-center font-medium text-purple-800">{t('selectLanguage')}</h3>
                  </div>
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      className="w-full text-left p-4 hover:bg-purple-50 transition-colors border-b border-gray-100 last:border-0"
                      onClick={() => handleLanguageChange(lang.code)}
                    >
                      {lang.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Currency Selector */}
        <div className="bg-white rounded-xl shadow-md">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-lg font-medium text-gray-800">{t('currency')}</h2>
          </div>
          <div className="p-4" ref={currencyRef}>
            <button
              className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 focus:outline-none"
              onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
            >
              <span>{selectedCurrencyOption?.symbol} {selectedCurrencyOption?.name}</span>
              <IoChevronDown className={`transition-transform ${showCurrencyDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showCurrencyDropdown && (
              <div className="fixed inset-0 z-50 bg-black/20" onClick={() => setShowCurrencyDropdown(false)}>
                <div 
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] max-w-sm bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="p-3 border-b border-gray-100 bg-purple-50">
                    <h3 className="text-center font-medium text-purple-800">{t('selectCurrency')}</h3>
                  </div>
                  {currencyOptions.map((currencyOption) => (
                    <button
                      key={currencyOption.code}
                      className="w-full text-left p-4 hover:bg-purple-50 transition-colors border-b border-gray-100 last:border-0"
                      onClick={() => handleCurrencyChange(currencyOption.code)}
                    >
                      {currencyOption.symbol} {currencyOption.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Value Equivalents */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-gray-800">{t('valueEquivalents')}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{t('valueEquivalentsDescription')}</p>
            </div>
            <button
              type="button"
              className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 transition-colors"
              onClick={handleOpenAddEquivalent}
            >
              <IoAdd className="text-base" />
              <span>{t('addEquivalent')}</span>
            </button>
          </div>
          <div className="p-4">
            {isLoadingEquivalents ? (
              <div className="text-center py-6 text-gray-400 text-sm">
                <p>{t('loading')}</p>
              </div>
            ) : equivalentsError ? (
              <div role="alert" className="p-3 rounded-lg bg-red-50 text-red-700 text-xs font-medium">
                {equivalentsError.message || t('errorLoadingEquivalents')}
              </div>
            ) : valueEquivalents.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-sm">
                <p>{t('noEquivalents')}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {valueEquivalents.map((equivalentItem) => (
                  <div key={equivalentItem.id} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800 text-sm">{equivalentItem.name}</span>
                        <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700">
                          {equivalentItem.currencyCode}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatCurrency(Number(equivalentItem.amount || 0), equivalentItem.currencyCode)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label={`${t('editEquivalent')} ${equivalentItem.name}`}
                        className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        onClick={() => handleOpenEditEquivalent(equivalentItem)}
                      >
                        <IoPencilOutline className="text-base" />
                      </button>
                      <button
                        type="button"
                        aria-label={`${t('deleteEquivalent')} ${equivalentItem.name}`}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        onClick={() => setShowDeleteEquivalentConfirm(equivalentItem)}
                      >
                        <IoTrashOutline className="text-base" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Data Management */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-lg font-medium text-gray-800">{t('dataManagement')}</h2>
          </div>
          <div className="p-4 space-y-3">
            <button 
              className="w-full flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-blue-500 to-purple-600 
              text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 
              transition-all duration-200 shadow-md hover:shadow-lg"
              onClick={handleExportData}
            >
              <IoCloudDownloadOutline className="text-xl" />
              {t('exportData')}
            </button>
            
            <button 
              className="w-full flex items-center justify-center gap-2 p-3 bg-white border border-purple-200
              text-purple-600 rounded-lg font-medium hover:bg-purple-50
              transition-all duration-200 shadow-sm hover:shadow"
              onClick={handleImportData}
            >
              <IoCloudUploadOutline className="text-xl" />
              {t('importData')}
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

        {/* Version Info */}
        <div className="text-center text-gray-500 text-sm mt-8">
          <p>{t('version')} 0.1.0</p>
        </div>
      </div>
      
      {/* Import Confirmation Dialog */}
      {showImportConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-16 p-4 z-50">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-amber-500">
              <IoWarningOutline className="text-2xl" />
              <h2 className="text-xl font-semibold text-gray-800">{t('importWarning')}</h2>
            </div>
            <p className="text-gray-600">{t('importConfirmation')}</p>
            <div className="flex gap-3 pt-2">
              <button 
                className="flex-1 py-3 px-4 rounded-xl bg-gray-100 text-gray-700 font-medium
                hover:bg-gray-200 transition-colors duration-200"
                onClick={() => setShowImportConfirm(false)}
              >
                {t('cancel')}
              </button>
              <button 
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 
                text-white font-medium hover:from-amber-600 hover:to-amber-700 transition-all duration-200"
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
              <h2 className="text-xl font-semibold text-gray-800">
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
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs font-medium">
                {equivalentFormError}
              </div>
            )}

            <form onSubmit={handleSaveEquivalent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  {t('equivalentName')}
                </label>
                <input
                  type="text"
                  required
                  value={equivalentFormName}
                  onChange={(event) => setEquivalentFormName(event.target.value)}
                  placeholder={t('enterEquivalentName')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
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
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  {t('currency')}
                </label>
                <select
                  value={equivalentFormCurrency}
                  onChange={(event) => setEquivalentFormCurrency(event.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
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
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 text-white font-medium hover:from-purple-600 hover:to-purple-700 transition-all text-sm disabled:opacity-50"
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
            <p className="text-gray-600 text-sm">
              {t('confirmDeleteEquivalent')}
            </p>
            <p className="font-semibold text-gray-800 text-sm bg-gray-50 p-2.5 rounded-lg border border-gray-100">
              {showDeleteEquivalentConfirm.name} ({formatCurrency(Number(showDeleteEquivalentConfirm.amount || 0), showDeleteEquivalentConfirm.currencyCode)})
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