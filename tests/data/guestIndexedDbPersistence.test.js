import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';

const cloneValue = (value) => {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
};

const createFakeIndexedDB = () => {
  const databases = new Map();

  const createDatabaseHandle = (record) => ({
    get objectStoreNames() {
      return {
        contains: (name) => record.stores.has(name),
      };
    },
    createObjectStore(name, options = {}) {
      record.stores.set(name, new Map());
      record.keyPaths.set(name, options.keyPath || null);
      return {};
    },
    close() {},
    onversionchange: null,
    transaction(storeNames, mode = 'readonly') {
      const names = Array.isArray(storeNames) ? storeNames : [storeNames];
      const ready = record.transactionTail;
      let releaseWriteLock = null;
      if (mode === 'readwrite') {
        const writeLock = new Promise((resolve) => {
          releaseWriteLock = resolve;
        });
        record.transactionTail = ready.then(() => writeLock);
      }
      const transaction = {
        error: null,
        oncomplete: null,
        onerror: null,
        onabort: null,
        pending: 0,
        completionScheduled: false,
      };

      const releaseTransaction = () => {
        if (releaseWriteLock) {
          releaseWriteLock();
          releaseWriteLock = null;
        }
      };

      transaction.abort = () => {
        transaction.error = transaction.error || new Error('IndexedDB transaction aborted.');
        transaction.onabort?.({ target: transaction });
        releaseTransaction();
      };

      const scheduleCompletion = () => {
        if (transaction.pending !== 0 || transaction.completionScheduled || transaction.error) return;
        transaction.completionScheduled = true;
        queueMicrotask(() => {
          transaction.completionScheduled = false;
          if (transaction.pending === 0 && !transaction.error) {
            transaction.oncomplete?.({ target: transaction });
            releaseTransaction();
          }
        });
      };

      const makeRequest = (operation) => {
        const request = {
          result: undefined,
          error: null,
          onsuccess: null,
          onerror: null,
        };
        transaction.pending += 1;
        ready.then(() => queueMicrotask(() => {
          try {
            request.result = operation();
            request.onsuccess?.({ target: request });
          } catch (error) {
            request.error = error;
            transaction.error = error;
            request.onerror?.({ target: request });
            transaction.onerror?.({ target: transaction });
          } finally {
            transaction.pending -= 1;
            scheduleCompletion();
          }
        }));
        return request;
      };

      transaction.objectStore = (name) => {
        if (!names.includes(name) || !record.stores.has(name)) {
          throw new Error(`Unknown object store: ${name}`);
        }
        const values = record.stores.get(name);
        const keyPath = record.keyPaths.get(name);

        return {
          getAll: () => makeRequest(() => Array.from(values.values(), cloneValue)),
          get: (key) => makeRequest(() => cloneValue(values.get(key))),
          put: (value) => makeRequest(() => {
            const key = keyPath ? value[keyPath] : undefined;
            if (key === undefined || key === null) {
              throw new Error('Missing IndexedDB key.');
            }
            values.set(key, cloneValue(value));
            return key;
          }),
          delete: (key) => makeRequest(() => {
            values.delete(key);
            return undefined;
          }),
          clear: () => makeRequest(() => {
            values.clear();
            return undefined;
          }),
        };
      };

      return transaction;
    },
  });

  return {
    open(name, version) {
      const request = {
        result: undefined,
        error: null,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
      };

      queueMicrotask(() => {
        try {
          let record = databases.get(name);
          const previousVersion = record?.version || 0;
          if (!record) {
            record = {
              version: version || 1,
              stores: new Map(),
              keyPaths: new Map(),
              transactionTail: Promise.resolve(),
            };
            databases.set(name, record);
          }
          if (version && version > record.version) {
            record.version = version;
          }

          request.result = createDatabaseHandle(record);
          if (previousVersion < record.version) {
            request.onupgradeneeded?.({
              oldVersion: previousVersion,
              newVersion: record.version,
              target: request,
            });
          }
          queueMicrotask(() => request.onsuccess?.({ target: request }));
        } catch (error) {
          request.error = error;
          request.onerror?.({ target: request });
        }
      });

      return request;
    },
  };
};

const originalIndexedDB = globalThis.indexedDB;

beforeAll(() => {
  Object.defineProperty(globalThis, 'indexedDB', {
    configurable: true,
    writable: true,
    value: createFakeIndexedDB(),
  });
});

afterAll(() => {
  Object.defineProperty(globalThis, 'indexedDB', {
    configurable: true,
    writable: true,
    value: originalIndexedDB,
  });
});

