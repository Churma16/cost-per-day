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
    const migrationId = await firstLoad.guestRepositories.meta.getOrCreateMigrationId();

    vi.resetModules();
    const afterReload = await import('../../src/data/persistenceRepositories.js');

    const items = await afterReload.guestRepositories.items.list();
    const plannedPurchases = await afterReload.guestRepositories.plannedPurchases.list();
    const restoredMigrationId = await afterReload.guestRepositories.meta.getOrCreateMigrationId();

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ name: 'Camera', price: 1200, status: 'active' });
    expect(plannedPurchases).toHaveLength(1);
    expect(plannedPurchases[0]).toMatchObject({ name: 'Lens', targetPrice: 500, currencyCode: 'USD' });
    expect(restoredMigrationId).toBe(migrationId);

    await afterReload.clearGuestData();
    expect(await afterReload.guestRepositories.items.list()).toEqual([]);
    expect(await afterReload.guestRepositories.plannedPurchases.list()).toEqual([]);
  });

  test('keeps records created or changed after a migration snapshot for the next migration', async () => {
    vi.resetModules();
    const persistence = await import('../../src/data/persistenceRepositories.js');
    await persistence.clearGuestData();

    const original = await persistence.guestRepositories.items.create({
      name: 'Camera',
      price: 1200,
      purchaseDate: '2026-09-20',
      status: 'active',
    });
    const firstSnapshot = await persistence.guestRepositories.migrations.getOrCreateSnapshot();

    await new Promise((resolve) => setTimeout(resolve, 2));
    await persistence.guestRepositories.items.update(original.id, {
      ...original,
      name: 'Camera updated after lost response',
    });
    await persistence.guestRepositories.items.create({
      name: 'Lens added after lost response',
      price: 500,
      purchaseDate: '2026-09-27',
      status: 'active',
    });

    await persistence.guestRepositories.migrations.completeSnapshot(firstSnapshot);

    const remainingItems = await persistence.guestRepositories.items.list();
    expect(remainingItems.map((item) => item.name)).toEqual([
      'Camera updated after lost response',
      'Lens added after lost response',
    ]);

    const nextSnapshot = await persistence.guestRepositories.migrations.getOrCreateSnapshot();
    expect(nextSnapshot.migrationId).not.toBe(firstSnapshot.migrationId);
    expect(nextSnapshot.items).toHaveLength(2);
  });

  test('enforces guest item and plan limits across concurrent creates', async () => {
    vi.resetModules();
    const persistence = await import('../../src/data/persistenceRepositories.js');
    await persistence.clearGuestData();

    for (let index = 0; index < 4; index += 1) {
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
    expect(await persistence.guestRepositories.items.list()).toHaveLength(5);

    await persistence.guestRepositories.plannedPurchases.create({
      name: 'Plan 1',
      targetPrice: 500,
      currencyCode: 'USD',
    });
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
    expect(await persistence.guestRepositories.plannedPurchases.list()).toHaveLength(2);
  });
});
