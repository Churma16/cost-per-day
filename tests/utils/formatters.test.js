import { vi } from 'vitest';
import { formatCurrency, getDateLocale, formatDisplayDate } from '../../src/utils/formatters';
import * as currencyConfigModule from '../../src/utils/currencyConfig';

describe('date locale selection', () => {
  test('maps Indonesian to the date-fns Indonesian locale', () => {
    expect(getDateLocale('id').code).toBe('id');
  });

  test('preserves existing locale mappings and English fallback', () => {
    expect(getDateLocale('en').code).toBe('en-US');
    expect(getDateLocale('fr').code).toBe('fr');
    expect(getDateLocale('zh').code).toBe('zh-CN');
    expect(getDateLocale('unknown').code).toBe('en-US');
  });
});

describe('formatDisplayDate utility function', () => {
  test('formats date string into dd MMM yyyy for English', () => {
    const formattedDate = formatDisplayDate('2026-09-01T12:00:00Z', 'en');
    expect(formattedDate).toBe('01 Sep 2026');
  });

  test('formats date string into dd MMM yyyy for Indonesian', () => {
    const formattedDate = formatDisplayDate('2026-08-15T12:00:00Z', 'id');
    expect(formattedDate).toBe('15 Agt 2026');
  });

  test('returns empty string when date is null or undefined', () => {
    expect(formatDisplayDate(null)).toBe('');
    expect(formatDisplayDate(undefined)).toBe('');
  });
});

