import {
  addItem,
  deleteItem,
  getAllItems,
  replaceAllItems,
  updateItem,
} from '../services/api';
import {
  createPlannedPurchase,
  deletePlannedPurchase,
  fetchPlannedPurchases,
  updatePlannedPurchase,
} from '../services/plannedPurchaseService';

export const GUEST_ITEM_LIMIT = 5;
export const GUEST_PLANNED_PURCHASE_LIMIT = 2;

const DATABASE_NAME = 'worthwhile-guest';
const DATABASE_VERSION = 1;
const ITEM_STORE = 'items';
const PLANNED_PURCHASE_STORE = 'plannedPurchases';
const META_STORE = 'meta';
const MIGRATION_ID_KEY = 'migrationId';

export class GuestLimitError extends Error {
  constructor(kind, limit) {
    const message = kind === 'item'
      ? `You've tried Worthwhile with ${limit} items. Sign in to keep your history and continue across devices.`
      : `You've tried Worthwhile with ${limit} planned purchases. Sign in to keep your plans and continue across devices.`;
    super(message);
    this.name = 'GuestLimitError';
    this.code = kind === 'item' ? 'guest_item_limit' : 'guest_planned_purchase_limit';
  }
}

export const assertGuestCapacity = (kind, currentCount) => {
  const limit = kind === 'item' ? GUEST_ITEM_LIMIT : GUEST_PLANNED_PURCHASE_LIMIT;
  if (currentCount >= limit) {
    throw new GuestLimitError(kind, limit);
  }
};

const requireIndexedDB = () => {
  if (!globalThis.indexedDB) {
    throw new Error('Local guest storage is unavailable in this browser.');
  }
  return globalThis.indexedDB;
};

const requestAsPromise = (request) => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error || new Error('IndexedDB request failed.'));
});

const transactionAsPromise = (transaction) => new Promise((resolve, reject) => {
  transaction.oncomplete = () => resolve();
  transaction.onerror = () => reject(transaction.error || new Error('IndexedDB transaction failed.'));
  transaction.onabort = () => reject(transaction.error || new Error('IndexedDB transaction was aborted.'));
});

let databasePromise = null;

