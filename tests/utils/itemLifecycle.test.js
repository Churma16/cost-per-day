import {
  formatOwnershipDuration,
  getLifecycleTranslationKey,
  getNextDurationUnit,
} from '../../src/utils/itemLifecycle';

describe('item lifecycle utilities', () => {
  test('derives age-aware lifecycle translation keys without React dependencies', () => {
    expect(getLifecycleTranslationKey('active', 1)).toBe('statusActiveEarly');
    expect(getLifecycleTranslationKey('active', 14)).toBe('statusActiveEarly');
    expect(getLifecycleTranslationKey('active', 15)).toBe('statusActive');
    expect(getLifecycleTranslationKey('retired', 8)).toBe('statusRetired');
    expect(getLifecycleTranslationKey('sold', 8)).toBe('statusSold');
    expect(getLifecycleTranslationKey('lost', 8)).toBe('statusLost');
    expect(getLifecycleTranslationKey('unknown', 30)).toBe('statusActive');
  });

  test('cycles duration units at the existing ownership thresholds', () => {
    expect(getNextDurationUnit('months', 14)).toBe('days');
    expect(getNextDurationUnit('days', 100)).toBe('months');
    expect(getNextDurationUnit('months', 100)).toBe('days');
    expect(getNextDurationUnit('days', 400)).toBe('months');
    expect(getNextDurationUnit('months', 400)).toBe('years');
    expect(getNextDurationUnit('years', 400)).toBe('days');
  });

  test('formats ownership duration independently of ItemCard', () => {
    const t = (key) => ({ unitDays: 'days', unitMonths: 'months', unitYears: 'years' }[key] || key);
    const tId = (key) => ({ unitDays: 'hari', unitMonths: 'bulan', unitYears: 'tahun' }[key] || key);

    expect(formatOwnershipDuration(1, 'days', t, 'en')).toBe('1 day');
    expect(formatOwnershipDuration(200, 'months', t, 'en')).toBe('~6.6 months');
    expect(formatOwnershipDuration(730, 'years', t, 'en')).toBe('~2 years');
    expect(formatOwnershipDuration(200, 'months', tId, 'id')).toBe('~6,6 bulan');
  });
});
