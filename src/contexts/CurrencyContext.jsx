import React, { createContext, useState, useEffect, useContext } from 'react';
import { getSetting, updateSetting } from '../services/api';

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
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadCurrencySetting = async () => {
      try {
        setError(null);
        const savedCurrency = await getSetting('currency');

        if (savedCurrency) {
          if (LEGACY_SYMBOL_TO_CODE_MAP[savedCurrency]) {
            const migratedCurrencyCode = LEGACY_SYMBOL_TO_CODE_MAP[savedCurrency];
            await updateSetting('currency', migratedCurrencyCode);
            setCurrencyCode(migratedCurrencyCode);
          } else {
            setCurrencyCode(normalizeCurrencyCode(savedCurrency));
          }
        } else {
          setCurrencyCode('USD');
        }
      } catch (loadError) {
        console.error('Error loading currency setting:', loadError);
        setError(loadError);
      } finally {
        setIsLoading(false);
      }
    };

    loadCurrencySetting();
  }, []);

  const changeCurrency = async (newCurrencyInput) => {
    const normalizedCode = normalizeCurrencyCode(newCurrencyInput);

    try {
      setError(null);
      await updateSetting('currency', normalizedCode);
      setCurrencyCode(normalizedCode);
    } catch (updateError) {
      console.error('Error updating currency:', updateError);
      setError(updateError);
      throw updateError;
    }
  };

  const currencySymbol = getCurrencySymbol(currencyCode);

  return (
    <CurrencyContext.Provider value={{
      currencyCode,
      currencySymbol,
      currency: currencySymbol,
      changeCurrency,
      isLoading,
      error
    }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => useContext(CurrencyContext);
