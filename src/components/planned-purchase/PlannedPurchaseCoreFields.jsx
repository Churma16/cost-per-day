import React from 'react';
import { useTranslation } from 'react-i18next';
import CurrencyInput from '../common/CurrencyInput';

function PlannedPurchaseCoreFields({
  name,
  onNameChange,
  targetPrice,
  onTargetPriceChange,
  currencyCode,
  onCurrencyCodeChange,
  supportedCurrencies,
}) {
  const { t } = useTranslation();

  return (
    <>
      <div>
        <label htmlFor="planned-purchase-name" className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
          {t('targetItemName')} *
        </label>
        <input
          id="planned-purchase-name"
          type="text"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder={t('enterTargetItemName')}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="planned-purchase-price" className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
            {t('targetPrice')} *
          </label>
          <CurrencyInput
            id="planned-purchase-price"
            value={targetPrice}
            onChange={(event) => onTargetPriceChange(event.target.value)}
            currencyCode={currencyCode}
            placeholder={t('enterTargetPrice')}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            required
          />
        </div>

        <div>
          <label htmlFor="planned-purchase-currency" className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
            {t('currency')}
          </label>
          <select
            id="planned-purchase-currency"
            value={currencyCode}
            onChange={(event) => onCurrencyCodeChange(event.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
          >
            {supportedCurrencies.map((config) => (
              <option key={config.code} value={config.code}>
                {t(config.nameKey)}
              </option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
}

export default PlannedPurchaseCoreFields;
