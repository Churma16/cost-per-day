import {
  DEFAULT_HOME_ORGANIZATION,
  HOME_ORGANIZATION_STORAGE_KEY,
  getItemOwnershipState,
  loadHomeOrganization,
  normalizeHomeOrganization,
  organizeItems,
  saveHomeOrganization,
} from '../../src/utils/itemOrganization';

const items = [
  { id: '1', name: 'Zebra', category: 'Tech', status: 'active', ownershipDays: 5, purchaseDate: '2026-09-20', grossCostPerDay: 10, price: 100 },
  { id: '2', name: 'Alpha', category: 'Audio', status: 'active', ownershipDays: 100, purchaseDate: '2025-01-01', grossCostPerDay: 2, price: 300 },
  { id: '3', name: 'Bravo', category: 'Tech', status: 'sold', ownershipDays: 50, purchaseDate: '2024-01-01', grossCostPerDay: 4, price: 200 },
  { id: '4', name: 'Cable', category: '', status: 'lost', ownershipDays: 20, purchaseDate: '2023-01-01', grossCostPerDay: 1, price: 20 },
  { id: '5', name: 'Desk', category: 'Audio', status: 'retired', ownershipDays: 300, purchaseDate: '2022-01-01', grossCostPerDay: 3, price: 50 },
];

describe('item organization', () => {
  const createMemoryStorage = () => {
    const values = new Map();
    return {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, String(value)),
    };
  };

  test('uses derived human lifecycle phases without creating a new backend state', () => {
    expect(getItemOwnershipState(items[0])).toBe('justJoined');
    expect(getItemOwnershipState(items[1])).toBe('stillWithYou');
    expect(getItemOwnershipState(items[2])).toBe('changedHands');
    expect(getItemOwnershipState(items[3])).toBe('lost');
    expect(getItemOwnershipState(items[4])).toBe('noLongerInUse');
  });

  test('defaults to semantic ownership groups with recently acquired sorting inside groups', () => {
    const groups = organizeItems([
      ...items,
      { id: '6', name: 'Older Tech', status: 'active', ownershipDays: 3, purchaseDate: '2026-09-01', grossCostPerDay: 20, price: 400 },
    ], DEFAULT_HOME_ORGANIZATION, 'en');

    expect(groups.map((group) => group.key)).toEqual([
      'justJoined', 'stillWithYou', 'noLongerInUse', 'changedHands', 'lost',
    ]);
    expect(groups[0].items.map((item) => item.id)).toEqual(['1', '6']);
  });

  test('filters before grouping and sorting, including multiple states', () => {
    const groups = organizeItems(items, {
      stateFilters: ['justJoined', 'changedHands'],
      groupBy: 'category',
      sortBy: 'nameAscending',
    }, 'en');

    expect(groups.map((group) => group.key)).toEqual(['Tech']);
    expect(groups[0].items.map((item) => item.name)).toEqual(['Bravo', 'Zebra']);
  });

  test('orders category headings alphabetically, puts uncategorized last, and sorts within each group', () => {
    const groups = organizeItems(items, {
      stateFilters: [],
      groupBy: 'category',
      sortBy: 'priceDescending',
    }, 'en');

    expect(groups.map((group) => group.key)).toEqual(['Audio', 'Tech', 'uncategorized']);
    expect(groups[0].items.map((item) => item.name)).toEqual(['Alpha', 'Desk']);
    expect(groups[1].items.map((item) => item.name)).toEqual(['Bravo', 'Zebra']);
  });

  test.each([
    ['oldestOwned', ['Desk', 'Cable', 'Bravo', 'Alpha', 'Zebra']],
    ['nameAscending', ['Alpha', 'Bravo', 'Cable', 'Desk', 'Zebra']],
    ['nameDescending', ['Zebra', 'Desk', 'Cable', 'Bravo', 'Alpha']],
    ['costDescending', ['Zebra', 'Bravo', 'Desk', 'Alpha', 'Cable']],
    ['costAscending', ['Cable', 'Alpha', 'Desk', 'Bravo', 'Zebra']],
    ['priceDescending', ['Alpha', 'Bravo', 'Zebra', 'Desk', 'Cable']],
    ['priceAscending', ['Cable', 'Desk', 'Zebra', 'Bravo', 'Alpha']],
  ])('sorts the ungrouped list using %s', (sortBy, expectedNames) => {
    const [group] = organizeItems(items, { stateFilters: [], groupBy: 'none', sortBy }, 'en');
    expect(group.items.map((item) => item.name)).toEqual(expectedNames);
  });

  test('normalizes invalid and effectively-all selections and persists valid preferences', () => {
    expect(normalizeHomeOrganization({
      stateFilters: ['justJoined', 'stillWithYou', 'noLongerInUse', 'changedHands', 'lost'],
      groupBy: 'invalid',
      sortBy: 'invalid',
    })).toEqual(DEFAULT_HOME_ORGANIZATION);

    const storage = createMemoryStorage();
    const preference = { stateFilters: ['lost'], groupBy: 'none', sortBy: 'nameAscending' };
    saveHomeOrganization(preference, storage);
    expect(JSON.parse(storage.getItem(HOME_ORGANIZATION_STORAGE_KEY))).toEqual(preference);
    expect(loadHomeOrganization(storage)).toEqual(preference);

    storage.setItem(HOME_ORGANIZATION_STORAGE_KEY, '{not json');
    expect(loadHomeOrganization(storage)).toEqual(DEFAULT_HOME_ORGANIZATION);
  });
});
