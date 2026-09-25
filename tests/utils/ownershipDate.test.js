import { describe, expect, test } from 'vitest';
import {
  currentUTCDateOnly,
  dateOnlyToOwnershipDate,
  dateOnlyToOwnershipTimestamp,
  normalizeOwnershipDate,
  ownershipDateToDateOnly,
} from '../../src/utils/ownershipDate';

describe('ownershipDate', () => {
  test('normalizes ownership dates to noon UTC without changing the current UTC calendar day', () => {
    expect(normalizeOwnershipDate(new Date('2026-09-25T03:45:12.000Z')).toISOString())
      .toBe('2026-09-25T12:00:00.000Z');
  });

  test('round-trips a date-only value without shifting the ownership day', () => {
    const dateOnly = '2026-09-25';

    expect(dateOnlyToOwnershipTimestamp(dateOnly)).toBe('2026-09-25T12:00:00.000Z');
    expect(ownershipDateToDateOnly(dateOnlyToOwnershipDate(dateOnly))).toBe(dateOnly);
  });

  test('uses UTC semantics for timestamps originating from UTC-positive offsets', () => {
    const timestamp = '2026-09-25T00:30:00+14:00';

    expect(ownershipDateToDateOnly(timestamp)).toBe('2026-09-24');
    expect(normalizeOwnershipDate(new Date(timestamp)).toISOString())
      .toBe('2026-09-24T12:00:00.000Z');
  });

  test('uses UTC semantics for timestamps originating from UTC-negative offsets', () => {
    const timestamp = '2026-09-25T23:30:00-10:00';

    expect(ownershipDateToDateOnly(timestamp)).toBe('2026-09-26');
    expect(normalizeOwnershipDate(new Date(timestamp)).toISOString())
      .toBe('2026-09-26T12:00:00.000Z');
  });

  test('derives the current date-only value from UTC time', () => {
    expect(currentUTCDateOnly(new Date('2026-09-25T23:30:00-10:00')))
      .toBe('2026-09-26');
  });

  test('returns an empty input value for invalid ownership dates', () => {
    expect(ownershipDateToDateOnly(new Date('invalid'))).toBe('');
  });
});
