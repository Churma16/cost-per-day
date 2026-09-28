import { describe, expect, it } from 'vitest';
import {
  buildOwnershipJourney,
  getOwnershipJourneyContext,
} from '../../src/utils/itemLineage';

describe('itemLineage', () => {
  const items = [
    {
      id: 'oldest',
      name: 'Headphones Gen 1',
      purchaseDate: '2024-01-01T12:00:00Z',
      status: 'retired',
    },
    {
      id: 'middle',
      name: 'Headphones Gen 2',
      purchaseDate: '2025-01-01T12:00:00Z',
      status: 'retired',
      replacesItemId: 'oldest',
    },
    {
      id: 'current',
      name: 'Headphones Gen 3',
      purchaseDate: '2026-01-01T12:00:00Z',
      status: 'active',
      replacesItemId: 'middle',
    },
  ];

  it('derives direct predecessor and successor without persisting reverse lineage', () => {
    expect(getOwnershipJourneyContext(items, items[1])).toEqual({
      previousItem: items[0],
      nextItems: [items[2]],
      hasJourney: true,
    });
  });

  it('builds the available multi-generation ownership journey from replacesItemId', () => {
    expect(buildOwnershipJourney(items, items[1]).map((item) => item.id)).toEqual([
      'oldest',
      'middle',
      'current',
    ]);
  });

  it('returns no journey for an unrelated item', () => {
    const unrelated = {
      id: 'standalone',
      name: 'Standalone item',
      status: 'active',
    };

    expect(getOwnershipJourneyContext([...items, unrelated], unrelated)).toEqual({
      previousItem: null,
      nextItems: [],
      hasJourney: false,
    });
    expect(buildOwnershipJourney([...items, unrelated], unrelated)).toEqual([
      unrelated,
    ]);
  });

  it('stops safely when malformed historical data contains a cycle', () => {
    const malformedItems = [
      { id: 'a', name: 'A', replacesItemId: 'b' },
      { id: 'b', name: 'B', replacesItemId: 'a' },
    ];

    expect(buildOwnershipJourney(malformedItems, malformedItems[0]).map((item) => item.id))
      .toEqual(['b', 'a']);
  });
});
