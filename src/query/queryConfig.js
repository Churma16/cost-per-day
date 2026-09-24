// Worthwhile's data changes relatively infrequently. Keep server data fresh for
// five minutes so route remounts can render from cache without an eager refetch.
export const SERVER_STATE_STALE_TIME = 5 * 60 * 1000;

export const queryKeys = {
  dashboard: ['dashboard'],
  items: ['items'],
  item: (itemId) => ['items', String(itemId)],
  plannedPurchases: ['planned-purchases'],
  durability: (filters = {}) => ['durability-analytics', filters],
  durabilityRoot: ['durability-analytics'],
  categories: ['categories'],
  brands: ['brands'],
  settings: ['settings'],
  valueEquivalents: ['value-equivalents'],
  replacementBenchmark: (itemId, price) => ['replacement-benchmark', String(itemId), Number(price)],
};
