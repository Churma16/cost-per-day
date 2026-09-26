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
    transaction(storeNames) {
      const names = Array.isArray(storeNames) ? storeNames : [storeNames];
      const transaction = {
        error: null,
        oncomplete: null,
        onerror: null,
        onabort: null,
        pending: 0,
        completionScheduled: false,
      };

      const scheduleCompletion = () => {
        if (transaction.pending !== 0 || transaction.completionScheduled || transaction.error) return;
        transaction.completionScheduled = true;
        queueMicrotask(() => {
          transaction.completionScheduled = false;
          if (transaction.pending === 0 && !transaction.error) {
            transaction.oncomplete?.({ target: transaction });
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
        queueMicrotask(() => {
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
        });
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
});