describe('guest IndexedDB persistence', () => {
  test('grandfathers an existing guest with persisted required preferences', async () => {
    vi.resetModules();
    const existingInstallation = await import('../../src/data/persistenceRepositories.js');
    await existingInstallation.clearGuestData();
    await existingInstallation.guestRepositories.settings.set('language', 'id');
    await existingInstallation.guestRepositories.settings.set('currency', 'IDR');

    vi.resetModules();
    const upgradedInstallation = await import('../../src/data/persistenceRepositories.js');
    const migrationSnapshot = await upgradedInstallation.guestRepositories.migrations
      .getOrCreateSnapshot();

    expect(migrationSnapshot.settings).toEqual({
      language: 'id',
      currency: 'IDR',
      onboardingCompleted: 'true',
    });
    await expect(upgradedInstallation.guestRepositories.settings.getAll()).resolves.toEqual({
      language: 'id',
      currency: 'IDR',
      onboardingCompleted: 'true',
    });
  });

  test('does not grandfather a fresh guest from virtual defaults', async () => {
    vi.resetModules();
    const persistence = await import('../../src/data/persistenceRepositories.js');
    await persistence.clearGuestData();

    await expect(persistence.guestRepositories.settings.getAll()).resolves.toEqual({
      language: 'en',
      currency: 'USD',
    });

    await persistence.guestRepositories.settings.set('language', 'id');
    await persistence.guestRepositories.settings.set('currency', 'IDR');
    vi.resetModules();
    const afterCurrentVersionSetup = await import('../../src/data/persistenceRepositories.js');
    await expect(afterCurrentVersionSetup.guestRepositories.settings.getAll()).resolves.toEqual({
      language: 'id',
      currency: 'IDR',
    });
  });

  test('keeps owned items, plans, and migration identity across a module reload', async () => {
    vi.resetModules();
    const firstLoad = await import('../../src/data/persistenceRepositories.js');
    await firstLoad.clearGuestData();

    await firstLoad.guestRepositories.items.create({
      name: 'Camera',
      price: 1200,
      purchaseDate: '2026-09-20',
      status: 'active',
    });
    await firstLoad.guestRepositories.plannedPurchases.create({
      name: 'Lens',
      targetPrice: 500,
      currencyCode: 'USD',
    });
    await firstLoad.guestRepositories.settings.set('language', 'id');
    await firstLoad.guestRepositories.settings.set('currency', 'IDR');
    await firstLoad.guestRepositories.valueEquivalents.create({
      name: 'Gorengan',
      amount: 2500,
      currencyCode: 'IDR',
    });
    const migrationId = await firstLoad.guestRepositories.meta.getOrCreateMigrationId();

    vi.resetModules();
    const afterReload = await import('../../src/data/persistenceRepositories.js');

    const items = await afterReload.guestRepositories.items.list();
    const plannedPurchases = await afterReload.guestRepositories.plannedPurchases.list();
    const settings = await afterReload.guestRepositories.settings.getAll();
    const valueEquivalents = await afterReload.guestRepositories.valueEquivalents.list();
    const restoredMigrationId = await afterReload.guestRepositories.meta.getOrCreateMigrationId();

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ name: 'Camera', price: 1200, status: 'active' });
    expect(plannedPurchases).toHaveLength(1);
    expect(plannedPurchases[0]).toMatchObject({ name: 'Lens', targetPrice: 500, currencyCode: 'USD' });
    expect(settings).toMatchObject({ language: 'id', currency: 'IDR' });
    expect(valueEquivalents).toHaveLength(1);
    expect(valueEquivalents[0]).toMatchObject({ name: 'Gorengan', amount: 2500, currencyCode: 'IDR' });
    expect(restoredMigrationId).toBe(migrationId);

    await afterReload.clearGuestData();
    expect(await afterReload.guestRepositories.items.list()).toEqual([]);
    expect(await afterReload.guestRepositories.plannedPurchases.list()).toEqual([]);
    expect(await afterReload.guestRepositories.settings.getAll()).toEqual({
      language: 'en',
      currency: 'USD',
    });
    expect(await afterReload.guestRepositories.valueEquivalents.list()).toEqual([]);
  });

  test('supports guest value equivalent create, edit, and delete entirely in local storage', async () => {
    vi.resetModules();
    const persistence = await import('../../src/data/persistenceRepositories.js');
    await persistence.clearGuestData();

    const created = await persistence.guestRepositories.valueEquivalents.create({
      name: 'Coffee',
      amount: 5,
      currencyCode: 'USD',
    });
    expect(await persistence.guestRepositories.valueEquivalents.list()).toEqual([
      expect.objectContaining({
        id: created.id,
        name: 'Coffee',
        amount: 5,
        currencyCode: 'USD',
      }),
    ]);

    const updated = await persistence.guestRepositories.valueEquivalents.update(created.id, {
      ...created,
      name: 'Specialty Coffee',
      amount: 7.5,
    });
    expect(updated).toMatchObject({
      id: created.id,
      name: 'Specialty Coffee',
      amount: 7.5,
      currencyCode: 'USD',
    });

    await persistence.guestRepositories.valueEquivalents.delete(created.id);
    expect(await persistence.guestRepositories.valueEquivalents.list()).toEqual([]);
  });

  test('locks snapshot members while allowing new records to queue for the next migration', async () => {
    vi.resetModules();
    const persistence = await import('../../src/data/persistenceRepositories.js');
    await persistence.clearGuestData();

    const original = await persistence.guestRepositories.items.create({
      name: 'Camera',
      price: 1200,
      purchaseDate: '2026-09-20',
      status: 'active',
    });
    const originalPlan = await persistence.guestRepositories.plannedPurchases.create({
      name: 'Laptop plan',
      targetPrice: 1800,
      currencyCode: 'USD',
    });
    const originalEquivalent = await persistence.guestRepositories.valueEquivalents.create({
      name: 'Coffee',
      amount: 5,
      currencyCode: 'USD',
    });
    const firstSnapshot = await persistence.guestRepositories.migrations.getOrCreateSnapshot();

    await persistence.guestRepositories.items.create({
      name: 'Lens added after lost response',
      price: 500,
      purchaseDate: '2026-09-27',
      status: 'active',
    });

    await expect(persistence.guestRepositories.items.update(original.id, {
      ...original,
      name: 'Camera updated after lost response',
    })).rejects.toBeInstanceOf(persistence.GuestMigrationLockedError);
    await expect(persistence.guestRepositories.items.delete(original.id))
      .rejects.toBeInstanceOf(persistence.GuestMigrationLockedError);
    await expect(persistence.guestRepositories.plannedPurchases.update(originalPlan.id, {
      ...originalPlan,
      name: 'Updated plan',
    })).rejects.toBeInstanceOf(persistence.GuestMigrationLockedError);
    await expect(persistence.guestRepositories.plannedPurchases.delete(originalPlan.id))
      .rejects.toBeInstanceOf(persistence.GuestMigrationLockedError);
    await expect(persistence.guestRepositories.valueEquivalents.update(originalEquivalent.id, {
      ...originalEquivalent,
      name: 'Updated coffee',
    })).rejects.toBeInstanceOf(persistence.GuestMigrationLockedError);
    await expect(persistence.guestRepositories.valueEquivalents.delete(originalEquivalent.id))
      .rejects.toBeInstanceOf(persistence.GuestMigrationLockedError);

    await persistence.guestRepositories.migrations.completeSnapshot(firstSnapshot);

    const remainingItems = await persistence.guestRepositories.items.list();
    expect(remainingItems.map((item) => item.name)).toEqual(['Lens added after lost response']);
    expect(await persistence.guestRepositories.plannedPurchases.list()).toEqual([]);
    expect(await persistence.guestRepositories.valueEquivalents.list()).toEqual([]);

    const nextSnapshot = await persistence.guestRepositories.migrations.getOrCreateSnapshot();
    expect(nextSnapshot.migrationId).not.toBe(firstSnapshot.migrationId);
    expect(nextSnapshot.items).toHaveLength(1);
  });

  test('includes completed guest preferences in a settings-only migration snapshot', async () => {
    vi.resetModules();
    const persistence = await import('../../src/data/persistenceRepositories.js');
    await persistence.clearGuestData();

    await persistence.guestRepositories.settings.set('language', 'id');
    await persistence.guestRepositories.settings.set('currency', 'IDR');
    await persistence.guestRepositories.settings.set('onboardingCompleted', 'true');

    const snapshot = await persistence.guestRepositories.migrations.getOrCreateSnapshot();

    expect(snapshot.settings).toEqual({
      language: 'id',
      currency: 'IDR',
      onboardingCompleted: 'true',
    });
    expect(snapshot.items).toEqual([]);

    await persistence.guestRepositories.migrations.completeSnapshot(snapshot);
    expect(await persistence.guestRepositories.migrations.getOrCreateSnapshot()).toBeNull();
  });

  test('treats stale snapshot completion as a no-op when a newer snapshot is active', async () => {
    vi.resetModules();
    const persistence = await import('../../src/data/persistenceRepositories.js');
    await persistence.clearGuestData();

    await persistence.guestRepositories.items.create({
      name: 'Snapshot A item',
      price: 100,
      purchaseDate: '2026-09-20',
      status: 'active',
    });
    const snapshotA = await persistence.guestRepositories.migrations.getOrCreateSnapshot();
    await persistence.guestRepositories.migrations.completeSnapshot(snapshotA);

    await persistence.guestRepositories.items.create({
      name: 'Snapshot B item',
      price: 200,
      purchaseDate: '2026-09-21',
      status: 'active',
    });
    const snapshotB = await persistence.guestRepositories.migrations.getOrCreateSnapshot();

    await expect(persistence.guestRepositories.migrations.completeSnapshot(snapshotA))
      .resolves.toEqual({ completed: false });
    const stillActiveSnapshot = await persistence.guestRepositories.migrations.getOrCreateSnapshot();

    expect(stillActiveSnapshot.migrationId).toBe(snapshotB.migrationId);
    expect(stillActiveSnapshot.items).toHaveLength(1);
    expect(stillActiveSnapshot.items[0].name).toBe('Snapshot B item');
  });

  test('releases a validation-rejected snapshot without deleting its local records', async () => {
    vi.resetModules();
    const persistence = await import('../../src/data/persistenceRepositories.js');
    await persistence.clearGuestData();

    const plan = await persistence.guestRepositories.plannedPurchases.create({
      name: 'Time-sensitive plan',
      targetPrice: 900,
      currencyCode: 'USD',
      targetDate: '2026-09-30',
    });
    const rejectedSnapshot = await persistence.guestRepositories.migrations.getOrCreateSnapshot();

    await expect(persistence.guestRepositories.plannedPurchases.update(plan.id, {
      ...plan,
      targetDate: '2026-10-30',
    })).rejects.toBeInstanceOf(persistence.GuestMigrationLockedError);

    await expect(persistence.guestRepositories.migrations.releaseSnapshot(rejectedSnapshot))
      .resolves.toEqual({ released: true });
    expect(await persistence.guestRepositories.plannedPurchases.list()).toHaveLength(1);

    await persistence.guestRepositories.plannedPurchases.update(plan.id, {
      ...plan,
      targetDate: '2026-10-30',
    });
    const correctedSnapshot = await persistence.guestRepositories.migrations.getOrCreateSnapshot();

    expect(correctedSnapshot.migrationId).not.toBe(rejectedSnapshot.migrationId);
    expect(correctedSnapshot.plannedPurchases[0].targetDate).toBe('2026-10-30');
  });

  test('enforces guest item and plan limits across concurrent creates', async () => {
    vi.resetModules();
    const persistence = await import('../../src/data/persistenceRepositories.js');
    await persistence.clearGuestData();

    for (let index = 0; index < 9; index += 1) {
      await persistence.guestRepositories.items.create({
        name: `Item ${index + 1}`,
        price: 100 + index,
        purchaseDate: '2026-09-20',
        status: 'active',
      });
    }
    const itemResults = await Promise.allSettled([
      persistence.guestRepositories.items.create({
        name: 'Concurrent item A',
        price: 200,
        purchaseDate: '2026-09-20',
        status: 'active',
      }),
      persistence.guestRepositories.items.create({
        name: 'Concurrent item B',
        price: 300,
        purchaseDate: '2026-09-20',
        status: 'active',
      }),
    ]);

    expect(itemResults.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(itemResults.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(itemResults.find((result) => result.status === 'rejected').reason)
      .toBeInstanceOf(persistence.GuestLimitError);
    expect(await persistence.guestRepositories.items.list()).toHaveLength(10);

    for (let index = 0; index < 4; index += 1) {
      await persistence.guestRepositories.plannedPurchases.create({
        name: `Plan ${index + 1}`,
        targetPrice: 500 + index,
        currencyCode: 'USD',
      });
    }
    const planResults = await Promise.allSettled([
      persistence.guestRepositories.plannedPurchases.create({
        name: 'Concurrent plan A',
        targetPrice: 600,
        currencyCode: 'USD',
      }),
      persistence.guestRepositories.plannedPurchases.create({
        name: 'Concurrent plan B',
        targetPrice: 700,
        currencyCode: 'USD',
      }),
    ]);

    expect(planResults.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(planResults.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(planResults.find((result) => result.status === 'rejected').reason)
      .toBeInstanceOf(persistence.GuestLimitError);
    expect(await persistence.guestRepositories.plannedPurchases.list()).toHaveLength(5);

    for (let index = 0; index < 2; index += 1) {
      await persistence.guestRepositories.valueEquivalents.create({
        name: `Equivalent ${index + 1}`,
        amount: 10 + index,
        currencyCode: 'USD',
      });
    }
    const equivalentResults = await Promise.allSettled([
      persistence.guestRepositories.valueEquivalents.create({
        name: 'Concurrent equivalent A',
        amount: 20,
        currencyCode: 'USD',
      }),
      persistence.guestRepositories.valueEquivalents.create({
        name: 'Concurrent equivalent B',
        amount: 30,
        currencyCode: 'USD',
      }),
    ]);

    expect(equivalentResults.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(equivalentResults.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(equivalentResults.find((result) => result.status === 'rejected').reason)
      .toBeInstanceOf(persistence.GuestLimitError);
    expect(await persistence.guestRepositories.valueEquivalents.list()).toHaveLength(3);
  });
});
