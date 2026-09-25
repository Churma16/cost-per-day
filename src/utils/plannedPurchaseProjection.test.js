import { describe, expect, it } from 'vitest';
import {
  ESTIMATED_DAYS_PER_MONTH,
  calculateContributionProjection,
  calculateTargetDateProjection,
  cadenceToEstimatedDays,
} from './plannedPurchaseProjection';

describe('plannedPurchaseProjection', () => {
  describe('calculateContributionProjection', () => {
    it('matches backend daily cadence semantics', () => {
      expect(
        calculateContributionProjection({
          targetPrice: 100,
          contributionAmount: 30,
          cadence: 'daily',
        })
      ).toEqual({
        periods: 4,
        estimatedDays: 4,
      });
    });

    it('matches backend weekly cadence semantics', () => {
      expect(
        calculateContributionProjection({
          targetPrice: 100,
          contributionAmount: 30,
          cadence: 'weekly',
        })
      ).toEqual({
        periods: 4,
        estimatedDays: 28,
      });
    });

    it('matches backend monthly cadence semantics using the 365 / 12 approximation', () => {
      expect(
        calculateContributionProjection({
          targetPrice: 1200,
          contributionAmount: 100,
          cadence: 'monthly',
        })
      ).toEqual({
        periods: 12,
        estimatedDays: 365,
      });

      expect(ESTIMATED_DAYS_PER_MONTH).toBe(365 / 12);
    });

    it('ceil partial periods before cadence-to-day conversion', () => {
      expect(
        calculateContributionProjection({
          targetPrice: 100,
          contributionAmount: 30,
          cadence: 'monthly',
        })
      ).toEqual({
        periods: 4,
        estimatedDays: 122,
      });

      expect(cadenceToEstimatedDays(3.2, 'weekly')).toBe(28);
    });

    it('returns null for invalid target prices, contributions, or cadence values', () => {
      expect(
        calculateContributionProjection({
          targetPrice: 0,
          contributionAmount: 10,
          cadence: 'daily',
        })
      ).toBeNull();

      expect(
        calculateContributionProjection({
          targetPrice: 100,
          contributionAmount: 0,
          cadence: 'daily',
        })
      ).toBeNull();

      expect(
        calculateContributionProjection({
          targetPrice: 100,
          contributionAmount: 10,
          cadence: 'hourly',
        })
      ).toBeNull();
    });
  });

  describe('calculateTargetDateProjection', () => {
    it('uses deterministic UTC date boundaries and matches backend contribution framing', () => {
      const projection = calculateTargetDateProjection({
        targetPrice: 290,
        targetDate: '2028-03-01',
        asOf: new Date('2028-02-01T10:00:00Z'),
      });

      expect(projection.daysRemaining).toBe(29);
      expect(projection.daily).toBeCloseTo(10);
      expect(projection.weekly).toBeCloseTo(70);
      expect(projection.monthly).toBeCloseTo(10 * (365 / 12));
    });

    it('enforces the existing minimum one-day behavior', () => {
      const projection = calculateTargetDateProjection({
        targetPrice: 120,
        targetDate: '2028-03-02',
        asOf: new Date('2028-03-01T18:00:00Z'),
      });

      expect(projection).toEqual({
        daysRemaining: 1,
        daily: 120,
        weekly: 840,
        monthly: 120 * (365 / 12),
      });
    });

    it('returns null for invalid or zero target prices and invalid target dates', () => {
      expect(
        calculateTargetDateProjection({
          targetPrice: 0,
          targetDate: '2028-03-01',
          asOf: new Date('2028-02-01T00:00:00Z'),
        })
      ).toBeNull();

      expect(
        calculateTargetDateProjection({
          targetPrice: 100,
          targetDate: 'not-a-date',
          asOf: new Date('2028-02-01T00:00:00Z'),
        })
      ).toBeNull();
    });
  });
});
