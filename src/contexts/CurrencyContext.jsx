import React, { createContext, useContext, useEffect } from 'react';
import { useSettings, useUpdateSetting } from '../hooks/useSettings';

import {
  CURRENCY_CONFIGURATIONS,
  LEGACY_SYMBOL_TO_CODE_MAP,
  normalizeCurrencyCode,
  getCurrencySymbol,
  getCurrencyConfig,
  getSupportedCurrencies
} from '../utils/currencyConfig';

export {
  CURRENCY_CONFIGURATIONS,
  LEGACY_SYMBOL_TO_CODE_MAP,
  normalizeCurrencyCode,
  getCurrencySymbol,
  getCurrencyConfig,
  getSupportedCurrencies
};

const CurrencyContext = createContext();

export const CurrencyProvider = ({ children }) => {
  const settingsQuery = useSettings();
  const updateSettingMutation = useUpdateSetting();
  const savedCurrency = settingsQuery.data?.currency;
  const currencyCode = normalizeCurrencyCode(savedCurrency || 'USD');

  useEffect(() => {
    const migratedCurrencyCode = LEGACY_SYMBOL_TO_CODE_MAP[savedCurrency];
    if (migratedCurrencyCode) {
      updateSettingMutation.mutate({ key: 'currency', value: migratedCurrencyCode });
    }
  }, [savedCurrency, updateSettingMutation]);

  const changeCurrency = async (newCurrencyInput) => {
    const normalizedCode = normalizeCurrencyCode(newCurrencyInput);
    await updateSettingMutation.mutateAsync({ key: 'currency', value: normalizedCode });
  };

  const currencySymbol = getCurrencySymbol(currencyCode);

  return (
    <CurrencyContext.Provider value={{
      currencyCode,
      currencySymbol,
      currency: currencySymbol,
      changeCurrency,
      isLoading: settingsQuery.isLoading && !settingsQuery.data,
      error: settingsQuery.error || updateSettingMutation.error
    }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => useContext(CurrencyContext);
