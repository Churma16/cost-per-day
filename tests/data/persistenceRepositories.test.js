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
});