const openGuestDatabase = () => {
  if (databasePromise) return databasePromise;

  databasePromise = new Promise((resolve, reject) => {
    const request = requireIndexedDB().open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(ITEM_STORE)) {
        database.createObjectStore(ITEM_STORE, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(PLANNED_PURCHASE_STORE)) {
        database.createObjectStore(PLANNED_PURCHASE_STORE, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(META_STORE)) {
        database.createObjectStore(META_STORE, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => {
        database.close();
        databasePromise = null;
      };
      resolve(database);
    };
    request.onerror = () => {
      databasePromise = null;
      reject(request.error || new Error('Unable to open local guest storage.'));
    };
  });

  return databasePromise;
};

const runStoreOperation = async (storeName, mode, operation) => {
  const database = await openGuestDatabase();
  const transaction = database.transaction(storeName, mode);
  const completion = transactionAsPromise(transaction);
  const store = transaction.objectStore(storeName);
  const result = await operation(store);
  await completion;
  return result;
};

const listStore = (storeName) => runStoreOperation(
  storeName,
  'readonly',
  (store) => requestAsPromise(store.getAll()),
);

const getStoreRecord = (storeName, id) => runStoreOperation(
  storeName,
  'readonly',
  (store) => requestAsPromise(store.get(String(id))),
);

const putStoreRecord = (storeName, value) => runStoreOperation(
  storeName,
  'readwrite',
  (store) => requestAsPromise(store.put(value)),
);

const deleteStoreRecord = (storeName, id) => runStoreOperation(
  storeName,
  'readwrite',
  (store) => requestAsPromise(store.delete(String(id))),
);

const createLocalID = (prefix) => {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const parseDate = (value) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const roundToSixDecimals = (value) => Math.round(Number(value) * 1_000_000) / 1_000_000;

const enrichGuestItem = (candidate) => {
  const item = {
    ...candidate,
    price: Number(candidate.price),
    status: candidate.status || 'active',
  };
  const purchaseDate = parseDate(item.purchaseDate);
  const endDate = item.status === 'active'
    ? new Date()
    : parseDate(item.endedAt);

  if (purchaseDate && endDate) {
    item.ownershipDays = Math.max(
      1,
      Math.ceil((endDate.getTime() - purchaseDate.getTime()) / 86_400_000),
    );
    item.grossCostPerDay = item.price / item.ownershipDays;
  } else {
    item.ownershipDays = 1;
    item.grossCostPerDay = item.price;
  }

  if (item.status === 'sold' && item.salePrice !== null && item.salePrice !== undefined) {
    item.salePrice = Number(item.salePrice);
    item.netOwnershipCost = item.price - item.salePrice;
    item.netCostPerDay = item.netOwnershipCost / item.ownershipDays;
  } else {
    delete item.netOwnershipCost;
    delete item.netCostPerDay;
  }

  if (item.targetType && item.targetValue !== null && item.targetValue !== undefined) {
    const targetValue = Number(item.targetValue);
    const effectiveCost = item.status === 'sold' && Number.isFinite(item.netOwnershipCost)
      ? Math.max(0, item.netOwnershipCost)
      : item.price;
    const targetDurationDays = item.targetType === 'duration'
      ? Math.max(1, Math.round(targetValue))
      : Math.max(1, Math.ceil(effectiveCost / targetValue));
    const targetCostPerDay = item.targetType === 'cost_per_day'
      ? targetValue
      : effectiveCost / targetDurationDays;
    item.targetValue = targetValue;
    item.targetDurationDays = targetDurationDays;
    item.targetCostPerDay = targetCostPerDay;
    item.progressPercentage = (item.ownershipDays / targetDurationDays) * 100;
    item.targetReached = item.ownershipDays >= targetDurationDays || effectiveCost <= 0;
    item.remainingDays = Math.max(0, targetDurationDays - item.ownershipDays);
    item.daysBeyond = Math.max(0, item.ownershipDays - targetDurationDays);
    item.targetState = item.ownershipDays > targetDurationDays
      ? 'beyond_target'
      : item.targetReached
        ? 'target_reached'
        : item.ownershipDays <= 1
          ? 'new'
          : 'in_progress';
  }

  return item;
};

const normalizeGuestItemInput = (candidate, existing = {}) => {
  const normalized = {
    ...existing,
    ...candidate,
    id: existing.id || candidate.id || createLocalID('guest-item'),
    name: String(candidate.name || '').trim(),
    price: Number(candidate.price),
    purchaseDate: candidate.purchaseDate,
    status: candidate.status || existing.status || 'active',
    updatedAt: new Date().toISOString(),
  };
  normalized.createdAt = existing.createdAt || normalized.updatedAt;

  if (Object.prototype.hasOwnProperty.call(candidate, 'salePrice')) {
    normalized.salePrice = candidate.salePrice === null || candidate.salePrice === ''
      ? null
      : Number(candidate.salePrice);
  }
  if (Object.prototype.hasOwnProperty.call(candidate, 'targetValue')) {
    normalized.targetValue = candidate.targetValue === null || candidate.targetValue === ''
      ? null
      : Number(candidate.targetValue);
  }

  return enrichGuestItem(normalized);
};

const enrichGuestPlannedPurchase = (candidate) => {
  const purchase = {
    ...candidate,
    targetPrice: Number(candidate.targetPrice),
  };

  delete purchase.estimatedPeriods;
  delete purchase.estimatedDays;
  delete purchase.requiredDailyContribution;
  delete purchase.requiredWeeklyContribution;
  delete purchase.requiredMonthlyContribution;

  if (purchase.contributionAmount && purchase.contributionCadence) {
    const contributionAmount = Number(purchase.contributionAmount);
    const periods = Math.ceil(purchase.targetPrice / contributionAmount);
    const multiplier = purchase.contributionCadence === 'weekly'
      ? 7
      : purchase.contributionCadence === 'monthly'
        ? 365 / 12
        : 1;
    purchase.contributionAmount = contributionAmount;
    purchase.estimatedPeriods = periods;
    purchase.estimatedDays = Math.round(periods * multiplier);
  }

  if (purchase.targetDate) {
    const targetDate = parseDate(purchase.targetDate);
    if (targetDate) {
      const now = new Date();
      const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
      const targetUTC = Date.UTC(
        targetDate.getUTCFullYear(),
        targetDate.getUTCMonth(),
        targetDate.getUTCDate(),
      );
      const daysRemaining = Math.max(1, Math.ceil((targetUTC - todayUTC) / 86_400_000));
      const daily = purchase.targetPrice / daysRemaining;
      purchase.requiredDailyContribution = daily;
      purchase.requiredWeeklyContribution = daily * 7;
      purchase.requiredMonthlyContribution = daily * (365 / 12);
    }
  }

  return purchase;
};

const normalizeGuestPlannedPurchaseInput = (candidate, existing = {}) => {
  const normalized = {
    ...existing,
    ...candidate,
    id: existing.id || candidate.id || createLocalID('guest-plan'),
    name: String(candidate.name || '').trim(),
    targetPrice: roundToSixDecimals(candidate.targetPrice),
    currencyCode: String(candidate.currencyCode || '').trim().toUpperCase(),
    updatedAt: new Date().toISOString(),
  };
  normalized.createdAt = existing.createdAt || normalized.updatedAt;
  if (candidate.contributionAmount !== null && candidate.contributionAmount !== undefined) {
    normalized.contributionAmount = roundToSixDecimals(candidate.contributionAmount);
  }
  return enrichGuestPlannedPurchase(normalized);
};

const guestItemRepository = {
  async list() {
    const items = await listStore(ITEM_STORE);
    return items.map(enrichGuestItem);
  },
  async create(candidate) {
    const items = await listStore(ITEM_STORE);
    assertGuestCapacity('item', items.length);
    const item = normalizeGuestItemInput(candidate);
    await putStoreRecord(ITEM_STORE, item);
    return item;
  },
  async update(id, candidate) {
    const existing = await getStoreRecord(ITEM_STORE, id);
    if (!existing) throw new Error('Guest item not found.');
    const item = normalizeGuestItemInput({ ...candidate, id: String(id) }, existing);
    await putStoreRecord(ITEM_STORE, item);
    return item;
  },
  async delete(id) {
    await deleteStoreRecord(ITEM_STORE, id);
    return null;
  },
  async replaceAll(items) {
    if (!Array.isArray(items)) throw new Error('Import data must be an array of items.');
    if (items.length > GUEST_ITEM_LIMIT) {
      throw new GuestLimitError('item', GUEST_ITEM_LIMIT);
    }
    const database = await openGuestDatabase();
    const transaction = database.transaction(ITEM_STORE, 'readwrite');
    const completion = transactionAsPromise(transaction);
    const store = transaction.objectStore(ITEM_STORE);
    store.clear();
    const normalized = items.map((item) => normalizeGuestItemInput(item));
    normalized.forEach((item) => store.put(item));
    await completion;
    return normalized;
  },
};

const guestPlannedPurchaseRepository = {
  async list() {
    const purchases = await listStore(PLANNED_PURCHASE_STORE);
    return purchases.map(enrichGuestPlannedPurchase);
  },
  async create(candidate) {
    const purchases = await listStore(PLANNED_PURCHASE_STORE);
    assertGuestCapacity('planned', purchases.length);
    const purchase = normalizeGuestPlannedPurchaseInput(candidate);
    await putStoreRecord(PLANNED_PURCHASE_STORE, purchase);
    return purchase;
  },
  async update(id, candidate) {
    const existing = await getStoreRecord(PLANNED_PURCHASE_STORE, id);
    if (!existing) throw new Error('Guest planned purchase not found.');
    const purchase = normalizeGuestPlannedPurchaseInput({ ...candidate, id: String(id) }, existing);
    await putStoreRecord(PLANNED_PURCHASE_STORE, purchase);
    return purchase;
  },
  async delete(id) {
    await deleteStoreRecord(PLANNED_PURCHASE_STORE, id);
    return null;
  },
};

const guestMetaRepository = {
  async getOrCreateMigrationId() {
    const existing = await runStoreOperation(
      META_STORE,
      'readonly',
      (store) => requestAsPromise(store.get(MIGRATION_ID_KEY)),
    );
    if (existing?.value) return existing.value;
    const value = createLocalID('guest-migration');
    await putStoreRecord(META_STORE, { key: MIGRATION_ID_KEY, value });
    return value;
  },
};

export const clearGuestData = async () => {
  const database = await openGuestDatabase();
  const transaction = database.transaction(
    [ITEM_STORE, PLANNED_PURCHASE_STORE, META_STORE],
    'readwrite',
  );
  const completion = transactionAsPromise(transaction);
  transaction.objectStore(ITEM_STORE).clear();
  transaction.objectStore(PLANNED_PURCHASE_STORE).clear();
  transaction.objectStore(META_STORE).clear();
  await completion;
};

export const hasGuestData = async () => {
  const [items, plannedPurchases] = await Promise.all([
    listStore(ITEM_STORE),
    listStore(PLANNED_PURCHASE_STORE),
  ]);
  return items.length > 0 || plannedPurchases.length > 0;
};

export const apiRepositories = {
  items: {
    list: getAllItems,
    create: addItem,
    update: updateItem,
    delete: deleteItem,
    replaceAll: replaceAllItems,
  },
  plannedPurchases: {
    list: fetchPlannedPurchases,
    create: createPlannedPurchase,
    update: updatePlannedPurchase,
    delete: deletePlannedPurchase,
  },
};

export const guestRepositories = {
  items: guestItemRepository,
  plannedPurchases: guestPlannedPurchaseRepository,
  meta: guestMetaRepository,
  clear: clearGuestData,
};

export const selectPersistenceRepositories = ({ user, isGuest }) => {
  if (user) return apiRepositories;
  if (isGuest) return guestRepositories;
  return null;
};
