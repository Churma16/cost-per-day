import { describe, it, expect } from 'vitest';
import {
  formatCurrencyInputValue,
  parseCurrencyInputValue,
  getCurrencyInputSeparators,
  calculateAdjustedCursorPosition
} from './currencyInput';

describe('currencyInput utilities', () => {
  describe('getCurrencyInputSeparators', () => {
    it('provides dot as thousand separator, no decimals, and 10 max integer digits for IDR', () => {
      const idrSeparators = getCurrencyInputSeparators('IDR');
      expect(idrSeparators.groupSeparator).toBe('.');
      expect(idrSeparators.supportsDecimals).toBe(false);
      expect(idrSeparators.fractionDigits).toBe(0);
      expect(idrSeparators.maxIntegerDigits).toBe(10);
    });

    it('provides comma as thousand separator, dot for decimals, and 9 max integer digits for USD', () => {
      const usdSeparators = getCurrencyInputSeparators('USD');
      expect(usdSeparators.groupSeparator).toBe(',');
      expect(usdSeparators.decimalSeparator).toBe('.');
      expect(usdSeparators.supportsDecimals).toBe(true);
      expect(usdSeparators.fractionDigits).toBe(2);
      expect(usdSeparators.maxIntegerDigits).toBe(9);
    });
  });

  describe('formatCurrencyInputValue for IDR (Rupiah)', () => {
    it('formats plain number strings with thousand separators (dots)', () => {
      expect(formatCurrencyInputValue('1000', 'IDR')).toBe('1.000');
      expect(formatCurrencyInputValue('50000', 'IDR')).toBe('50.000');
      expect(formatCurrencyInputValue('1000000', 'IDR')).toBe('1.000.000');
      expect(formatCurrencyInputValue('15000000', 'IDR')).toBe('15.000.000');
      expect(formatCurrencyInputValue('123456789', 'IDR')).toBe('123.456.789');
    });

    it('handles numeric types correctly', () => {
      expect(formatCurrencyInputValue(500000, 'IDR')).toBe('500.000');
      expect(formatCurrencyInputValue(0, 'IDR')).toBe('0');
    });

    it('strips non-numeric characters before formatting', () => {
      expect(formatCurrencyInputValue('Rp 25.000', 'IDR')).toBe('25.000');
      expect(formatCurrencyInputValue('abc12000xyz', 'IDR')).toBe('12.000');
    });

    it('returns empty string for empty, null, or undefined values', () => {
      expect(formatCurrencyInputValue('', 'IDR')).toBe('');
      expect(formatCurrencyInputValue(null, 'IDR')).toBe('');
      expect(formatCurrencyInputValue(undefined, 'IDR')).toBe('');
    });
  });

  describe('formatCurrencyInputValue for USD', () => {
    it('formats plain number strings with comma thousand separators', () => {
      expect(formatCurrencyInputValue('1000', 'USD')).toBe('1,000');
      expect(formatCurrencyInputValue('1500000', 'USD')).toBe('1,500,000');
    });

    it('preserves decimals up to 2 fraction digits', () => {
      expect(formatCurrencyInputValue('1234.5', 'USD')).toBe('1,234.5');
      expect(formatCurrencyInputValue('1234.56', 'USD')).toBe('1,234.56');
      expect(formatCurrencyInputValue('1234.567', 'USD')).toBe('1,234.56');
    });

    it('preserves trailing dot while typing', () => {
      expect(formatCurrencyInputValue('1234.', 'USD')).toBe('1,234.');
    });

    it('clamps integer digits when maximumIntegerDigits is provided', () => {
      expect(formatCurrencyInputValue('1234567890123', 'IDR', 10)).toBe('1.234.567.890');
      expect(formatCurrencyInputValue('1234567890123.45', 'USD', 9)).toBe('123,456,789.45');
    });
  });

  describe('parseCurrencyInputValue', () => {
    it('extracts raw numeric string for IDR without thousand separators', () => {
      expect(parseCurrencyInputValue('15.000.000', 'IDR')).toBe('15000000');
      expect(parseCurrencyInputValue('1.000', 'IDR')).toBe('1000');
      expect(parseCurrencyInputValue('Rp 500.000', 'IDR')).toBe('500000');
      expect(parseCurrencyInputValue('500', 'IDR')).toBe('500');
      expect(parseCurrencyInputValue('0', 'IDR')).toBe('0');
      expect(parseCurrencyInputValue('', 'IDR')).toBe('');
    });

    it('handles sequential typing in IDR without corrupting numeric values when appending zeros', () => {
      // User has '1.000' and types '0' -> browser value is '1.0000'
      const parsedWithAppendedZero = parseCurrencyInputValue('1.0000', 'IDR');
      expect(parsedWithAppendedZero).toBe('10000');
      expect(Number(parsedWithAppendedZero)).toBe(10000);
      expect(formatCurrencyInputValue(parsedWithAppendedZero, 'IDR')).toBe('10.000');

      // User has '10.000' and types '0' -> browser value is '10.0000'
      const parsedNextStep = parseCurrencyInputValue('10.0000', 'IDR');
      expect(parsedNextStep).toBe('100000');
      expect(Number(parsedNextStep)).toBe(100000);
      expect(formatCurrencyInputValue(parsedNextStep, 'IDR')).toBe('100.000');

      // User has '100.000' and types '0' -> browser value is '100.0000'
      const parsedMillion = parseCurrencyInputValue('100.0000', 'IDR');
      expect(parsedMillion).toBe('1000000');
      expect(Number(parsedMillion)).toBe(1000000);
      expect(formatCurrencyInputValue(parsedMillion, 'IDR')).toBe('1.000.000');
    });

    it('handles editing in the middle of a formatted IDR value without corruption', () => {
      // Formatted value is '100.000'. User inserts '5' after '10' -> '1050.000'
      const parsedMiddleEdit = parseCurrencyInputValue('1050.000', 'IDR');
      expect(parsedMiddleEdit).toBe('1050000');
      expect(Number(parsedMiddleEdit)).toBe(1050000);
      expect(formatCurrencyInputValue(parsedMiddleEdit, 'IDR')).toBe('1.050.000');
    });

    it('extracts raw numeric string for USD removing commas while keeping decimals', () => {
      expect(parseCurrencyInputValue('1,234.56', 'USD')).toBe('1234.56');
      expect(parseCurrencyInputValue('$1,500,000', 'USD')).toBe('1500000');
      expect(parseCurrencyInputValue('', 'USD')).toBe('');
    });

    it('clamps integer digits when maximumIntegerDigits is provided', () => {
      expect(parseCurrencyInputValue('12.345.678.901.234', 'IDR', 10)).toBe('1234567890');
      expect(parseCurrencyInputValue('123,456,789,012.34', 'USD', 9)).toBe('123456789.34');
    });
  });

  describe('calculateAdjustedCursorPosition', () => {
    it('maintains correct cursor offset when group separators are inserted', () => {
      // User typed '0' to make '1000' which formatted to '1.000'
      // Cursor was right after the 4th digit (count = 4)
      const newFormattedValue = '1.000';
      const adjustedPosition = calculateAdjustedCursorPosition(4, newFormattedValue, '.');
      expect(adjustedPosition).toBe(5); // right at the end of '1.000'
    });

    it('maintains correct cursor in the middle of a formatted string', () => {
      // Value is '15.000.000'. User cursor is after '15' (2 digits)
      const adjustedPosition = calculateAdjustedCursorPosition(2, '15.000.000', '.');
      expect(adjustedPosition).toBe(2); // right before the first dot
    });

    it('handles 0 digits before cursor', () => {
      expect(calculateAdjustedCursorPosition(0, '1.000', '.')).toBe(0);
    });
  });
});
