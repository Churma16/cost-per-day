import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IoTrashOutline, IoArrowBack } from 'react-icons/io5';
import 'react-day-picker/dist/style.css';
import { addItem, updateItem, deleteItem } from '../services/api';
import { getDateLocale, formatCurrency } from '../utils/formatters';
import { useLanguage } from '../contexts/LanguageContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useCategories, useBrands } from '../hooks/useDurabilityAnalytics';
import { useItems, useInvalidateItems } from '../hooks/useItems';
import { queryKeys } from '../query/queryConfig';
import ReplacementBenchmarkModal from './ReplacementBenchmarkModal';
import { deriveOwnershipTargetEquivalent } from '../utils/ownershipTargetCalculator';
import ItemRequiredFieldsCard from './item-form/ItemRequiredFieldsCard';
import ItemOptionalDetailsCard from './item-form/ItemOptionalDetailsCard';
import ItemStatusCard from './item-form/ItemStatusCard';
import ItemOwnershipTargetCard from './item-form/ItemOwnershipTargetCard';
import ItemDeleteConfirmModal from './item-form/ItemDeleteConfirmModal';
import {
  currentUTCDateOnly,
  dateOnlyToOwnershipDate,
  dateOnlyToOwnershipTimestamp,
  normalizeOwnershipDate,
  ownershipDateToDateOnly,
} from '../utils/ownershipDate';

