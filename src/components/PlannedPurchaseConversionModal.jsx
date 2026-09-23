import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../utils/formatters';

const localToday = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function PlannedPurchaseConversionModal({
  plannedPurchase,
  onConfirm,
  onCancel,
  isSubmitting = false,
  errorMessage = null,
}) {
  const { t } = useTranslation();
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(localToday());

  useEffect(() => {
    if (!plannedPurchase) return;
    setPurchasePrice(String(plannedPurchase.targetPrice ?? ''));
    setPurchaseDate(localToday());
  }, [plannedPurchase]);

  if (!plannedPurchase) {
    return null;
  }

  const numericPurchasePrice = Number(purchasePrice);
  const currencyCode = plannedPurchase.currencyCode || 'USD';
  const canSubmit =
    Number.isFinite(numericPurchasePrice) &&
    numericPurchasePrice > 0 &&
    purchaseDate !== '' &&
    !isSubmitting;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;

    await onConfirm({
      purchasePrice: numericPurchasePrice,
      currencyCode,
      purchaseDate,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-xl">
        <div className="mb-4 space-y-1">
          <h3 className="text-base font-bold text-gray-900">{t('markAsPurchased')}</h3>
          <p className="text-xs leading-relaxed text-gray-500">
            {t('markAsPurchasedDescription')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="conversion-item-name" className="mb-1 block text-xs font-medium text-gray-700">
              {t('itemName')}
            </label>
            <input
              id="conversion-item-name"
              type="text"
              value={plannedPurchase.name}
              readOnly
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
            />
          </div>

          <div>
            <label htmlFor="conversion-purchase-price" className="mb-1 block text-xs font-medium text-gray-700">
              {t('actualPurchasePrice')}
            </label>
            <input
              id="conversion-purchase-price"
              type="number"
              min="0"
              step="any"
              value={purchasePrice}
              onChange={(event) => setPurchasePrice(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-gray-500">
              {t('plannedPriceReference', {
                amount: formatCurrency(plannedPurchase.targetPrice, currencyCode),
              })}
            </p>
          </div>

          <div>
            <label htmlFor="conversion-currency" className="mb-1 block text-xs font-medium text-gray-700">
              {t('currency')}
            </label>
            <input
              id="conversion-currency"
              type="text"
              value={currencyCode}
              readOnly
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
            />
          </div>

          <div>
            <label htmlFor="conversion-purchase-date" className="mb-1 block text-xs font-medium text-gray-700">
              {t('purchaseDate')}
            </label>
            <input
              id="conversion-purchase-date"
              type="date"
              value={purchaseDate}
              onChange={(event) => setPurchaseDate(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            />
          </div>

          {errorMessage && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {errorMessage}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? t('loading') : t('createOwnedItem')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PlannedPurchaseConversionModal;
