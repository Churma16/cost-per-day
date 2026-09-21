export const CURRENCY_CONFIGURATIONS = {
  USD: { code: 'USD', symbol: '$' },
  EUR: { code: 'EUR', symbol: '€' },
  CNY: { code: 'CNY', symbol: '¥' },
  IDR: { code: 'IDR', symbol: 'Rp' }
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

export const getCurrencySymbol = (currencyIdentifier) => {
  const resolvedCode = normalizeCurrencyCode(currencyIdentifier);
  return CURRENCY_CONFIGURATIONS[resolvedCode]?.symbol || '$';
};
