import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IoTrashOutline, IoArrowBack } from 'react-icons/io5';
import 'react-day-picker/dist/style.css';
import { formatCurrency } from '../utils/formatters';
import { useLanguage } from '../contexts/LanguageContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useAuth } from '../contexts/AuthContext';
import { useCategories, useBrands } from '../hooks/useDurabilityAnalytics';
import {
  useCreateItem,
  useDeleteItem,
  useItems,
  useUpdateItem,
} from '../hooks/useItems';
import {
  getInitialAddItemDraft,
  useAddItemDraft,
} from '../hooks/useAddItemDraft';
import ReplacementBenchmarkModal from './ReplacementBenchmarkModal';
import { deriveOwnershipTargetEquivalent } from '../utils/ownershipTargetCalculator';
import {
  buildItemPayload,
  createInitialItemFormValues,
  itemFormValuesToDraftData,
  itemToFormValues,
  validateItemForm,
} from '../utils/itemForm';
import ItemRequiredFieldsCard from './item-form/ItemRequiredFieldsCard';
import ItemOptionalDetailsCard from './item-form/ItemOptionalDetailsCard';
import ItemStatusCard from './item-form/ItemStatusCard';
import ItemOwnershipTargetCard from './item-form/ItemOwnershipTargetCard';
import ItemDeleteConfirmModal from './item-form/ItemDeleteConfirmModal';

