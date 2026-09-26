import React from 'react';
import { useTranslation } from 'react-i18next';
import CurrencyInput from '../common/CurrencyInput';
import { FormField, formControlClassName } from '../common/FormSectionCard';

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
      <FormField label={t('targetItemName')} htmlFor="planned-purchase-name" required>
        <input
          id="planned-purchase-name"
          type="text"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder={t('enterTargetItemName')}
          className={formControlClassName}
          required
        />
      </FormField>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        <FormField label={t('itemPrice')} htmlFor="planned-purchase-price" required>
          <CurrencyInput
            id="planned-purchase-price"
            value={targetPrice}
            onChange={(event) => onTargetPriceChange(event.target.value)}
            currencyCode={currencyCode}
            placeholder={t('enterItemPrice')}
            className={formControlClassName}
            required
          />
        </FormField>

        <FormField label={t('currency')} htmlFor="planned-purchase-currency">
          <select
            id="planned-purchase-currency"
            value={currencyCode}
            onChange={(event) => onCurrencyCodeChange(event.target.value)}
            className={formControlClassName}
          >
            {supportedCurrencies.map((config) => (
              <option key={config.code} value={config.code}>
                {t(config.nameKey)}
              </option>
            ))}
          </select>
        </FormField>
      </div>
    </>
  );
}

export default PlannedPurchaseCoreFields;