describe('formatCurrency utility function', () => {
  describe('Indonesian Rupiah (IDR) formatting', () => {
    test('formats 1500000 as Rp 1.500.000 with space and without decimals', () => {
      const formattedValue = formatCurrency(1500000, 'IDR');
      expect(formattedValue).toBe('Rp 1.500.000');
    });

    test('formats 0 as Rp 0 in IDR', () => {
      const formattedValue = formatCurrency(0, 'IDR');
      expect(formattedValue).toBe('Rp 0');
    });

    test('formats arbitrary number without decimals in IDR', () => {
      const formattedValue = formatCurrency(25000, 'IDR');
      expect(formattedValue).toBe('Rp 25.000');
    });

    test('accepts legacy Rp symbol and formats as IDR', () => {
      const formattedValue = formatCurrency(1500000, 'Rp');
      expect(formattedValue).toBe('Rp 1.500.000');
    });

    test('handles numeric strings as input for IDR', () => {
      const formattedValue = formatCurrency('1500000', 'IDR');
      expect(formattedValue).toBe('Rp 1.500.000');
    });
  });

  describe('Other currencies formatting (USD, EUR, CNY)', () => {
    test('formats USD with two decimal places and dollar symbol', () => {
      const formattedValue = formatCurrency(1500000, 'USD');
      expect(formattedValue).toBe('$1,500,000.00');
    });

    test('formats EUR with two decimal places and euro symbol', () => {
      const formattedValue = formatCurrency(1500000, 'EUR');
      expect(formattedValue).toBe('€1,500,000.00');
    });

    test('formats CNY with two decimal places and yuan symbol', () => {
      const formattedValue = formatCurrency(1500000, 'CNY');
      expect(formattedValue).toBe('¥1,500,000.00');
    });

    test('defaults to USD when currency code is omitted', () => {
      const formattedValue = formatCurrency(1500000);
      expect(formattedValue).toBe('$1,500,000.00');
    });

    test('supports legacy currency symbols ($ for USD, € for EUR, ¥ for CNY)', () => {
      expect(formatCurrency(100, '$')).toBe('$100.00');
      expect(formatCurrency(100, '€')).toBe('€100.00');
      expect(formatCurrency(100, '¥')).toBe('¥100.00');
    });

    test('falls back safely to USD without throwing RangeError for invalid or unrecognized currency codes', () => {
      expect(() => formatCurrency(100, 'INVALID_CODE')).not.toThrow();
      expect(formatCurrency(100, 'INVALID_CODE')).toBe('$100.00');
      expect(formatCurrency(100, 'UNKNOWN')).toBe('$100.00');
      expect(formatCurrency(100, null)).toBe('$100.00');
      expect(formatCurrency(100, '')).toBe('$100.00');
    });
  });

  describe('Canonical configuration driving formatter behavior', () => {
    test('retrieves and applies configuration properties from getCurrencyConfig', () => {
      const getCurrencyConfigSpy = vi.spyOn(currencyConfigModule, 'getCurrencyConfig');

      const formattedIdrValue = formatCurrency(50000, 'IDR');
      expect(getCurrencyConfigSpy).toHaveBeenCalledWith('IDR');
      expect(formattedIdrValue).toBe('Rp 50.000');

      const formattedUsdValue = formatCurrency(50, 'USD');
      expect(getCurrencyConfigSpy).toHaveBeenCalledWith('USD');
      expect(formattedUsdValue).toBe('$50.00');

      const formattedCnyValue = formatCurrency(50, 'CNY');
      expect(getCurrencyConfigSpy).toHaveBeenCalledWith('CNY');
      expect(formattedCnyValue).toBe('¥50.00');

      const formattedEurValue = formatCurrency(50, 'EUR');
      expect(getCurrencyConfigSpy).toHaveBeenCalledWith('EUR');
      expect(formattedEurValue).toBe('€50.00');

      getCurrencyConfigSpy.mockRestore();
    });

    test('passes canonical locale and fraction digits to Intl.NumberFormat', () => {
      const originalNumberFormat = Intl.NumberFormat;
      const intlNumberFormatSpy = vi.spyOn(Intl, 'NumberFormat').mockImplementation(
        function (...args) {
          return new originalNumberFormat(...args);
        }
      );

      formatCurrency(1234, 'IDR');
      expect(intlNumberFormatSpy).toHaveBeenCalledWith(
        currencyConfigModule.CURRENCY_CONFIGURATIONS.IDR.locale,
        expect.objectContaining({
          currency: 'IDR',
          minimumFractionDigits: currencyConfigModule.CURRENCY_CONFIGURATIONS.IDR.fractionDigits,
          maximumFractionDigits: currencyConfigModule.CURRENCY_CONFIGURATIONS.IDR.fractionDigits
        })
      );

      formatCurrency(1234, 'USD');
      expect(intlNumberFormatSpy).toHaveBeenCalledWith(
        currencyConfigModule.CURRENCY_CONFIGURATIONS.USD.locale,
        expect.objectContaining({
          currency: 'USD',
          minimumFractionDigits: currencyConfigModule.CURRENCY_CONFIGURATIONS.USD.fractionDigits,
          maximumFractionDigits: currencyConfigModule.CURRENCY_CONFIGURATIONS.USD.fractionDigits
        })
      );

      formatCurrency(1234, 'CNY');
      expect(intlNumberFormatSpy).toHaveBeenCalledWith(
        currencyConfigModule.CURRENCY_CONFIGURATIONS.CNY.locale,
        expect.objectContaining({
          currency: 'CNY',
          minimumFractionDigits: currencyConfigModule.CURRENCY_CONFIGURATIONS.CNY.fractionDigits,
          maximumFractionDigits: currencyConfigModule.CURRENCY_CONFIGURATIONS.CNY.fractionDigits
        })
      );

      formatCurrency(1234, 'EUR');
      expect(intlNumberFormatSpy).toHaveBeenCalledWith(
        currencyConfigModule.CURRENCY_CONFIGURATIONS.EUR.locale,
        expect.objectContaining({
          currency: 'EUR',
          minimumFractionDigits: currencyConfigModule.CURRENCY_CONFIGURATIONS.EUR.fractionDigits,
          maximumFractionDigits: currencyConfigModule.CURRENCY_CONFIGURATIONS.EUR.fractionDigits
        })
      );

      intlNumberFormatSpy.mockRestore();
    });
  });
});
