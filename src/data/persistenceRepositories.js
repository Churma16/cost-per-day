import * as itemApi from '../services/api';
import * as plannedPurchaseApi from '../services/plannedPurchaseService';

export const GUEST_ITEM_LIMIT = 10;
export const GUEST_PLANNED_PURCHASE_LIMIT = 5;
export const GUEST_VALUE_EQUIVALENT_LIMIT = 3;

const DATABASE_NAME = 'worthwhile-guest';
const DATABASE_VERSION = 2;
const ITEM_STORE = 'items';
const PLANNED_PURCHASE_STORE = 'plannedPurchases';
const SETTINGS_STORE = 'settings';
const VALUE_EQUIVALENT_STORE = 'valueEquivalents';
const META_STORE = 'meta';
const DEFAULT_GUEST_SETTINGS = {
  language: 'en',
  currency: 'USD',
};
const MIGRATION_ID_KEY = 'migrationId';
const MIGRATION_SNAPSHOT_KEY = 'migrationSnapshot';

export class GuestLimitError extends Error {
  constructor(kind, limit) {
    const configuration = {
      item: {
        code: 'guest_item_limit',
        message: `You've tried Worthwhile with ${limit} items. Sign in to keep your history and continue across devices.`,
      },
      planned: {
        code: 'guest_planned_purchase_limit',
        message: `You've tried Worthwhile with ${limit} planned purchases. Sign in to keep your plans and continue across devices.`,
      },
      equivalent: {
        code: 'guest_value_equivalent_limit',
        message: `You've used ${limit} value equivalents. Sign in to save more and use them across devices.`,
      },
    }[kind];

    super(configuration?.message || 'Guest limit reached.');
    this.name = 'GuestLimitError';
    this.code = configuration?.code || 'guest_limit';
    this.limit = limit;
  }
}

export class GuestMigrationLockedError extends Error {
  constructor() {
    super('This guest record is being migrated. Finish or retry sign-in before changing it.');
    this.name = 'GuestMigrationLockedError';
    this.code = 'guest_migration_locked';
  }
}

