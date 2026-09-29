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
    const journey = buildOwnershipJourney(items, items[1]);

    expect(journey.ancestors.map((item) => item.id)).toEqual(['oldest']);
    expect(journey.currentItem.id).toBe('middle');
    expect(journey.successors).toEqual([
      {
        item: items[2],
        successors: [],
      },
    ]);
  });

  it('preserves branched successors as siblings instead of inventing a linear chain', () => {
    const branchedItems = [
      {
        id: 'a',
        name: 'Item A',
        purchaseDate: '2024-01-01T12:00:00Z',
      },
      {
        id: 'b',
        name: 'Item B',
        purchaseDate: '2025-01-01T12:00:00Z',
        replacesItemId: 'a',
      },
      {
        id: 'c',
        name: 'Item C',
        purchaseDate: '2025-02-01T12:00:00Z',
        replacesItemId: 'a',
      },
      {
        id: 'd',
        name: 'Item D',
        purchaseDate: '2026-01-01T12:00:00Z',
        replacesItemId: 'b',
      },
    ];

    const journey = buildOwnershipJourney(branchedItems, branchedItems[0]);

    expect(journey.ancestors).toEqual([]);
    expect(journey.currentItem.id).toBe('a');
    expect(journey.successors.map((node) => node.item.id)).toEqual(['b', 'c']);
    expect(journey.successors[0].successors.map((node) => node.item.id)).toEqual(['d']);
    expect(journey.successors[1].successors).toEqual([]);

    // C remains a sibling of B. It is never represented as B's successor.
    expect(journey.successors[0].successors.map((node) => node.item.id))
      .not.toContain('c');
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

    expect(buildOwnershipJourney([...items, unrelated], unrelated)).toEqual({
      ancestors: [],
      currentItem: unrelated,
      successors: [],
    });
  });

  it('stops safely when malformed historical data contains a cycle', () => {
    const malformedItems = [
      { id: 'a', name: 'A', replacesItemId: 'b' },
      { id: 'b', name: 'B', replacesItemId: 'a' },
    ];

    const journey = buildOwnershipJourney(malformedItems, malformedItems[0]);

    expect(journey.ancestors.map((item) => item.id)).toEqual(['b']);
    expect(journey.currentItem.id).toBe('a');
    expect(journey.successors).toEqual([]);
  });
});
