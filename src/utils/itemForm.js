import {
  currentUTCDateOnly,
  dateOnlyToOwnershipDate,
  dateOnlyToOwnershipTimestamp,
  normalizeOwnershipDate,
  ownershipDateToDateOnly,
} from './ownershipDate';

const getTargetValue = (item) => {
  if (item?.targetValue !== null && item?.targetValue !== undefined) {
    return String(item.targetValue);
  }

  if (item?.targetType === 'cost_per_day') {
    return String(item.targetCostPerDay ?? '');
  }

  return String(item?.targetDurationDays ?? '');
};

export const createInitialItemFormValues = (draft = null, now = new Date()) => {
  const defaultPurchaseDate = normalizeOwnershipDate(now);
  const restoredPurchaseDate = draft?.purchaseDate
    ? dateOnlyToOwnershipDate(draft.purchaseDate)
    : defaultPurchaseDate;

  return {
    name: draft?.name ?? '',
    price: draft?.price ?? '',
    category: draft?.category ?? '',
    brand: draft?.brand ?? '',
    purchaseDate: Number.isNaN(restoredPurchaseDate.getTime())
      ? defaultPurchaseDate
      : restoredPurchaseDate,
    status: 'active',
    endedAt: '',
    salePrice: '',
    targetType: draft?.targetType ?? 'none',
    targetValue: draft?.targetValue ?? '',
    targetMode: draft?.targetMode ?? 'manual',
    selectedBenchmarkItemId: draft?.selectedBenchmarkItemId ?? '',
  };
};

export const itemToFormValues = (item) => {
  const purchaseDate = dateOnlyToOwnershipDate(
    ownershipDateToDateOnly(item?.purchaseDate)
  );

  return {
    name: item?.name ?? '',
    price: item?.price !== null && item?.price !== undefined
      ? String(item.price)
      : '',
    category: item?.category ?? '',
    brand: item?.brand ?? '',
    purchaseDate,
    status: item?.status || 'active',
    endedAt: item?.endedAt ? ownershipDateToDateOnly(item.endedAt) : '',
    salePrice:
      item?.salePrice !== null && item?.salePrice !== undefined
        ? String(item.salePrice)
        : '',
    targetType: item?.targetType || 'none',
    targetValue: getTargetValue(item),
  };
};

export const itemFormValuesToDraftData = (formValues) => ({
  name: formValues.name,
  price: formValues.price,
  category: formValues.category,
  brand: formValues.brand,
  purchaseDate: ownershipDateToDateOnly(formValues.purchaseDate),
  targetType: formValues.targetType,
  targetValue: formValues.targetValue,
  targetMode: formValues.targetMode,
  selectedBenchmarkItemId: formValues.selectedBenchmarkItemId,
});

const getTargetValidation = ({ targetType, targetValue }) => {
  const numericTargetValue = Number(targetValue);
  const hasValidTarget =
    targetType !== 'none' &&
    targetValue !== '' &&
    Number.isFinite(numericTargetValue) &&
    numericTargetValue > 0;

  return {
    hasValidTarget,
    numericTargetValue,
  };
};

export const validateItemForm = (
  formValues,
  {
    isEditMode = false,
    currentDateValue = currentUTCDateOnly(),
  } = {}
) => {
  const purchaseDateValue = ownershipDateToDateOnly(formValues.purchaseDate);
  const numericPrice = Number(formValues.price);
  const { hasValidTarget, numericTargetValue } = getTargetValidation(formValues);

  const lifecycleFormValid =
    !isEditMode ||
    formValues.status === 'active' ||
    (
      formValues.endedAt !== '' &&
      formValues.endedAt >= purchaseDateValue &&
      formValues.endedAt <= currentDateValue &&
      (
        formValues.status !== 'sold' ||
        (
          formValues.salePrice !== '' &&
          Number.isFinite(Number(formValues.salePrice)) &&
          Number(formValues.salePrice) >= 0
        )
      )
    );

  const targetFormValid =
    formValues.targetMode === 'benchmark' ||
    formValues.targetType === 'none' ||
    hasValidTarget;

  return {
    isValid:
      formValues.name.trim() !== '' &&
      numericPrice > 0 &&
      purchaseDateValue !== '' &&
      lifecycleFormValid &&
      targetFormValid,
    lifecycleFormValid,
    targetFormValid,
    hasValidTarget,
    numericPrice,
    numericTargetValue,
    purchaseDateValue,
    currentDateValue,
  };
};

export const buildItemPayload = (formValues, { isEditMode = false } = {}) => {
  const { hasValidTarget, numericTargetValue } = getTargetValidation(formValues);

  const itemData = {
    name: formValues.name.trim(),
    price: Number(formValues.price),
    purchaseDate: normalizeOwnershipDate(formValues.purchaseDate).toISOString(),
    category: formValues.category.trim() || null,
    brand: formValues.brand.trim() || null,
  };

  if (isEditMode) {
    itemData.status = formValues.status;
    itemData.endedAt = formValues.status === 'active'
      ? null
      : dateOnlyToOwnershipTimestamp(formValues.endedAt);
    itemData.salePrice = formValues.status === 'sold'
      ? Number(formValues.salePrice)
      : null;
  }

  if (hasValidTarget) {
    itemData.targetType = formValues.targetType;
    itemData.targetValue = numericTargetValue;
  } else {
    itemData.targetType = null;
    itemData.targetValue = null;
  }

  return itemData;
};