export const assertGuestCapacity = (kind, currentCount) => {
  const limits = {
    item: GUEST_ITEM_LIMIT,
    planned: GUEST_PLANNED_PURCHASE_LIMIT,
    equivalent: GUEST_VALUE_EQUIVALENT_LIMIT,
  };
  const limit = limits[kind];
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
      if (!database.objectStoreNames.contains(SETTINGS_STORE)) {
        database.createObjectStore(SETTINGS_STORE, { keyPath: 'key' });
      }
      if (!database.objectStoreNames.contains(VALUE_EQUIVALENT_STORE)) {
        database.createObjectStore(VALUE_EQUIVALENT_STORE, { keyPath: 'id' });
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

const putStoreRecord = (storeName, value) => runStoreOperation(
  storeName,
  'readwrite',
  (store) => requestAsPromise(store.put(value)),
);

const abortTransaction = (transaction) => {
  try {
    transaction.abort();
  } catch {
    // The transaction may already have completed after a request failure.
  }
};

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

const normalizeGuestValueEquivalentInput = (candidate, existing = {}) => {
  const name = String(candidate?.name || '').trim();
  const amount = roundToSixDecimals(candidate?.amount);
  const currencyCode = String(candidate?.currencyCode || '').trim().toUpperCase();

  if (!name) throw new Error('Value equivalent name cannot be empty.');
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Value equivalent amount must be greater than zero.');
  }
  if (!currencyCode) throw new Error('Value equivalent currency code is invalid.');

  const updatedAt = new Date().toISOString();
  return {
    ...existing,
    ...candidate,
    id: existing.id || candidate.id || createLocalID('guest-equivalent'),
    name,
    amount,
    currencyCode,
    createdAt: existing.createdAt || updatedAt,
    updatedAt,
  };
};

const createGuestRecordWithinLimit = async (storeName, kind, candidate, normalize) => {
  const database = await openGuestDatabase();
  const transaction = database.transaction(storeName, 'readwrite');
  const completion = transactionAsPromise(transaction);
  const store = transaction.objectStore(storeName);

  try {
    const existingRecords = await requestAsPromise(store.getAll());
    assertGuestCapacity(kind, existingRecords.length);
    const record = normalize(candidate);
    await requestAsPromise(store.put(record));
    await completion;
    return record;
  } catch (error) {
    abortTransaction(transaction);
    await completion.catch(() => undefined);
    throw error;
  }
};

const mutateUnlockedGuestRecord = async ({
  storeName,
  snapshotCollection,
  id,
  missingMessage,
  mutate,
}) => {
  const database = await openGuestDatabase();
  const transaction = database.transaction([storeName, META_STORE], 'readwrite');
  const completion = transactionAsPromise(transaction);
  const store = transaction.objectStore(storeName);
  const metaStore = transaction.objectStore(META_STORE);

  try {
    const [existing, snapshotRecord] = await Promise.all([
      requestAsPromise(store.get(String(id))),
      requestAsPromise(metaStore.get(MIGRATION_SNAPSHOT_KEY)),
    ]);
    const snapshotContainsRecord = snapshotRecord?.value?.[snapshotCollection]
      ?.some((record) => String(record.id) === String(id));
    if (snapshotContainsRecord) {
      throw new GuestMigrationLockedError();
    }
    if (!existing && missingMessage) {
      throw new Error(missingMessage);
    }

    const result = await mutate(store, existing);
    await completion;
    return result;
  } catch (error) {
    abortTransaction(transaction);
    await completion.catch(() => undefined);
    throw error;
  }
};

const guestItemRepository = {
  async list() {
    const items = await listStore(ITEM_STORE);
    return items.map(enrichGuestItem);
  },
  async create(candidate) {
    return createGuestRecordWithinLimit(
      ITEM_STORE,
      'item',
      candidate,
      normalizeGuestItemInput,
    );
  },
  async update(id, candidate) {
    return mutateUnlockedGuestRecord({
      storeName: ITEM_STORE,
      snapshotCollection: 'items',
      id,
      missingMessage: 'Guest item not found.',
      mutate: async (store, existing) => {
        const item = normalizeGuestItemInput({ ...candidate, id: String(id) }, existing);
        await requestAsPromise(store.put(item));
        return item;
      },
    });
  },
  async delete(id) {
    return mutateUnlockedGuestRecord({
      storeName: ITEM_STORE,
      snapshotCollection: 'items',
      id,
      mutate: async (store) => {
        await requestAsPromise(store.delete(String(id)));
        return null;
      },
    });
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
    return createGuestRecordWithinLimit(
      PLANNED_PURCHASE_STORE,
      'planned',
      candidate,
      normalizeGuestPlannedPurchaseInput,
    );
  },
  async update(id, candidate) {
    return mutateUnlockedGuestRecord({
      storeName: PLANNED_PURCHASE_STORE,
      snapshotCollection: 'plannedPurchases',
      id,
      missingMessage: 'Guest planned purchase not found.',
      mutate: async (store, existing) => {
        const purchase = normalizeGuestPlannedPurchaseInput(
          { ...candidate, id: String(id) },
          existing,
        );
        await requestAsPromise(store.put(purchase));
        return purchase;
      },
    });
  },
  async delete(id) {
    return mutateUnlockedGuestRecord({
      storeName: PLANNED_PURCHASE_STORE,
      snapshotCollection: 'plannedPurchases',
      id,
      mutate: async (store) => {
        await requestAsPromise(store.delete(String(id)));
        return null;
      },
    });
  },
};

const guestSettingsRepository = {
  async getAll() {
    const records = await listStore(SETTINGS_STORE);
    return records.reduce(
      (settings, record) => ({ ...settings, [record.key]: record.value }),
      { ...DEFAULT_GUEST_SETTINGS },
    );
  },
  async set(key, value) {
    const normalizedKey = String(key || '').trim();
    const normalizedValue = String(value || '').trim();
    if (!normalizedKey) throw new Error('Setting key cannot be empty.');
    if (!normalizedValue) throw new Error('Setting value cannot be empty.');
    await putStoreRecord(SETTINGS_STORE, { key: normalizedKey, value: normalizedValue });
    return normalizedValue;
  },
};

const guestValueEquivalentRepository = {
  async list() {
    return listStore(VALUE_EQUIVALENT_STORE);
  },
  async create(candidate) {
    return createGuestRecordWithinLimit(
      VALUE_EQUIVALENT_STORE,
      'equivalent',
      candidate,
      normalizeGuestValueEquivalentInput,
    );
  },
  async update(id, candidate) {
    return mutateUnlockedGuestRecord({
      storeName: VALUE_EQUIVALENT_STORE,
      snapshotCollection: 'valueEquivalents',
      id,
      missingMessage: 'Guest value equivalent not found.',
      mutate: async (store, existing) => {
        const equivalent = normalizeGuestValueEquivalentInput(
          { ...candidate, id: String(id) },
          existing,
        );
        await requestAsPromise(store.put(equivalent));
        return equivalent;
      },
    });
  },
  async delete(id) {
    return mutateUnlockedGuestRecord({
      storeName: VALUE_EQUIVALENT_STORE,
      snapshotCollection: 'valueEquivalents',
      id,
      mutate: async (store) => {
        await requestAsPromise(store.delete(String(id)));
        return null;
      },
    });
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

const guestMigrationRepository = {
  async getOrCreateSnapshot() {
    const database = await openGuestDatabase();
    const transaction = database.transaction(
      [ITEM_STORE, PLANNED_PURCHASE_STORE, SETTINGS_STORE, VALUE_EQUIVALENT_STORE, META_STORE],
      'readwrite',
    );
    const completion = transactionAsPromise(transaction);
    const itemStore = transaction.objectStore(ITEM_STORE);
    const plannedPurchaseStore = transaction.objectStore(PLANNED_PURCHASE_STORE);
    const settingsStore = transaction.objectStore(SETTINGS_STORE);
    const valueEquivalentStore = transaction.objectStore(VALUE_EQUIVALENT_STORE);
    const metaStore = transaction.objectStore(META_STORE);

    try {
      const [
        existingSnapshotRecord,
        existingMigrationIDRecord,
        items,
        plannedPurchases,
        settings,
        valueEquivalents,
      ] = await Promise.all([
        requestAsPromise(metaStore.get(MIGRATION_SNAPSHOT_KEY)),
        requestAsPromise(metaStore.get(MIGRATION_ID_KEY)),
        requestAsPromise(itemStore.getAll()),
        requestAsPromise(plannedPurchaseStore.getAll()),
        requestAsPromise(settingsStore.getAll()),
        requestAsPromise(valueEquivalentStore.getAll()),
      ]);

      if (existingSnapshotRecord?.value) {
        await completion;
        return existingSnapshotRecord.value;
      }
      if (items.length === 0 && plannedPurchases.length === 0 && settings.length === 0 && valueEquivalents.length === 0) {
        await completion;
        return null;
      }

      const migrationId = existingMigrationIDRecord?.value || createLocalID('guest-migration');
      const snapshot = {
        migrationId,
        items,
        plannedPurchases,
        settings: settings.reduce(
          (values, setting) => ({ ...values, [setting.key]: setting.value }),
          {},
        ),
        valueEquivalents,
        createdAt: new Date().toISOString(),
      };

      if (!existingMigrationIDRecord?.value) {
        await requestAsPromise(metaStore.put({ key: MIGRATION_ID_KEY, value: migrationId }));
      }
      await requestAsPromise(metaStore.put({ key: MIGRATION_SNAPSHOT_KEY, value: snapshot }));
      await completion;
      return snapshot;
    } catch (error) {
      abortTransaction(transaction);
      await completion.catch(() => undefined);
      throw error;
    }
  },

  async completeSnapshot(snapshot) {
    const database = await openGuestDatabase();
    const transaction = database.transaction(
      [ITEM_STORE, PLANNED_PURCHASE_STORE, SETTINGS_STORE, VALUE_EQUIVALENT_STORE, META_STORE],
      'readwrite',
    );
    const completion = transactionAsPromise(transaction);
    const itemStore = transaction.objectStore(ITEM_STORE);
    const plannedPurchaseStore = transaction.objectStore(PLANNED_PURCHASE_STORE);
    const settingsStore = transaction.objectStore(SETTINGS_STORE);
    const valueEquivalentStore = transaction.objectStore(VALUE_EQUIVALENT_STORE);
    const metaStore = transaction.objectStore(META_STORE);

    try {
      const activeSnapshotRecord = await requestAsPromise(metaStore.get(MIGRATION_SNAPSHOT_KEY));
      if (activeSnapshotRecord?.value?.migrationId !== snapshot.migrationId) {
        await completion;
        return { completed: false };
      }

      const [currentItems, currentPlannedPurchases, currentSettings, currentValueEquivalents] = await Promise.all([
        requestAsPromise(itemStore.getAll()),
        requestAsPromise(plannedPurchaseStore.getAll()),
        requestAsPromise(settingsStore.getAll()),
        requestAsPromise(valueEquivalentStore.getAll()),
      ]);
      const currentItemsByID = new Map(currentItems.map((item) => [String(item.id), item]));
      const currentPlansByID = new Map(
        currentPlannedPurchases.map((purchase) => [String(purchase.id), purchase]),
      );
      const currentEquivalentsByID = new Map(
        currentValueEquivalents.map((equivalent) => [String(equivalent.id), equivalent]),
      );
      const matchingSnapshotRecords = (records, currentByID) => records.filter((record) => {
        const current = currentByID.get(String(record.id));
        return current && JSON.stringify(current) === JSON.stringify(record);
      });

      await Promise.all([
        ...matchingSnapshotRecords(snapshot.items, currentItemsByID)
          .map((item) => requestAsPromise(itemStore.delete(item.id))),
        ...matchingSnapshotRecords(snapshot.plannedPurchases || [], currentPlansByID)
          .map((purchase) => requestAsPromise(plannedPurchaseStore.delete(purchase.id))),
        ...matchingSnapshotRecords(snapshot.valueEquivalents || [], currentEquivalentsByID)
          .map((equivalent) => requestAsPromise(valueEquivalentStore.delete(equivalent.id))),
        ...Object.entries(snapshot.settings || {})
          .filter(([key, value]) => currentSettings.some(
            (setting) => setting.key === key && setting.value === value,
          ))
          .map(([key]) => requestAsPromise(settingsStore.delete(key))),
        requestAsPromise(metaStore.delete(MIGRATION_SNAPSHOT_KEY)),
        requestAsPromise(metaStore.delete(MIGRATION_ID_KEY)),
      ]);
      await completion;
      return { completed: true };
    } catch (error) {
      abortTransaction(transaction);
      await completion.catch(() => undefined);
      throw error;
    }
  },

  async releaseSnapshot(snapshot) {
    const database = await openGuestDatabase();
    const transaction = database.transaction(META_STORE, 'readwrite');
    const completion = transactionAsPromise(transaction);
    const metaStore = transaction.objectStore(META_STORE);

    try {
      const activeSnapshotRecord = await requestAsPromise(metaStore.get(MIGRATION_SNAPSHOT_KEY));
      if (activeSnapshotRecord?.value?.migrationId !== snapshot.migrationId) {
        await completion;
        return { released: false };
      }

      await Promise.all([
        requestAsPromise(metaStore.delete(MIGRATION_SNAPSHOT_KEY)),
        requestAsPromise(metaStore.delete(MIGRATION_ID_KEY)),
      ]);
      await completion;
      return { released: true };
    } catch (error) {
      abortTransaction(transaction);
      await completion.catch(() => undefined);
      throw error;
    }
  },
};

export const clearGuestData = async () => {
  const database = await openGuestDatabase();
  const transaction = database.transaction(
    [ITEM_STORE, PLANNED_PURCHASE_STORE, SETTINGS_STORE, VALUE_EQUIVALENT_STORE, META_STORE],
    'readwrite',
  );
  const completion = transactionAsPromise(transaction);
  transaction.objectStore(ITEM_STORE).clear();
  transaction.objectStore(PLANNED_PURCHASE_STORE).clear();
  transaction.objectStore(SETTINGS_STORE).clear();
  transaction.objectStore(VALUE_EQUIVALENT_STORE).clear();
  transaction.objectStore(META_STORE).clear();
  await completion;
};

export const hasGuestData = async () => {
  const [items, plannedPurchases, valueEquivalents] = await Promise.all([
    listStore(ITEM_STORE),
    listStore(PLANNED_PURCHASE_STORE),
    listStore(VALUE_EQUIVALENT_STORE),
  ]);
  return items.length > 0 || plannedPurchases.length > 0 || valueEquivalents.length > 0;
};

export const apiRepositories = {
  items: {
    list: (...args) => itemApi.getAllItems(...args),
    create: (...args) => itemApi.addItem(...args),
    update: (...args) => itemApi.updateItem(...args),
    delete: (...args) => itemApi.deleteItem(...args),
    replaceAll: (...args) => itemApi.replaceAllItems(...args),
  },
  plannedPurchases: {
    list: (...args) => plannedPurchaseApi.fetchPlannedPurchases(...args),
    create: (...args) => plannedPurchaseApi.createPlannedPurchase(...args),
    update: (...args) => plannedPurchaseApi.updatePlannedPurchase(...args),
    delete: (...args) => plannedPurchaseApi.deletePlannedPurchase(...args),
  },
  settings: {
    getAll: (...args) => itemApi.getAllSettings(...args),
    set: (...args) => itemApi.updateSetting(...args),
  },
  valueEquivalents: {
    list: (...args) => itemApi.getAllValueEquivalents(...args),
    create: (...args) => itemApi.createValueEquivalent(...args),
    update: (...args) => itemApi.updateValueEquivalent(...args),
    delete: (...args) => itemApi.deleteValueEquivalent(...args),
  },
};

export const guestRepositories = {
  items: guestItemRepository,
  plannedPurchases: guestPlannedPurchaseRepository,
  settings: guestSettingsRepository,
  valueEquivalents: guestValueEquivalentRepository,
  meta: guestMetaRepository,
  migrations: guestMigrationRepository,
  clear: clearGuestData,
};

export const selectPersistenceRepositories = ({ user, isGuest }) => {
  if (user) return apiRepositories;
  if (isGuest) return guestRepositories;
  return null;
};
