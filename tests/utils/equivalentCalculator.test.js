import { describe, it, expect } from 'vitest';
import {
  calculateDerivedEquivalentValues,
  formatEquivalentQuantity,
  formatEquivalentCandidate,
  selectBestEquivalent,
  PRESENTATION_MODES,
  DAYS_IN_MONTH_CONVENTION
} from '../../src/utils/equivalentCalculator';

describe('equivalentCalculator', () => {
  describe('calculateDerivedEquivalentValues', () => {
    it('accurately derives units per day, days per unit, and units per 30-day month', () => {
      const derived = calculateDerivedEquivalentValues(5000, 2500);

      expect(derived).not.toBeNull();
      expect(derived.unitsPerDay).toBe(2);
      expect(derived.daysPerUnit).toBe(0.5);
      expect(derived.unitsPerMonth).toBe((5000 * DAYS_IN_MONTH_CONVENTION) / 2500);
      expect(derived.unitsPerMonth).toBe(60);
    });

    it('returns null for zero, negative, non-finite, or missing inputs', () => {
      expect(calculateDerivedEquivalentValues(0, 2500)).toBeNull();
      expect(calculateDerivedEquivalentValues(-100, 2500)).toBeNull();
      expect(calculateDerivedEquivalentValues(5000, 0)).toBeNull();
      expect(calculateDerivedEquivalentValues(5000, -2500)).toBeNull();
      expect(calculateDerivedEquivalentValues(NaN, 2500)).toBeNull();
      expect(calculateDerivedEquivalentValues(5000, Infinity)).toBeNull();
      expect(calculateDerivedEquivalentValues(null, undefined)).toBeNull();
    });
  });

  describe('formatEquivalentQuantity', () => {
    it('formats whole numbers and near-whole numbers as integers without decimals', () => {
      expect(formatEquivalentQuantity(1)).toBe('1');
      expect(formatEquivalentQuantity(2.0)).toBe('2');
      expect(formatEquivalentQuantity(3.02)).toBe('3');
      expect(formatEquivalentQuantity(4.99)).toBe('5');
    });

    it('formats fractional values with at most one decimal digit', () => {
      expect(formatEquivalentQuantity(1.5)).toBe('1.5');
      expect(formatEquivalentQuantity(7.54)).toBe('7.5');
      expect(formatEquivalentQuantity(2.3333)).toBe('2.3');
    });

    it('handles zero or non-finite inputs gracefully', () => {
      expect(formatEquivalentQuantity(0)).toBe('0');
      expect(formatEquivalentQuantity(-1)).toBe('0');
      expect(formatEquivalentQuantity(NaN)).toBe('0');
    });
  });

  describe('formatEquivalentCandidate presentation rules', () => {
    it('formats daily units when unitsPerDay >= 1', () => {
      const derived = calculateDerivedEquivalentValues(5000, 2500);
      const equivalent = { name: 'gorengan' };

      const candidate = formatEquivalentCandidate(derived, equivalent);
      expect(candidate.mode).toBe(PRESENTATION_MODES.DAILY_UNITS);
      expect(candidate.text).toBe('2 gorengan/day');
    });

    it('favors "1 unit every N days" over small decimal values when unitsPerDay < 1', () => {
      // 1.000 / 5.000 = 0.2 units/day -> avoid 0.2 gorengan/day, prefer 1 gorengan every 5 days
      const derived = calculateDerivedEquivalentValues(1000, 5000);
      const equivalent = { name: 'gorengan' };

      const candidate = formatEquivalentCandidate(derived, equivalent);
      expect(candidate.mode).toBe(PRESENTATION_MODES.EVERY_N_DAYS);
      expect(candidate.daysCount).toBe(5);
      expect(candidate.text).toBe('1 gorengan every 5 days');
    });

    it('formats monthly phrasing when units per day is low but monthly units >= 1 and days > 14', () => {
      // cost 1.000/day, equivalent 20.000 (mie ayam) -> daysPerUnit = 20, unitsPerMonth = 1.5
      const derived = calculateDerivedEquivalentValues(1000, 20000);
      const equivalent = { name: 'mie ayam' };

      const candidate = formatEquivalentCandidate(derived, equivalent);
      expect(candidate.mode).toBe(PRESENTATION_MODES.MONTHLY_UNITS);
      expect(candidate.text).toBe('1.5 mie ayam/month');
    });

    it('integrates with custom translation function if provided', () => {
      const mockT = (key, params) => {
        if (key === 'equivalentEveryNDays') {
          return `1 ${params.name} setiap ${params.count} hari`;
        }
        if (key === 'equivalentPerDay') {
          return `${params.count} ${params.name}/hari`;
        }
        if (key === 'equivalentPerMonth') {
          return `${params.count} ${params.name}/bulan`;
        }
        return '';
      };

      const derivedDaily = calculateDerivedEquivalentValues(5000, 2500);
      const dailyCandidate = formatEquivalentCandidate(derivedDaily, { name: 'gorengan' }, mockT);
      expect(dailyCandidate.text).toBe('2 gorengan/hari');

      const derivedEveryN = calculateDerivedEquivalentValues(1335, 2500);
      const everyNCandidate = formatEquivalentCandidate(derivedEveryN, { name: 'gorengan' }, mockT);
      expect(everyNCandidate.text).toBe('1 gorengan setiap 2 hari');
    });
  });

  describe('selectBestEquivalent', () => {
    const userEquivalents = [
      { id: '1', name: 'Gorengan', amount: 2500, currencyCode: 'IDR' },
      { id: '2', name: 'Coffee', amount: 15000, currencyCode: 'IDR' },
      { id: '3', name: 'Mie ayam', amount: 20000, currencyCode: 'IDR' },
      { id: '4', name: 'Bensin 1 liter', amount: 13000, currencyCode: 'IDR' },
      { id: '5', name: 'Espresso', amount: 3.5, currencyCode: 'USD' }
    ];

    it('strictly filters out currency mismatches and returns null if no equivalent matches active currency', () => {
      // Item has EUR currency, user only has IDR and USD
      const result = selectBestEquivalent(10, userEquivalents, 'EUR');
      expect(result).toBeNull();
    });

    it('never silently converts between currencies without explicit exchange mechanism', () => {
      // Item has USD currency, IDR equivalents must be completely ignored
      const result = selectBestEquivalent(7, userEquivalents, 'USD');
      expect(result).not.toBeNull();
      expect(result.equivalent.name).toBe('Espresso');
      expect(result.equivalent.currencyCode).toBe('USD');
      expect(result.text).toBe('2 Espresso/day');
    });

    it('selects the most relatable equivalent for active item cost-per-day', () => {
      // Rp5.000/day matches Gorengan (2.500) perfectly: 2 Gorengan/day
      const result = selectBestEquivalent(5000, userEquivalents, 'IDR');
      expect(result).not.toBeNull();
      expect(result.equivalent.name).toBe('Gorengan');
      expect(result.text).toBe('2 Gorengan/day');
    });

    it('selects readable "every N days" equivalent for items with lower daily cost', () => {
      // Rp1.335/day with Gorengan (Rp2.500) -> 2.500 / 1.335 ≈ 1.87 days -> 1 Gorengan every 2 days
      const result = selectBestEquivalent(1335, userEquivalents, 'IDR');
      expect(result).not.toBeNull();
      expect(result.equivalent.name).toBe('Gorengan');
      expect(result.text).toBe('1 Gorengan every 2 days');
    });

    it('returns null if costPerDay is zero or negative', () => {
      expect(selectBestEquivalent(0, userEquivalents, 'IDR')).toBeNull();
      expect(selectBestEquivalent(-500, userEquivalents, 'IDR')).toBeNull();
    });

    it('returns null if equivalents list is empty or undefined', () => {
      expect(selectBestEquivalent(5000, [], 'IDR')).toBeNull();
      expect(selectBestEquivalent(5000, null, 'IDR')).toBeNull();
    });

    it('breaks ties deterministically by name', () => {
      const tiedEquivalents = [
        { id: '2', name: 'Z Item', amount: 5000, currencyCode: 'IDR' },
        { id: '1', name: 'A Item', amount: 5000, currencyCode: 'IDR' }
      ];

      const result = selectBestEquivalent(5000, tiedEquivalents, 'IDR');
      expect(result).not.toBeNull();
      expect(result.equivalent.name).toBe('A Item');
    });
  });
});
