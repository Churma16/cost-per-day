import {
  CURRENCY_CONFIGURATIONS,
  LEGACY_SYMBOL_TO_CODE_MAP,
  normalizeCurrencyCode,
  getCurrencySymbol,
  getCurrencyConfig,
  getSupportedCurrencies
} from './currencyConfig';

describe('currencyConfig utility', () => {
  describe('CURRENCY_CONFIGURATIONS', () => {
    test('defines configurations for supported currencies with full canonical metadata', () => {
      expect(CURRENCY_CONFIGURATIONS.USD).toEqual({
        code: 'USD',
        symbol: '$',
        locale: 'en-US',
        fractionDigits: 2,
        nameKey: 'usd'
      });
      expect(CURRENCY_CONFIGURATIONS.EUR).toEqual({
        code: 'EUR',
        symbol: '€',
        locale: 'en-US',
        fractionDigits: 2,
        nameKey: 'eur'
      });
      expect(CURRENCY_CONFIGURATIONS.CNY).toEqual({
        code: 'CNY',
        symbol: '¥',
        locale: 'zh-CN',
        fractionDigits: 2,
        nameKey: 'cny'
      });
      expect(CURRENCY_CONFIGURATIONS.IDR).toEqual({
        code: 'IDR',
        symbol: 'Rp',
        locale: 'id-ID',
        fractionDigits: 0,
        nameKey: 'idr'
      });
    });
  });

  describe('LEGACY_SYMBOL_TO_CODE_MAP', () => {
    test('maps legacy currency symbols to standard currency codes', () => {
      expect(LEGACY_SYMBOL_TO_CODE_MAP['$']).toBe('USD');
      expect(LEGACY_SYMBOL_TO_CODE_MAP['€']).toBe('EUR');
      expect(LEGACY_SYMBOL_TO_CODE_MAP['¥']).toBe('CNY');
      expect(LEGACY_SYMBOL_TO_CODE_MAP['Rp']).toBe('IDR');
    });
  });

  describe('normalizeCurrencyCode', () => {
    test('normalizes legacy currency symbols to currency codes', () => {
      expect(normalizeCurrencyCode('$')).toBe('USD');
      expect(normalizeCurrencyCode('€')).toBe('EUR');
      expect(normalizeCurrencyCode('¥')).toBe('CNY');
      expect(normalizeCurrencyCode('Rp')).toBe('IDR');
    });

    test('normalizes standard uppercase currency codes', () => {
      expect(normalizeCurrencyCode('USD')).toBe('USD');
      expect(normalizeCurrencyCode('EUR')).toBe('EUR');
      expect(normalizeCurrencyCode('CNY')).toBe('CNY');
      expect(normalizeCurrencyCode('IDR')).toBe('IDR');
    });

    test('normalizes lowercase currency codes to uppercase', () => {
      expect(normalizeCurrencyCode('usd')).toBe('USD');
      expect(normalizeCurrencyCode('eur')).toBe('EUR');
      expect(normalizeCurrencyCode('cny')).toBe('CNY');
      expect(normalizeCurrencyCode('idr')).toBe('IDR');
    });

    test('falls back safely to USD for unrecognized codes, null, or empty values', () => {
      expect(normalizeCurrencyCode('UNKNOWN')).toBe('USD');
      expect(normalizeCurrencyCode('INVALID')).toBe('USD');
      expect(normalizeCurrencyCode('')).toBe('USD');
      expect(normalizeCurrencyCode(null)).toBe('USD');
      expect(normalizeCurrencyCode(undefined)).toBe('USD');
    });
  });

  describe('getCurrencySymbol', () => {
    test('retrieves the correct currency symbol for currency codes', () => {
      expect(getCurrencySymbol('USD')).toBe('$');
      expect(getCurrencySymbol('EUR')).toBe('€');
      expect(getCurrencySymbol('CNY')).toBe('¥');
      expect(getCurrencySymbol('IDR')).toBe('Rp');
    });

    test('retrieves the correct currency symbol when legacy symbols are provided', () => {
      expect(getCurrencySymbol('$')).toBe('$');
      expect(getCurrencySymbol('€')).toBe('€');
      expect(getCurrencySymbol('¥')).toBe('¥');
      expect(getCurrencySymbol('Rp')).toBe('Rp');
    });

    test('retrieves default dollar symbol for unrecognized or empty values', () => {
      expect(getCurrencySymbol('UNKNOWN')).toBe('$');
      expect(getCurrencySymbol('')).toBe('$');
      expect(getCurrencySymbol(null)).toBe('$');
      expect(getCurrencySymbol(undefined)).toBe('$');
    });
  });

  describe('getCurrencyConfig', () => {
    test('retrieves full configuration object for supported currency codes', () => {
      expect(getCurrencyConfig('USD')).toEqual(CURRENCY_CONFIGURATIONS.USD);
      expect(getCurrencyConfig('EUR')).toEqual(CURRENCY_CONFIGURATIONS.EUR);
      expect(getCurrencyConfig('CNY')).toEqual(CURRENCY_CONFIGURATIONS.CNY);
      expect(getCurrencyConfig('IDR')).toEqual(CURRENCY_CONFIGURATIONS.IDR);
    });

    test('retrieves configuration when legacy symbols are provided', () => {
      expect(getCurrencyConfig('$')).toEqual(CURRENCY_CONFIGURATIONS.USD);
      expect(getCurrencyConfig('€')).toEqual(CURRENCY_CONFIGURATIONS.EUR);
      expect(getCurrencyConfig('¥')).toEqual(CURRENCY_CONFIGURATIONS.CNY);
      expect(getCurrencyConfig('Rp')).toEqual(CURRENCY_CONFIGURATIONS.IDR);
    });

    test('retrieves configuration when lowercase currency codes are provided', () => {
      expect(getCurrencyConfig('usd')).toEqual(CURRENCY_CONFIGURATIONS.USD);
      expect(getCurrencyConfig('eur')).toEqual(CURRENCY_CONFIGURATIONS.EUR);
      expect(getCurrencyConfig('cny')).toEqual(CURRENCY_CONFIGURATIONS.CNY);
      expect(getCurrencyConfig('idr')).toEqual(CURRENCY_CONFIGURATIONS.IDR);
    });

    test('falls back safely to USD configuration for invalid or unrecognized identifiers', () => {
      expect(getCurrencyConfig('UNKNOWN')).toEqual(CURRENCY_CONFIGURATIONS.USD);
      expect(getCurrencyConfig('INVALID')).toEqual(CURRENCY_CONFIGURATIONS.USD);
      expect(getCurrencyConfig('')).toEqual(CURRENCY_CONFIGURATIONS.USD);
      expect(getCurrencyConfig(null)).toEqual(CURRENCY_CONFIGURATIONS.USD);
      expect(getCurrencyConfig(undefined)).toEqual(CURRENCY_CONFIGURATIONS.USD);
    });
  });

  describe('getSupportedCurrencies', () => {
    test('returns array of all supported currency configurations', () => {
      const supportedCurrenciesList = getSupportedCurrencies();
      expect(supportedCurrenciesList).toHaveLength(4);
      expect(supportedCurrenciesList).toContainEqual(CURRENCY_CONFIGURATIONS.USD);
      expect(supportedCurrenciesList).toContainEqual(CURRENCY_CONFIGURATIONS.EUR);
      expect(supportedCurrenciesList).toContainEqual(CURRENCY_CONFIGURATIONS.CNY);
      expect(supportedCurrenciesList).toContainEqual(CURRENCY_CONFIGURATIONS.IDR);
    });
  });
});
