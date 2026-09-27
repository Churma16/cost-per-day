import { describe, expect, test } from 'vitest';
import {
  apiRepositories,
  assertGuestCapacity,
  GuestLimitError,
  guestRepositories,
  selectPersistenceRepositories,
} from '../../src/data/persistenceRepositories';

describe('persistence repository selection', () => {
  test('selects IndexedDB-backed guest repositories only for guest mode', () => {
    expect(selectPersistenceRepositories({ user: null, isGuest: true })).toBe(guestRepositories);
  });

  test('selects API repositories for authenticated users even when a guest marker still exists', () => {
    expect(selectPersistenceRepositories({
      user: { id: 'user-1' },
      isGuest: true,
    })).toBe(apiRepositories);
  });

  test('selects no data source before auth state resolves into a usable mode', () => {
    expect(selectPersistenceRepositories({ user: null, isGuest: false })).toBeNull();
  });
});


describe('guest product limits', () => {
  test('allows up to ten owned items and points the eleventh item toward sign-in', () => {
    expect(() => assertGuestCapacity('item', 9)).not.toThrow();
    expect(() => assertGuestCapacity('item', 10)).toThrow(GuestLimitError);
    expect(() => assertGuestCapacity('item', 10)).toThrow(/Sign in to keep your history/i);
    expect(new GuestLimitError('item', 10)).toMatchObject({
      code: 'guest_item_limit',
      limit: 10,
    });
  });

  test('allows up to five planned purchases and points the sixth plan toward sign-in', () => {
    expect(() => assertGuestCapacity('planned', 4)).not.toThrow();
    expect(() => assertGuestCapacity('planned', 5)).toThrow(GuestLimitError);
    expect(() => assertGuestCapacity('planned', 5)).toThrow(/Sign in to keep your plans/i);
    expect(new GuestLimitError('planned', 5)).toMatchObject({
      code: 'guest_planned_purchase_limit',
      limit: 5,
    });
  });

  test('allows up to three value equivalents and points the fourth toward sign-in', () => {
    expect(() => assertGuestCapacity('equivalent', 2)).not.toThrow();
    expect(() => assertGuestCapacity('equivalent', 3)).toThrow(GuestLimitError);
    expect(() => assertGuestCapacity('equivalent', 3)).toThrow(/Sign in to save more/i);
    expect(new GuestLimitError('equivalent', 3)).toMatchObject({
      code: 'guest_value_equivalent_limit',
      limit: 3,
    });
  });
});
