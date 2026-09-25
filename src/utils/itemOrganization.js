import { getLifecycleTranslationKey } from '../components/item-list/ItemCard';

export const HOME_ORGANIZATION_STORAGE_KEY = 'worthwhile.homeOrganization.v1';

export const OWNERSHIP_STATES = [
  'justJoined',
  'stillWithYou',
  'noLongerInUse',
  'changedHands',
  'lost',
];

export const GROUP_OPTIONS = ['ownershipState', 'category', 'none'];

export const SORT_OPTIONS = [
  'recentlyAcquired',
  'oldestOwned',
  'nameAscending',
  'nameDescending',
  'costDescending',
  'costAscending',
  'priceDescending',
  'priceAscending',
];

export const DEFAULT_HOME_ORGANIZATION = Object.freeze({
  stateFilters: [],
  groupBy: 'ownershipState',
  sortBy: 'recentlyAcquired',
});

const LIFECYCLE_KEY_TO_STATE = {
  statusActiveEarly: 'justJoined',
  statusActive: 'stillWithYou',
  statusRetired: 'noLongerInUse',
  statusSold: 'changedHands',
  statusLost: 'lost',
};

export const getItemOwnershipState = (item) => (
  LIFECYCLE_KEY_TO_STATE[getLifecycleTranslationKey(item?.status, item?.ownershipDays)]
  || 'stillWithYou'
);

export const normalizeHomeOrganization = (value) => {
  const stateFilters = Array.isArray(value?.stateFilters)
    ? [...new Set(value.stateFilters.filter((state) => OWNERSHIP_STATES.includes(state)))]
    : [];

  return {
    stateFilters: stateFilters.length === OWNERSHIP_STATES.length ? [] : stateFilters,
    groupBy: GROUP_OPTIONS.includes(value?.groupBy)
      ? value.groupBy
      : DEFAULT_HOME_ORGANIZATION.groupBy,
    sortBy: SORT_OPTIONS.includes(value?.sortBy)
      ? value.sortBy
      : DEFAULT_HOME_ORGANIZATION.sortBy,
  };
};

const resolveHomeOrganizationStorage = (storage) => {
  if (storage !== undefined) return storage;

  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
};

export const loadHomeOrganization = (storage) => {
  const resolvedStorage = resolveHomeOrganizationStorage(storage);
  if (!resolvedStorage) return { ...DEFAULT_HOME_ORGANIZATION };

  try {
    const storedValue = resolvedStorage.getItem(HOME_ORGANIZATION_STORAGE_KEY);
    return storedValue
      ? normalizeHomeOrganization(JSON.parse(storedValue))
      : { ...DEFAULT_HOME_ORGANIZATION };
  } catch {
    return { ...DEFAULT_HOME_ORGANIZATION };
  }
};

export const saveHomeOrganization = (organization, storage) => {
  const resolvedStorage = resolveHomeOrganizationStorage(storage);
  if (!resolvedStorage) return;

  try {
    resolvedStorage.setItem(
      HOME_ORGANIZATION_STORAGE_KEY,
      JSON.stringify(normalizeHomeOrganization(organization))
    );
  } catch {
    // Organization is a convenience preference; storage failures must not block Home.
  }
};

const numericValue = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const purchaseTimestamp = (item) => {
  const timestamp = new Date(item?.purchaseDate).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

export const sortItems = (items, sortBy, locale) => {
  const collator = new Intl.Collator(locale, { sensitivity: 'base', numeric: true });
  const comparisons = {
    recentlyAcquired: (first, second) => purchaseTimestamp(second) - purchaseTimestamp(first),
    oldestOwned: (first, second) => purchaseTimestamp(first) - purchaseTimestamp(second),
    nameAscending: (first, second) => collator.compare(first?.name || '', second?.name || ''),
    nameDescending: (first, second) => collator.compare(second?.name || '', first?.name || ''),
    costDescending: (first, second) => numericValue(second?.grossCostPerDay) - numericValue(first?.grossCostPerDay),
    costAscending: (first, second) => numericValue(first?.grossCostPerDay) - numericValue(second?.grossCostPerDay),
    priceDescending: (first, second) => numericValue(second?.price) - numericValue(first?.price),
    priceAscending: (first, second) => numericValue(first?.price) - numericValue(second?.price),
  };
  const compare = comparisons[sortBy] || comparisons.recentlyAcquired;

  return items
    .map((item, index) => ({ item, index }))
    .sort((first, second) => compare(first.item, second.item) || first.index - second.index)
    .map(({ item }) => item);
};

export const organizeItems = (items, organization, locale) => {
  const normalized = normalizeHomeOrganization(organization);
  const visibleItems = normalized.stateFilters.length === 0
    ? [...items]
    : items.filter((item) => normalized.stateFilters.includes(getItemOwnershipState(item)));

  if (normalized.groupBy === 'none') {
    return [{ key: 'all', items: sortItems(visibleItems, normalized.sortBy, locale) }];
  }

  const groups = new Map();
  visibleItems.forEach((item) => {
    const key = normalized.groupBy === 'ownershipState'
      ? getItemOwnershipState(item)
      : String(item?.category || '').trim() || 'uncategorized';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });

  const groupKeys = normalized.groupBy === 'ownershipState'
    ? OWNERSHIP_STATES.filter((state) => groups.has(state))
    : [...groups.keys()].sort((first, second) => {
      if (first === 'uncategorized') return 1;
      if (second === 'uncategorized') return -1;
      return new Intl.Collator(locale, { sensitivity: 'base', numeric: true }).compare(first, second);
    });

  return groupKeys.map((key) => ({
    key,
    items: sortItems(groups.get(key), normalized.sortBy, locale),
  }));
};
