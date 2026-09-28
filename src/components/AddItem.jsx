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
import {
  ActionLoadingContent,
  EmptyState,
  ErrorCard,
  FormSkeleton,
  NoticeCard,
  SlowLoadIndicator,
} from './ui/AsyncState';
import { useLoadingPhases, useSlowAction } from '../hooks/useLoadingPhases';

const createTargetDraftValues = ({ targetType, targetValue }) => ({
  cost_per_day: targetType === 'cost_per_day' ? targetValue : '',
  duration: targetType === 'duration' ? targetValue : '',
});

function AddItem({ showHeader = true, isVisible = true }) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isGuest = false } = useAuth() ?? {};
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
  const [targetDraftValues, setTargetDraftValues] = useState(
    () => createTargetDraftValues(initialFormValues)
  );
  const [targetMode, setTargetMode] = useState(initialFormValues.targetMode);
  const [selectedBenchmarkItemId, setSelectedBenchmarkItemId] = useState(
    initialFormValues.selectedBenchmarkItemId
  );
  const [benchmarkModalOpen, setBenchmarkModalOpen] = useState(false);
  const [benchmarkSourceItem, setBenchmarkSourceItem] = useState(null);
  const [hydratedEditId, setHydratedEditId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [errorContext, setErrorContext] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const { currencyCode, currencySymbol } = useCurrency();
  const {
    data: itemsData,
    isLoading: itemsLoading,
    error: itemsError,
    refetch: refetchItems,
  } = useItems();
  const items = itemsData ?? [];
  const completedItems = items.filter(
    (candidate) => candidate.status && candidate.status !== 'active'
  );
  const itemLoaded =
    isEditMode &&
    editId !== null &&
    String(hydratedEditId) === String(editId);
  const editItem = isEditMode && editId
    ? items.find((item) => String(item.id) === String(editId))
    : null;
  const isEditLoadError = isEditMode && itemsData === undefined && Boolean(itemsError);
  const isEditItemMissing = isEditMode
    && Boolean(editId)
    && !itemsLoading
    && !isEditLoadError
    && itemsData !== undefined
    && !editItem;
  const isEditHydrating = isEditMode
    && Boolean(editId)
    && !isEditLoadError
    && !isEditItemMissing
    && !itemLoaded;
  const createItemMutation = useCreateItem();
  const updateItemMutation = useUpdateItem();
  const deleteItemMutation = useDeleteItem();
  const editLoadingState = useLoadingPhases(isEditHydrating);
  const isSaving = createItemMutation.isPending || updateItemMutation.isPending;
  const isSlowSaving = useSlowAction(isSaving);
  const { data: availableCategories = [] } = useCategories();
  const { data: availableBrands = [] } = useBrands();

  const effectiveTargetMode = isGuest ? 'manual' : targetMode;
  const targetValue = targetDraftValues[targetType] ?? '';
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
    targetMode: effectiveTargetMode,
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
      return;
    }

    if (!editItem) {
      return;
    }

    const hydratedValues = itemToFormValues(editItem);
    setName(hydratedValues.name);
    setPrice(hydratedValues.price);
    setCategory(hydratedValues.category);
    setBrand(hydratedValues.brand);
    setPurchaseDate(hydratedValues.purchaseDate);
    setStatus(hydratedValues.status);
    setEndedAt(hydratedValues.endedAt);
    setSalePrice(hydratedValues.salePrice);
    setTargetType(hydratedValues.targetType);
    setTargetDraftValues(createTargetDraftValues(hydratedValues));
    setHydratedEditId(String(editId));
    setErrorMessage(null);
    setErrorContext(null);
  }, [
    editId,
    isEditMode,
    itemLoaded,
    editItem,
    itemsData,
    itemsError,
    itemsLoading,
  ]);

  const {
    isValid: isFormValid,
    lifecycleFormValid,
    targetFormValid,
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
    if (benchmarkResult?.daysToMatchPrevious) {
      setTargetType('duration');
      setTargetDraftValues((currentValues) => ({
        ...currentValues,
        duration: String(benchmarkResult.daysToMatchPrevious),
      }));
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
    setTargetDraftValues(createTargetDraftValues(resetValues));
    setTargetMode(resetValues.targetMode);
    setSelectedBenchmarkItemId(resetValues.selectedBenchmarkItemId);
    setBenchmarkModalOpen(false);
    setBenchmarkSourceItem(null);
    setErrorMessage(null);
    setErrorContext(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextFieldErrors = {};
    if (!name.trim()) {
      nextFieldErrors.name = t('enterItemNameToContinue');
    }
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      nextFieldErrors.price = t('enterPriceToContinue');
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setErrorMessage(null);
      setErrorContext(null);
      window.requestAnimationFrame(() => {
        const firstFieldId = nextFieldErrors.name ? 'owned-item-name' : 'owned-item-price';
        document.getElementById(firstFieldId)?.focus();
      });
      return;
    }

    if (!isFormValid) {
      setErrorContext('validation');
      setErrorMessage(t('itemValidationErrorBody'));
      return;
    }

    setFieldErrors({});
    const itemData = buildItemPayload(formValues, { isEditMode });
    setErrorMessage(null);
    setErrorContext(null);

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
      if (error?.code === 'guest_item_limit') {
        setErrorContext('guest');
        setErrorMessage(t('guestItemLimitReached', { limit: error.limit }));
      } else {
        setErrorContext('save');
        setErrorMessage(t('itemSaveErrorBody'));
      }
    }
  };

  const handleDelete = async () => {
    if (!itemLoaded) {
      return;
    }

    setErrorMessage(null);
    setErrorContext(null);

    try {
      await deleteItemMutation.mutateAsync(editId);
      navigate('/');
    } catch (error) {
      console.error('Error deleting item:', error);
      setShowDeleteConfirm(false);
      setErrorContext('delete');
      setErrorMessage(t('itemDeleteErrorBody'));
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
        {editLoadingState.phase !== 'idle' ? (
          <div aria-busy="true" className="min-h-[280px]">
            {editLoadingState.phase !== 'blank' && (
              <>
                <FormSkeleton paused={editLoadingState.showSlowIndicator} />
                {editLoadingState.showSlowIndicator && (
                  <SlowLoadIndicator message={t('stillLoadingItem')} />
                )}
              </>
            )}
          </div>
        ) : isEditLoadError ? (
          <NoticeCard
            body={t('editItemLoadErrorDescription')}
            actionLabel={t('tryAgain')}
            onAction={() => refetchItems()}
          />
        ) : isEditItemMissing ? (
          <EmptyState
            motif="home"
            title={t('itemNotFoundTitle')}
            description={t('itemNotFound')}
            actionLabel={t('backToWorthwhile')}
            onAction={() => navigate('/')}
          />
        ) : (
          <>
            {errorMessage && (
              <ErrorCard
                title={
                  errorContext === 'save'
                    ? t('itemSaveErrorTitle')
                    : errorContext === 'delete'
                      ? t('itemDeleteErrorTitle')
                      : errorContext === 'validation'
                        ? t('checkItemDetails')
                        : undefined
                }
                body={errorMessage}
                onDismiss={() => {
                  setErrorMessage(null);
                  setErrorContext(null);
                }}
              />
            )}

            <form onSubmit={handleSubmit}>
          <div className="space-y-2.5">
            {showHeader && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5" aria-label={t('ownedItemContext')}>
                <p className="text-xs font-semibold text-slate-900">{t('ownedItemContext')}</p>
                <p className="mt-0.5 text-[11px] text-slate-600">{t('ownedItemContextHelp')}</p>
              </div>
            )}

            {/* Required Section Card */}
            <ItemRequiredFieldsCard
              name={name}
              onNameChange={(nextName) => {
                setName(nextName);
                if (fieldErrors.name) {
                  setFieldErrors((current) => ({ ...current, name: null }));
                }
              }}
              price={price}
              onPriceChange={(nextPrice) => {
                setPrice(nextPrice);
                if (fieldErrors.price) {
                  setFieldErrors((current) => ({ ...current, price: null }));
                }
              }}
              purchaseDate={purchaseDate}
              onPurchaseDateChange={setPurchaseDate}
              currencySymbol={currencySymbol}
              currencyCode={currencyCode}
              language={language}
              nameError={fieldErrors.name}
              priceError={fieldErrors.price}
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
              targetMode={effectiveTargetMode}
              onTargetModeChange={setTargetMode}
              allowBenchmark={!isGuest}
              targetType={targetType}
              onTargetTypeChange={setTargetType}
              targetValue={targetValue}
              targetValues={targetDraftValues}
              onTargetValueChange={(nextTargetValue, valueTargetType = targetType) => {
                if (valueTargetType === 'none') return;
                setTargetDraftValues((currentValues) => ({
                  ...currentValues,
                  [valueTargetType]: nextTargetValue,
                }));
              }}
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
                aria-busy={isSaving ? 'true' : undefined}
                className="w-full rounded-xl bg-[var(--accent-strong)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#146E65] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={
                  isSaving
                  || !lifecycleFormValid
                  || !targetFormValid
                  || (isEditMode && !itemLoaded)
                }
              >
                {isSaving ? <ActionLoadingContent /> : t('save')}
              </button>
              {isSlowSaving && (
                <p role="status" className="text-center text-xs text-[var(--text-secondary)]">
                  {t('saving')}
                </p>
              )}

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
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-[var(--error-outline)] bg-white py-2 text-sm font-medium text-[var(--error-text)] transition-colors"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <IoTrashOutline className="text-lg" />
                  {t('deleteItem')}
                </button>
              )}
            </div>
          </div>
            </form>
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ItemDeleteConfirmModal
        isOpen={showDeleteConfirm}
        itemName={name}
        isDeleting={deleteItemMutation.isPending}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
      />

      {/* Replacement Benchmark Modal */}
      {!isGuest && (
        <ReplacementBenchmarkModal
          isOpen={benchmarkModalOpen && Boolean(benchmarkSourceItem)}
          onClose={() => setBenchmarkModalOpen(false)}
          completedItem={benchmarkSourceItem}
          initialCandidatePrice={price}
          onApplyBenchmark={handleApplyBenchmark}
        />
      )}
    </>
  );
}

export default AddItem;
