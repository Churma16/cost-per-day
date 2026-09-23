import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { IoTrashOutline, IoCalendarOutline } from "react-icons/io5";
import { addItem, updateItem, getAllItems, deleteItem } from '../services/api';
import { formatDate, getDateLocale } from '../utils/formatters';
import { useLanguage } from '../contexts/LanguageContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useInvalidateDashboard } from '../hooks/useDashboard';
import { parseISO } from 'date-fns';

// Helper function to set time to noon UTC
const setToNoonUTC = (date) => {
  const newDate = new Date(date);
  newDate.setUTCHours(12, 0, 0, 0);
  return newDate;
};

function AddItem() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(() => {
    return setToNoonUTC(new Date());
  });
  const [status, setStatus] = useState('active');
  const [endedAt, setEndedAt] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editIndex, setEditIndex] = useState(-1);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [itemLoaded, setItemLoaded] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [month, setMonth] = useState(purchaseDate);
  const { currencySymbol } = useCurrency();
  const invalidateDashboard = useInvalidateDashboard();
  
  // Get date-fns locale matching the current application language
  const getLocale = () => getDateLocale(language);

  // Reset form when pathname changes
  useEffect(() => {
    const resetForm = () => {
      setName('');
      setPrice('');
      setPurchaseDate(setToNoonUTC(new Date()));
      setStatus('active');
      setEndedAt('');
      setSalePrice('');
      setIsEditMode(false);
      setEditIndex(-1);
      setShowDeleteConfirm(false);
      setErrorMessage(null);
      setLoadFailed(false);
      setItemLoaded(false);
    };

    if (location.pathname === '/add') {
      resetForm();
    }
  }, [location.pathname]);

  // Load server-backed item data for edit mode
  useEffect(() => {
    const loadItem = async () => {
      const searchParams = new URLSearchParams(location.search);
      const editId = searchParams.get('id');
      const isEdit = location.pathname === '/edit';

      if (!isEdit) {
        return;
      }

      if (!editId) {
        console.error('Edit mode requires an ID parameter');
        navigate('/');
        return;
      }

      setIsEditMode(true);
      setEditIndex(editId);
      setErrorMessage(null);
      setLoadFailed(false);
      setItemLoaded(false);

      try {
        const items = await getAllItems();
        const item = items.find((candidateItem) => String(candidateItem.id) === String(editId));

        if (!item) {
          console.error('Invalid item ID:', editId);
          navigate('/');
          return;
        }

        setEditIndex(item.id);
        setName(item.name);
        setPrice(item.price.toString());
        setPurchaseDate(setToNoonUTC(parseISO(item.purchaseDate)));
        setStatus(item.status || 'active');
        setEndedAt(item.endedAt ? item.endedAt.slice(0, 10) : '');
        setSalePrice(item.salePrice === null || item.salePrice === undefined ? '' : String(item.salePrice));
        setItemLoaded(true);
      } catch (error) {
        console.error('Error loading item:', error);
        setLoadFailed(true);
        setItemLoaded(false);
        setErrorMessage(error.message || 'Failed to load the item from the server.');
      }
    };

    loadItem();
  }, [location.pathname, location.search, navigate]);

  // Add click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDatePicker && !event.target.closest('.date-picker-container')) {
        setShowDatePicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDatePicker]);

  const purchaseDateValue = purchaseDate instanceof Date && !Number.isNaN(purchaseDate.getTime())
    ? purchaseDate.toISOString().split('T')[0]
    : '';
  const currentDateValue = new Date().toISOString().split('T')[0];
  const lifecycleFormValid = !isEditMode ||
    status === 'active' ||
    (
      endedAt !== '' &&
      endedAt >= purchaseDateValue &&
      endedAt <= currentDateValue &&
      (
        status !== 'sold' ||
        (salePrice !== '' && Number.isFinite(Number(salePrice)) && Number(salePrice) >= 0)
      )
    );
  const isFormValid = name.trim() !== '' &&
                     Number(price) > 0 &&
                     purchaseDateValue !== '' &&
                     lifecycleFormValid;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const itemData = {
      name: name.trim(),
      price: Number(price),
      purchaseDate: setToNoonUTC(purchaseDate).toISOString(),
    };

    if (isEditMode) {
      itemData.status = status;
      itemData.endedAt = status === 'active'
        ? null
        : new Date(`${endedAt}T12:00:00.000Z`).toISOString();
      itemData.salePrice = status === 'sold' ? Number(salePrice) : null;
    }

    setErrorMessage(null);

    try {
      if (isEditMode) {
        await updateItem(editIndex, itemData);
      } else {
        await addItem(itemData);
      }
      await invalidateDashboard();
      navigate('/');
    } catch (error) {
      console.error('Error saving item:', error);
      setErrorMessage(error.message || 'Failed to save the item. Please try again.');
    }
  };

  const handleDelete = async () => {
    if (!itemLoaded) {
      return;
    }

    setErrorMessage(null);

    try {
      await deleteItem(editIndex);
      await invalidateDashboard();
      navigate('/');
    } catch (error) {
      console.error('Error deleting item:', error);
      setShowDeleteConfirm(false);
      setErrorMessage(error.message || 'Failed to delete the item. Please try again.');
    }
  };

  return (
    <>
      {/* Header */}
      <div className="page-header">
        <div className="text-center py-4">
          <h1 className="text-2xl font-bold text-white">
            {isEditMode ? t('editItem') : t('addNewItem')}
          </h1>
        </div>
      </div>

      {/* Form - main content */}
      <div className="px-4 py-6 space-y-6 page-content form-page-content">
        {errorMessage && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm text-gray-600 font-medium">{t('itemName')}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder={t('enterItemName')}
                className="w-full px-4 py-3 rounded-xl border border-purple-100 focus:border-purple-300 
                focus:ring-2 focus:ring-purple-500/20 outline-none transition-all duration-200"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm text-gray-600 font-medium">{t('price')}</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">{currencySymbol}</div>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                  min="0.01"
                  step="0.01"
                  placeholder={t('enterPrice')}
                  className={`w-full px-4 py-3 ${currencySymbol.length > 1 ? 'pl-11' : 'pl-8'} rounded-xl border border-purple-100 focus:border-purple-300 
                  focus:ring-2 focus:ring-purple-500/20 outline-none transition-all duration-200`}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm text-gray-600 font-medium">{t('date')}</label>
              
              {/* Combination of native date picker for mobile and custom date picker for desktop */}
              <div className="relative">
                {/* Display current selected date - clicking performs different actions based on device type */}
                <button 
                  type="button"
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-purple-100 
                  focus:border-purple-300 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all duration-200
                  text-left"
                  onClick={() => {
                    // Check if device is mobile
                    const isMobile = window.innerWidth <= 768;
                    if (isMobile) {
                      // Trigger native date picker on mobile
                      const nativeDatePicker = document.getElementById('native-date-picker');
                      if (nativeDatePicker) {
                        if (typeof nativeDatePicker.showPicker === 'function') {
                          nativeDatePicker.showPicker();
                        } else {
                          nativeDatePicker.click();
                        }
                      }
                    } else {
                      // Show custom date picker on desktop
                      setShowDatePicker(!showDatePicker);
                    }
                  }}
                >
                  {formatDate(purchaseDate, language)}
                  <div className="text-purple-500">
                    <IoCalendarOutline className="text-lg" />
                  </div>
                </button>
                
                {/* Hidden native date picker - used on mobile only */}
                <input
                  id="native-date-picker"
                  type="date"
                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer md:hidden"
                  value={purchaseDate.toISOString().split('T')[0]}
                  onChange={(e) => {
                    if (e.target.value) {
                      setPurchaseDate(setToNoonUTC(new Date(e.target.value)));
                    }
                  }}
                  max={new Date().toISOString().split('T')[0]}
                />
                
                {/* Custom date picker - used on desktop */}
                {showDatePicker && (
                  <div className="relative z-30 date-picker-container">
                    <div 
                      className="fixed inset-0 bg-black/20 z-30" 
                      onClick={() => setShowDatePicker(false)}
                    ></div>
                    <div className="absolute z-40 mt-2 bg-white rounded-xl shadow-xl overflow-hidden border border-purple-100 w-full max-w-[320px] left-1/2 -translate-x-1/2">
                      {/* Year and month quick selectors */}
                      <div className="flex justify-between items-center bg-gray-50 p-2 border-b">
                        {/* Year selection */}
                        <select
                          value={month.getFullYear()}
                          onChange={(e) => {
                            const year = parseInt(e.target.value);
                            const newDate = new Date(month);
                            newDate.setFullYear(year);
                            setMonth(newDate);
                          }}
                          className="px-2 py-1 border border-gray-300 rounded-md"
                        >
                          {Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i).map(year => (
                            <option key={year} value={year}>{year}</option>
                          ))}
                        </select>
                        
                        {/* Month selection */}
                        <select
                          value={month.getMonth()}
                          onChange={(e) => {
                            const monthIndex = parseInt(e.target.value);
                            const newDate = new Date(month);
                            newDate.setMonth(monthIndex);
                            setMonth(newDate);
                          }}
                          className="px-2 py-1 border border-gray-300 rounded-md"
                        >
                          {Array.from({ length: 12 }, (_, i) => i).map(monthIndex => {
                            const monthName = new Intl.DateTimeFormat(getLocale().code, { month: 'long' }).format(new Date(2000, monthIndex));
                            return (
                              <option key={monthIndex} value={monthIndex}>{monthName}</option>
                            );
                          })}
                        </select>
                      </div>
                      
                      <DayPicker
                        mode="single"
                        selected={purchaseDate}
                        onSelect={(date) => {
                          if (date) {
                            setPurchaseDate(setToNoonUTC(date));
                            setShowDatePicker(false);
                          }
                        }}
                        month={month}
                        onMonthChange={setMonth}
                        locale={getLocale()}
                        toDate={new Date()}
                        modifiersClassNames={{
                          selected: 'bg-purple-600 text-white',
                          today: 'text-red-500 font-bold'
                        }}
                        className="p-2"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {isEditMode && itemLoaded && (
              <div className="space-y-4 rounded-xl border border-purple-100 bg-purple-50/40 p-4">
                <div className="space-y-2">
                  <label htmlFor="item-status" className="text-sm text-gray-600 font-medium">
                    {t('itemStatus')}
                  </label>
                  <select
                    id="item-status"
                    value={status}
                    onChange={(event) => {
                      const nextStatus = event.target.value;
                      setStatus(nextStatus);
                      if (nextStatus === 'active') {
                        setEndedAt('');
                        setSalePrice('');
                      } else if (nextStatus !== 'sold') {
                        setSalePrice('');
                      }
                    }}
                    className="w-full px-4 py-3 rounded-xl border border-purple-100 bg-white focus:border-purple-300
                    focus:ring-2 focus:ring-purple-500/20 outline-none transition-all duration-200"
                  >
                    <option value="active">{t('statusActive')}</option>
                    <option value="retired">{t('statusRetired')}</option>
                    <option value="sold">{t('statusSold')}</option>
                    <option value="lost">{t('statusLost')}</option>
                  </select>
                </div>

                {status !== 'active' && (
                  <div className="space-y-2">
                    <label htmlFor="ownership-end-date" className="text-sm text-gray-600 font-medium">
                      {t('ownershipEndDate')}
                    </label>
                    <input
                      id="ownership-end-date"
                      type="date"
                      value={endedAt}
                      min={purchaseDateValue}
                      max={currentDateValue}
                      onChange={(event) => setEndedAt(event.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-purple-100 bg-white focus:border-purple-300
                      focus:ring-2 focus:ring-purple-500/20 outline-none transition-all duration-200"
                    />
                  </div>
                )}

                {status === 'sold' && (
                  <div className="space-y-2">
                    <label htmlFor="sale-price" className="text-sm text-gray-600 font-medium">
                      {t('salePrice')}
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">{currencySymbol}</div>
                      <input
                        id="sale-price"
                        type="number"
                        value={salePrice}
                        onChange={(event) => setSalePrice(event.target.value)}
                        required
                        min="0"
                        step="0.01"
                        placeholder={t('enterSalePrice')}
                        className={`w-full px-4 py-3 ${currencySymbol.length > 1 ? 'pl-11' : 'pl-8'} rounded-xl border border-purple-100 bg-white focus:border-purple-300
                        focus:ring-2 focus:ring-purple-500/20 outline-none transition-all duration-200`}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4 pt-4">
              <button 
                type="submit" 
                className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium
                hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg
                disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed"
                disabled={!isFormValid || loadFailed || (isEditMode && !itemLoaded)}
              >
                {t('save')}
              </button>

              {isEditMode && itemLoaded && (
                <button 
                  type="button"
                  className="w-full py-3.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-medium
                  hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-md hover:shadow-lg
                  flex items-center justify-center gap-2"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <IoTrashOutline className="text-xl" />
                  {t('deleteItem')}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-16 p-4 z-50">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 space-y-4 shadow-xl">
            <h2 className="text-xl font-semibold text-gray-800">{t('confirmDelete')}</h2>
            <p className="text-gray-600">{t('deleteConfirmation')}</p>
            <div className="flex gap-3 pt-2">
              <button 
                className="flex-1 py-3 px-4 rounded-xl bg-gray-100 text-gray-700 font-medium
                hover:bg-gray-200 transition-colors duration-200"
                onClick={() => setShowDeleteConfirm(false)}
              >
                {t('cancel')}
              </button>
              <button 
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-red-500 to-red-600 
                text-white font-medium hover:from-red-600 hover:to-red-700 transition-all duration-200"
                onClick={handleDelete}
              >
                {t('confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AddItem;