function AddItem({ showHeader = true, isVisible = true }) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth() ?? {};
  const draftUserId = user?.id ?? null;
  const isAddMode = location.pathname === '/add';
  const isEditMode = location.pathname === '/edit';
  const editId = useMemo(() => {
    if (!isEditMode) {
      return null;
    }

    return new URLSearchParams(location.search).get('id');
  }, [isEditMode, location.search]);
  const initialDraft = useMemo(
    () => getInitialAddItemDraft({ enabled: isAddMode, userId: draftUserId }),
    [isAddMode, draftUserId]
  );
  const initialFormValues = useMemo(
    () => createInitialItemFormValues(initialDraft),
    [initialDraft]
  );

  const [name, setName] = useState(initialFormValues.name);
  const [price, setPrice] = useState(initialFormValues.price);
  const [category, setCategory] = useState(initialFormValues.category);
  const [brand, setBrand] = useState(initialFormValues.brand);
  const [purchaseDate, setPurchaseDate] = useState(initialFormValues.purchaseDate);
  const [status, setStatus] = useState(initialFormValues.status);
  const [endedAt, setEndedAt] = useState(initialFormValues.endedAt);
  const [salePrice, setSalePrice] = useState(initialFormValues.salePrice);
  const [targetType, setTargetType] = useState(initialFormValues.targetType);
  const [targetValue, setTargetValue] = useState(initialFormValues.targetValue);
  const [targetMode, setTargetMode] = useState(initialFormValues.targetMode);
  const [selectedBenchmarkItemId, setSelectedBenchmarkItemId] = useState(
    initialFormValues.selectedBenchmarkItemId
  );
  const [benchmarkModalOpen, setBenchmarkModalOpen] = useState(false);
  const [benchmarkSourceItem, setBenchmarkSourceItem] = useState(null);
  const [hydratedEditId, setHydratedEditId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const { currencyCode, currencySymbol } = useCurrency();
  const { data: itemsData, isLoading: itemsLoading, error: itemsError } = useItems();
  const items = itemsData ?? [];
  const completedItems = items.filter(
    (candidate) => candidate.status && candidate.status !== 'active'
  );
  const itemLoaded =
    isEditMode &&
    editId !== null &&
    String(hydratedEditId) === String(editId);
  const createItemMutation = useCreateItem();
  const updateItemMutation = useUpdateItem();
  const deleteItemMutation = useDeleteItem();
  const { data: availableCategories = [] } = useCategories();
  const { data: availableBrands = [] } = useBrands();

  const formValues = {
    name,
    price,
    category,
    brand,
    purchaseDate,
    status,
    endedAt,
    salePrice,
    targetType,
    targetValue,
    targetMode,
    selectedBenchmarkItemId,
  };
  const addDraftData = itemFormValuesToDraftData(formValues);
  const { clearDraft } = useAddItemDraft({
    enabled: isAddMode,
    userId: draftUserId,
    draftData: addDraftData,
    initialDraft,
  });

  useEffect(() => {
    if (!isEditMode) {
      return;
    }

    if (!editId) {
      console.error('Edit mode requires an ID parameter');
      navigate('/');
    }
  }, [isEditMode, editId, navigate]);

  // Load server-backed item data for edit mode.
  useEffect(() => {
    if (!isEditMode || !editId || itemsLoading || itemLoaded) {
      return;
    }

    if (itemsError && itemsData === undefined) {
      setErrorMessage(itemsError.message || t('errorLoadingItem'));
      setLoadFailed(true);
      return;
    }

    const itemToEdit = items.find(
      (item) => String(item.id) === String(editId)
    );

    if (!itemToEdit) {
      console.error('Item not found for editing');
      setErrorMessage(t('itemNotFound'));
      setLoadFailed(true);
      setHydratedEditId(null);
      return;
    }

    const hydratedValues = itemToFormValues(itemToEdit);
    setName(hydratedValues.name);
    setPrice(hydratedValues.price);
    setCategory(hydratedValues.category);
    setBrand(hydratedValues.brand);
    setPurchaseDate(hydratedValues.purchaseDate);
    setStatus(hydratedValues.status);
    setEndedAt(hydratedValues.endedAt);
    setSalePrice(hydratedValues.salePrice);
    setTargetType(hydratedValues.targetType);
    setTargetValue(hydratedValues.targetValue);
    setHydratedEditId(String(editId));
    setLoadFailed(false);
    setErrorMessage(null);
  }, [
    editId,
    isEditMode,
    itemLoaded,
    items,
    itemsData,
    itemsError,
    itemsLoading,
    t,
  ]);

  const {
    isValid: isFormValid,
    numericPrice,
    numericTargetValue,
    purchaseDateValue,
    currentDateValue,
  } = validateItemForm(formValues, { isEditMode });

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

  const handleDiscardDraft = () => {
    const resetValues = createInitialItemFormValues();
    const resetDraftData = itemFormValuesToDraftData(resetValues);

    clearDraft(resetDraftData);
    setName(resetValues.name);
    setPrice(resetValues.price);
    setCategory(resetValues.category);
    setBrand(resetValues.brand);
    setPurchaseDate(resetValues.purchaseDate);
    setStatus(resetValues.status);
    setEndedAt(resetValues.endedAt);
    setSalePrice(resetValues.salePrice);
    setTargetType(resetValues.targetType);
    setTargetValue(resetValues.targetValue);
    setTargetMode(resetValues.targetMode);
    setSelectedBenchmarkItemId(resetValues.selectedBenchmarkItemId);
    setBenchmarkModalOpen(false);
    setBenchmarkSourceItem(null);
    setErrorMessage(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const itemData = buildItemPayload(formValues, { isEditMode });
    setErrorMessage(null);

    try {
      if (isEditMode) {
        await updateItemMutation.mutateAsync({
          itemId: editId,
          itemData,
        });
      } else {
        await createItemMutation.mutateAsync(itemData);
        clearDraft();
      }

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
      await deleteItemMutation.mutateAsync(editId);
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
      {showHeader && (
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
      )}

      {/* Form - main content */}
      <div className="px-3.5 py-1.5 space-y-2.5 form-page-content pb-8">
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
              isVisible={isVisible}
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
                disabled={!isFormValid || (isEditMode && (loadFailed || !itemLoaded))}
              >
                {t('save')}
              </button>

              {!isEditMode && (
                <button
                  type="button"
                  className="w-full py-2 bg-white text-gray-700 rounded-xl font-medium border border-gray-300
                  hover:bg-gray-50 hover:text-gray-900 shadow-sm transition-all duration-200 text-sm"
                  onClick={handleDiscardDraft}
                >
                  {t('discardDraft')}
                </button>
              )}

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
