import { describe, expect, test } from 'vitest';
import {
  apiRepositories,
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
