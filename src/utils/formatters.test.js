import { formatCurrency } from './formatters';

describe('formatCurrency utility function', () => {
  describe('Indonesian Rupiah (IDR) formatting', () => {
    test('formats 1500000 as Rp1.500.000 without space and without decimals', () => {
      const formattedValue = formatCurrency(1500000, 'IDR');
      expect(formattedValue).toBe('Rp1.500.000');
    });

    test('formats 0 as Rp0 in IDR', () => {
      const formattedValue = formatCurrency(0, 'IDR');
      expect(formattedValue).toBe('Rp0');
    });

    test('formats arbitrary number without decimals in IDR', () => {
      const formattedValue = formatCurrency(25000, 'IDR');
      expect(formattedValue).toBe('Rp25.000');
    });

    test('accepts legacy Rp symbol and formats as IDR', () => {
      const formattedValue = formatCurrency(1500000, 'Rp');
      expect(formattedValue).toBe('Rp1.500.000');
    });

    test('handles numeric strings as input for IDR', () => {
      const formattedValue = formatCurrency('1500000', 'IDR');
      expect(formattedValue).toBe('Rp1.500.000');
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
});
