import React from 'react';
import { useTranslation } from 'react-i18next';

function ItemStatusCard({
  isEditMode,
  itemLoaded,
  status,
  onStatusChange,
  endedAt,
  onEndedAtChange,
  salePrice,
  onSalePriceChange,
  purchaseDateValue,
  currentDateValue,
  currencySymbol,
}) {
  const { t } = useTranslation();

  if (!isEditMode || !itemLoaded) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E6E8EC] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] space-y-2.5">
      <div className="space-y-1">
        <label htmlFor="item-status" className="text-xs text-gray-600 font-medium">
          {t('itemStatus')}
        </label>
        <select
          id="item-status"
          value={status}
          onChange={(event) => onStatusChange(event.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-[#E6E8EC] bg-white focus:border-teal-600
          focus:ring-2 focus:ring-teal-500/20 outline-none transition-all duration-200 text-sm"
        >
          <option value="active">{t('statusActive')}</option>
          <option value="retired">{t('statusRetired')}</option>
          <option value="sold">{t('statusSold')}</option>
          <option value="lost">{t('statusLost')}</option>
        </select>
      </div>

      {status !== 'active' && (
        <div className="space-y-1">
          <label htmlFor="ownership-end-date" className="text-xs text-gray-600 font-medium">
            {t('ownershipEndDate')}
          </label>
          <input
            id="ownership-end-date"
            type="date"
            value={endedAt}
            min={purchaseDateValue}
            max={currentDateValue}
            onChange={(event) => onEndedAtChange(event.target.value)}
            required
            className="w-full px-3 py-2 rounded-xl border border-[#E6E8EC] bg-white focus:border-teal-600
            focus:ring-2 focus:ring-teal-500/20 outline-none transition-all duration-200 text-sm"
          />
        </div>
      )}

      {status === 'sold' && (
        <div className="space-y-1">
          <label htmlFor="sale-price" className="text-xs text-gray-600 font-medium">
            {t('salePrice')}
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{currencySymbol}</div>
            <input
              id="sale-price"
              type="number"
              value={salePrice}
              onChange={(event) => onSalePriceChange(event.target.value)}
              required
              min="0"
              step="0.01"
              placeholder={t('enterSalePrice')}
              className={`w-full px-3 py-2 ${currencySymbol.length > 1 ? 'pl-9' : 'pl-7'} rounded-xl border border-[#E6E8EC] bg-white focus:border-teal-600
              focus:ring-2 focus:ring-teal-500/20 outline-none transition-all duration-200 text-sm`}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default ItemStatusCard;
