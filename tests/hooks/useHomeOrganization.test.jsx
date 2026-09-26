import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useHomeOrganization } from '../../src/hooks/useHomeOrganization';
import { HOME_ORGANIZATION_STORAGE_KEY } from '../../src/utils/itemOrganization';

const createMemoryStorage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    clear: () => values.clear(),
  };
};

describe('useHomeOrganization', () => {
  let storage;

  beforeEach(() => {
    storage = createMemoryStorage();
    vi.stubGlobal('localStorage', storage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('owns persisted organization state and derives visible groups', () => {
    const items = [
      { id: '1', name: 'Camera', status: 'active', ownershipDays: 5, purchaseDate: '2026-09-20' },
      { id: '2', name: 'Headphones', status: 'lost', ownershipDays: 100, purchaseDate: '2026-01-01' },
    ];

    const { result } = renderHook(() => useHomeOrganization(items, 'en'));

    expect(result.current.visibleItemCount).toBe(2);
    expect(result.current.organizedGroups.map((group) => group.key)).toEqual(['justJoined', 'lost']);

    act(() => {
      result.current.setOrganization({
        stateFilters: ['lost'],
        groupBy: 'none',
        sortBy: 'nameAscending',
      });
    });

    expect(result.current.visibleItemCount).toBe(1);
    expect(result.current.organizedGroups[0].items.map((item) => item.id)).toEqual(['2']);
    expect(JSON.parse(storage.getItem(HOME_ORGANIZATION_STORAGE_KEY))).toEqual({
      stateFilters: ['lost'],
      groupBy: 'none',
      sortBy: 'nameAscending',
    });
  });
});