function AddItem() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(() => normalizeOwnershipDate(new Date()));
  const [status, setStatus] = useState('active');
  const [endedAt, setEndedAt] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [targetType, setTargetType] = useState('none');
  const [targetValue, setTargetValue] = useState('');
  const [targetMode, setTargetMode] = useState('manual');
  const [selectedBenchmarkItemId, setSelectedBenchmarkItemId] = useState('');
  const [benchmarkModalOpen, setBenchmarkModalOpen] = useState(false);
  const [benchmarkSourceItem, setBenchmarkSourceItem] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [month, setMonth] = useState(new Date());
  const [isEditMode, setIsEditMode] = useState(false);
  const [editIndex, setEditIndex] = useState(-1);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [itemLoaded, setItemLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { currencyCode, currencySymbol } = useCurrency();
  const { data: itemsData, isLoading: itemsLoading, error: itemsError } = useItems();
  const items = itemsData ?? [];
  const completedItems = items.filter((candidate) => candidate.status && candidate.status !== 'active');
  const invalidateItems = useInvalidateItems();
  const { data: availableCategories = [] } = useCategories();
  const { data: availableBrands = [] } = useBrands();

  const getLocale = () => getDateLocale(language);

  // Reset form when pathname changes
  useEffect(() => {
    const resetForm = () => {
      setName('');
      setPrice('');
      setCategory('');
      setBrand('');
      setPurchaseDate(normalizeOwnershipDate(new Date()));
      setStatus('active');
      setEndedAt('');
      setSalePrice('');
      setTargetType('none');
      setTargetValue('');
      setTargetMode('manual');
      setSelectedBenchmarkItemId('');
      setBenchmarkModalOpen(false);
      setBenchmarkSourceItem(null);
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

      if (itemsLoading || itemLoaded) return;

      if (itemsError && itemsData === undefined) {
        setErrorMessage(itemsError.message || t('errorLoadingItem'));
        setLoadFailed(true);
        return;
      }

      const itemToEdit = items.find((item) => String(item.id) === String(editId));

      if (itemToEdit) {
          setName(itemToEdit.name);
          setPrice(itemToEdit.price.toString());
          setCategory(itemToEdit.category || '');
          setBrand(itemToEdit.brand || '');
          const parsedPurchaseDate = dateOnlyToOwnershipDate(
            ownershipDateToDateOnly(itemToEdit.purchaseDate)
          );
          setPurchaseDate(parsedPurchaseDate);
          setMonth(parsedPurchaseDate);
          setStatus(itemToEdit.status || 'active');
          setEndedAt(itemToEdit.endedAt ? itemToEdit.endedAt.split('T')[0] : '');
          setSalePrice(
            itemToEdit.salePrice !== undefined && itemToEdit.salePrice !== null
              ? itemToEdit.salePrice.toString()
              : ''
          );
          setTargetType(itemToEdit.targetType || 'none');
          setTargetValue(
            itemToEdit.targetValue !== null && itemToEdit.targetValue !== undefined
              ? String(itemToEdit.targetValue)
              : itemToEdit.targetType === 'cost_per_day'
                ? String(itemToEdit.targetCostPerDay ?? '')
                : String(itemToEdit.targetDurationDays ?? '')
          );
          setItemLoaded(true);
          setLoadFailed(false);
      } else {
        console.error('Item not found for editing');
        setErrorMessage(t('itemNotFound'));
        setLoadFailed(true);
        setItemLoaded(false);
      }
  }, [location.pathname, location.search, navigate, items, itemsData, itemsLoading, itemsError, itemLoaded]);

  // Close desktop date picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDatePicker && !event.target.closest('.date-picker-container')) {
        setShowDatePicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDatePicker]);

  const purchaseDateValue = ownershipDateToDateOnly(purchaseDate);
  const currentDateValue = currentUTCDateOnly();

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

  const numericPrice = Number(price);
  const numericTargetValue = Number(targetValue);
  const hasValidTarget = targetType !== 'none' &&
    targetValue !== '' &&
    Number.isFinite(numericTargetValue) &&
    numericTargetValue > 0;

  const targetFormValid = targetMode === 'benchmark' ||
    targetType === 'none' ||
    hasValidTarget;

  const isFormValid = name.trim() !== '' &&
                     numericPrice > 0 &&
                     purchaseDateValue !== '' &&
                     lifecycleFormValid &&
                     targetFormValid;

  const equivalentTarget = deriveOwnershipTargetEquivalent({
    price: numericPrice,
    targetType,
    targetValue: numericTargetValue
  });

  let equivalentTargetNote = null;
  if (equivalentTarget?.type === 'duration') {
    equivalentTargetNote = t('targetEquivalentDuration', { days: equivalentTarget.value });
  } else if (equivalentTarget?.type === 'cost_per_day') {
    equivalentTargetNote = t('targetEquivalentCostPerDay', {
      amount: formatCurrency(equivalentTarget.value, currencyCode)
    });
  }

  const handleApplyBenchmark = (benchmarkResult) => {
    if (benchmarkResult?.candidatePrice) {
      setPrice(String(benchmarkResult.candidatePrice));
    }
    if (benchmarkResult?.daysToMatchPrevious) {
      setTargetType('duration');
      setTargetValue(String(benchmarkResult.daysToMatchPrevious));
      setTargetMode('manual');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const itemData = {
      name: name.trim(),
      price: Number(price),
      purchaseDate: normalizeOwnershipDate(purchaseDate).toISOString(),
      category: category.trim() || null,
      brand: brand.trim() || null,
    };

    if (isEditMode) {
      itemData.status = status;
      itemData.endedAt = status === 'active'
        ? null
        : dateOnlyToOwnershipTimestamp(endedAt);
      itemData.salePrice = status === 'sold' ? Number(salePrice) : null;
    }

    if (hasValidTarget) {
      itemData.targetType = targetType;
      itemData.targetValue = numericTargetValue;
    } else {
      itemData.targetType = null;
      itemData.targetValue = null;
    }

    setErrorMessage(null);

    try {
      const savedItem = isEditMode
        ? await updateItem(editIndex, itemData)
        : await addItem(itemData);
      queryClient.setQueryData(queryKeys.items, (cachedItems = []) => isEditMode
        ? cachedItems.map((item) => (String(item.id) === String(editIndex) ? savedItem : item))
        : [...cachedItems, savedItem]
      );
      await invalidateItems();
      navigate('/');
    } catch (error) {
      console.error('Error saving item:', error);
      setErrorMessage(error.message || t('errorSavingItem'));
    }
  };

  const handleDelete = async () => {
    if (!itemLoaded) {
      return;
    }

    setErrorMessage(null);

    try {
      await deleteItem(editIndex);
      queryClient.setQueryData(queryKeys.items, (cachedItems = []) =>
        cachedItems.filter((item) => String(item.id) !== String(editIndex))
      );
      await invalidateItems();
      navigate('/');
    } catch (error) {
      console.error('Error deleting item:', error);
      setShowDeleteConfirm(false);
      setErrorMessage(error.message || t('errorDeletingItem'));
    }
  };

  return (
    <>
      {/* Header */}
      <div className="px-3.5 pt-3 pb-1.5">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center w-7 h-7 -ml-1 text-gray-700 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label={t('back')}
          >
            <IoArrowBack className="text-lg" />
          </button>
          <h1 className="text-base font-bold text-gray-900 m-0 translate-y-[0.5px]">
            {isEditMode ? t('editItem') : t('addNewItem')}
          </h1>
        </div>
      </div>

      {/* Form - main content */}
      <div className="px-3.5 py-1.5 space-y-2.5 form-page-content pb-24">
        {errorMessage && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-2.5">
            {/* Required Section Card */}
            <ItemRequiredFieldsCard
              name={name}
              onNameChange={setName}
              price={price}
              onPriceChange={setPrice}
              purchaseDate={purchaseDate}
              onPurchaseDateChange={setPurchaseDate}
              currencySymbol={currencySymbol}
              currencyCode={currencyCode}
              language={language}
              showDatePicker={showDatePicker}
              setShowDatePicker={setShowDatePicker}
              month={month}
              setMonth={setMonth}
              getLocale={getLocale}
            />

            {/* Optional Details Card */}
            <ItemOptionalDetailsCard
              category={category}
              onCategoryChange={setCategory}
              brand={brand}
              onBrandChange={setBrand}
              availableCategories={availableCategories}
              availableBrands={availableBrands}
            />

            {/* Edit Mode Status Card */}
            <ItemStatusCard
              isEditMode={isEditMode}
              itemLoaded={itemLoaded}
              status={status}
              onStatusChange={(nextStatus) => {
                setStatus(nextStatus);
                if (nextStatus === 'active') {
                  setEndedAt('');
                  setSalePrice('');
                } else if (nextStatus !== 'sold') {
                  setSalePrice('');
                }
              }}
              endedAt={endedAt}
              onEndedAtChange={setEndedAt}
              salePrice={salePrice}
              onSalePriceChange={setSalePrice}
              purchaseDateValue={purchaseDateValue}
              currentDateValue={currentDateValue}
              currencySymbol={currencySymbol}
              currencyCode={currencyCode}
            />

            {/* Ownership Target Section Card */}
            <ItemOwnershipTargetCard
              targetMode={targetMode}
              onTargetModeChange={setTargetMode}
              targetType={targetType}
              onTargetTypeChange={(nextTargetType) => {
                setTargetType(nextTargetType);
                if (nextTargetType === 'none') {
                  setTargetValue('');
                }
              }}
              targetValue={targetValue}
              onTargetValueChange={setTargetValue}
              currencySymbol={currencySymbol}
              currencyCode={currencyCode}
              equivalentTargetNote={equivalentTargetNote}
              completedItems={completedItems}
              selectedBenchmarkItemId={selectedBenchmarkItemId}
              onSelectBenchmarkItemId={setSelectedBenchmarkItemId}
              onOpenBenchmarkModal={() => {
                const chosen = completedItems.find(
                  (candidate) => String(candidate.id) === String(selectedBenchmarkItemId)
                );
                if (chosen) {
                  setBenchmarkSourceItem(chosen);
                  setBenchmarkModalOpen(true);
                }
              }}
            />

            {/* Form CTA Buttons */}
            <div className="space-y-2 pt-1">
              <button 
                type="submit" 
                className="w-full py-2.5 bg-teal-600 text-white rounded-xl font-medium
                hover:bg-teal-700 transition-all duration-200 shadow-sm hover:shadow
                disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-sm"
                disabled={!isFormValid || loadFailed || (isEditMode && !itemLoaded)}
              >
                {t('save')}
              </button>

              {isEditMode && itemLoaded && (
                <button 
                  type="button" 
                  className="w-full py-2 bg-white text-red-600 rounded-xl font-medium border border-red-200
                  hover:bg-red-50 transition-all duration-200 text-sm
                  flex items-center justify-center gap-1.5"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <IoTrashOutline className="text-lg" />
                  {t('deleteItem')}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Delete Confirmation Modal */}
      <ItemDeleteConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
      />

      {/* Replacement Benchmark Modal */}
      <ReplacementBenchmarkModal
        isOpen={benchmarkModalOpen && Boolean(benchmarkSourceItem)}
        onClose={() => setBenchmarkModalOpen(false)}
        completedItem={benchmarkSourceItem}
        initialCandidatePrice={price}
        onCandidatePriceChange={(updatedPrice) => setPrice(updatedPrice)}
        onApplyBenchmark={handleApplyBenchmark}
      />
    </>
  );
}

export default AddItem;
