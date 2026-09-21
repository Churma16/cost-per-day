export const CURRENCY_CONFIGURATIONS = {
  USD: {
    code: 'USD',
    symbol: '$',
    locale: 'en-US',
    fractionDigits: 2,
    nameKey: 'usd'
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    locale: 'en-US',
    fractionDigits: 2,
    nameKey: 'eur'
  },
  CNY: {
    code: 'CNY',
    symbol: '¥',
    locale: 'zh-CN',
    fractionDigits: 2,
    nameKey: 'cny'
  },
  IDR: {
    code: 'IDR',
    symbol: 'Rp',
    locale: 'id-ID',
    fractionDigits: 0,
    nameKey: 'idr'
  }
};

export const LEGACY_SYMBOL_TO_CODE_MAP = {
  '$': 'USD',
  '€': 'EUR',
  '¥': 'CNY',
  'Rp': 'IDR'
};

export const normalizeCurrencyCode = (currencyIdentifier) => {
  if (!currencyIdentifier) {
    return 'USD';
  }
  if (LEGACY_SYMBOL_TO_CODE_MAP[currencyIdentifier]) {
    return LEGACY_SYMBOL_TO_CODE_MAP[currencyIdentifier];
  }
  const upperCaseCode = String(currencyIdentifier).toUpperCase();
  if (CURRENCY_CONFIGURATIONS[upperCaseCode]) {
    return upperCaseCode;
  }
  return 'USD';
};

export const getCurrencyConfig = (currencyIdentifier) => {
  const resolvedCurrencyCode = normalizeCurrencyCode(currencyIdentifier);
  return CURRENCY_CONFIGURATIONS[resolvedCurrencyCode] || CURRENCY_CONFIGURATIONS.USD;
};

export const getSupportedCurrencies = () => {
  return Object.values(CURRENCY_CONFIGURATIONS);
};

export const getCurrencySymbol = (currencyIdentifier) => {
  const currencyConfiguration = getCurrencyConfig(currencyIdentifier);
  return currencyConfiguration.symbol;
};
