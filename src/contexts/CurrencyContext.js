import React, { createContext, useState, useEffect, useContext } from 'react';
import { getSetting, updateSetting } from '../services/db';

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


// Create context
const CurrencyContext = createContext();

// Create provider component
export const CurrencyProvider = ({ children }) => {
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [isLoading, setIsLoading] = useState(true);

  // Load currency setting from database and migrate legacy symbols
  useEffect(() => {
    const loadCurrencySetting = async () => {
      try {
        const savedCurrency = await getSetting('currency');
        if (savedCurrency) {
          if (LEGACY_SYMBOL_TO_CODE_MAP[savedCurrency]) {
            const migratedCurrencyCode = LEGACY_SYMBOL_TO_CODE_MAP[savedCurrency];
            setCurrencyCode(migratedCurrencyCode);
            await updateSetting('currency', migratedCurrencyCode);
          } else {
            const normalizedCode = normalizeCurrencyCode(savedCurrency);
            setCurrencyCode(normalizedCode);
          }
        } else {
          setCurrencyCode('USD');
        }
      } catch (error) {
        console.error('Error loading currency setting:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadCurrencySetting();
  }, []);

  // Function to change currency
  const changeCurrency = async (newCurrencyInput) => {
    try {
      const normalizedCode = normalizeCurrencyCode(newCurrencyInput);
      setCurrencyCode(normalizedCode);
      await updateSetting('currency', normalizedCode);
    } catch (error) {
      console.error('Error updating currency:', error);
    }
  };

  const currencySymbol = getCurrencySymbol(currencyCode);

  return (
    <CurrencyContext.Provider value={{
      currencyCode,
      currencySymbol,
      currency: currencySymbol,
      changeCurrency,
      isLoading
    }}>
      {children}
    </CurrencyContext.Provider>
  );
};

// Custom hook
export const useCurrency = () => useContext(CurrencyContext);