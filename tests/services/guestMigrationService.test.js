import { describe, expect, test, vi } from 'vitest';
import { createGuestMigrationService } from '../../src/services/guestMigrationService';

const createStorage = () => {
  const snapshot = {
    migrationId: 'guest-migration-stable',
    items: [{
      id: 'guest-item-1',
      userId: 'untrusted-owner',
      name: 'Camera',
      price: 1200,
      purchaseDate: '2026-09-20',
      status: 'active',
      ownershipDays: 7,
      grossCostPerDay: 171.42,
      updatedAt: '2026-09-27T00:00:00.000Z',
    }],
    plannedPurchases: [{
      id: 'guest-plan-1',
      userId: 'untrusted-owner',
      name: 'Lens',
      targetPrice: 500,
      currencyCode: 'USD',
      estimatedDays: 10,
      updatedAt: '2026-09-27T00:00:00.000Z',
    }],
    valueEquivalents: [{
      id: 'guest-equivalent-1',
      userId: 'untrusted-owner',
      name: 'Coffee',
      amount: 5,
      currencyCode: 'USD',
      createdAt: '2026-09-27T00:00:00.000Z',
      updatedAt: '2026-09-27T00:00:00.000Z',
    }],
  };
  let pendingSnapshot = snapshot;

  return {
    snapshot,
    migrations: {
      getOrCreateSnapshot: vi.fn(async () => pendingSnapshot),
      completeSnapshot: vi.fn(async () => {
        pendingSnapshot = null;
      }),
      releaseSnapshot: vi.fn(async () => {
        pendingSnapshot = null;
      }),
    },
  };
};

describe('guest migration orchestration', () => {
  test('imports a sanitized immutable snapshot and completes it only after confirmation', async () => {
    const guestStorage = createStorage();
    guestStorage.snapshot.settings = {
      language: 'id',
      currency: 'IDR',
      onboardingCompleted: 'true',
    };
    const importGuestData = vi.fn().mockResolvedValue({
      importedItems: 1,
      importedPlannedPurchases: 1,
      importedValueEquivalents: 1,
    });
    const getAccountSettings = vi.fn().mockResolvedValue({});
    const updateAccountSetting = vi.fn().mockResolvedValue(undefined);
    const service = createGuestMigrationService({
      guestStorage,
      importGuestData,
      getAccountSettings,
      updateAccountSetting,
    });

    await service.migrate();

    expect(importGuestData).toHaveBeenCalledWith({
      migrationId: 'guest-migration-stable',
      items: [{
        name: 'Camera',
        price: 1200,
        purchaseDate: '2026-09-20',
        status: 'active',
        endedAt: null,
        salePrice: null,
        category: null,
        brand: null,
        targetType: null,
        targetValue: null,
      }],
      plannedPurchases: [{
        name: 'Lens',
        targetPrice: 500,
        currencyCode: 'USD',
        targetDate: null,
        contributionAmount: null,
        contributionCadence: null,
      }],
      valueEquivalents: [{
        name: 'Coffee',
        amount: 5,
        currencyCode: 'USD',
      }],
    });
    expect(guestStorage.migrations.completeSnapshot).toHaveBeenCalledWith(guestStorage.snapshot);
    expect(updateAccountSetting.mock.calls).toEqual([
      ['language', 'id'],
      ['currency', 'IDR'],
      ['onboardingCompleted', 'true'],
    ]);
  });

  test('does not overwrite preferences for an account that already completed onboarding', async () => {
    const guestStorage = createStorage();
    guestStorage.snapshot.settings = {
      language: 'id',
      currency: 'IDR',
      onboardingCompleted: 'true',
    };
    const importGuestData = vi.fn().mockResolvedValue({ alreadyImported: false });
    const getAccountSettings = vi.fn().mockResolvedValue({
      language: 'en',
      currency: 'USD',
      onboardingCompleted: 'true',
    });
    const updateAccountSetting = vi.fn();
    const service = createGuestMigrationService({
      guestStorage,
      importGuestData,
      getAccountSettings,
      updateAccountSetting,
    });

    await service.migrate();

    expect(updateAccountSetting).not.toHaveBeenCalled();
    expect(guestStorage.migrations.completeSnapshot).toHaveBeenCalled();
  });

  test('keeps the snapshot when preference transfer fails after the data import', async () => {
    const guestStorage = createStorage();
    guestStorage.snapshot.settings = {
      language: 'id',
      currency: 'IDR',
      onboardingCompleted: 'true',
    };
    const preferenceError = Object.assign(new Error('preference rejected'), { status: 400 });
    const service = createGuestMigrationService({
      guestStorage,
      importGuestData: vi.fn().mockResolvedValue({ alreadyImported: false }),
      getAccountSettings: vi.fn().mockResolvedValue({}),
      updateAccountSetting: vi.fn().mockRejectedValue(preferenceError),
    });

    await expect(service.migrate()).rejects.toBe(preferenceError);

    expect(guestStorage.migrations.releaseSnapshot).not.toHaveBeenCalled();
    expect(guestStorage.migrations.completeSnapshot).not.toHaveBeenCalled();
  });

  test('preserves the same snapshot after a failed import so retry is safe', async () => {
    const guestStorage = createStorage();
    const importGuestData = vi.fn()
      .mockRejectedValueOnce(new Error('network failed'))
      .mockResolvedValueOnce({ alreadyImported: false });
    const service = createGuestMigrationService({ guestStorage, importGuestData });

    await expect(service.migrate()).rejects.toThrow('network failed');
    expect(guestStorage.migrations.completeSnapshot).not.toHaveBeenCalled();

    await expect(service.migrate()).resolves.toEqual({ alreadyImported: false });
    expect(importGuestData.mock.calls[0][0]).toEqual(importGuestData.mock.calls[1][0]);
    expect(guestStorage.migrations.completeSnapshot).toHaveBeenCalledTimes(1);
  });

  test('retries idempotently when the backend succeeds but snapshot cleanup fails', async () => {
    const guestStorage = createStorage();
    guestStorage.migrations.completeSnapshot
      .mockRejectedValueOnce(new Error('indexeddb cleanup failed'));
    const importGuestData = vi.fn()
      .mockResolvedValueOnce({ alreadyImported: false })
      .mockResolvedValueOnce({ alreadyImported: true });
    const service = createGuestMigrationService({ guestStorage, importGuestData });

    await expect(service.migrate()).rejects.toThrow('indexeddb cleanup failed');
    await expect(service.migrate()).resolves.toMatchObject({ alreadyImported: true });

    expect(importGuestData).toHaveBeenCalledTimes(2);
    expect(importGuestData.mock.calls[0][0]).toEqual(importGuestData.mock.calls[1][0]);
    expect(guestStorage.migrations.completeSnapshot).toHaveBeenCalledTimes(2);
  });

  test('releases a definitively rejected snapshot so local records can be fixed', async () => {
    const guestStorage = createStorage();
    const validationError = Object.assign(new Error('target date must be in the future'), {
      status: 400,
    });
    const importGuestData = vi.fn().mockRejectedValue(validationError);
    const service = createGuestMigrationService({ guestStorage, importGuestData });

    await expect(service.migrate()).rejects.toBe(validationError);

    expect(guestStorage.migrations.releaseSnapshot).toHaveBeenCalledWith(guestStorage.snapshot);
    expect(guestStorage.migrations.completeSnapshot).not.toHaveBeenCalled();
  });

  test('preserves an ambiguous failed snapshot for an idempotent retry', async () => {
    const guestStorage = createStorage();
    const serverError = Object.assign(new Error('temporary server failure'), { status: 500 });
    const importGuestData = vi.fn().mockRejectedValue(serverError);
    const service = createGuestMigrationService({ guestStorage, importGuestData });

    await expect(service.migrate()).rejects.toBe(serverError);

    expect(guestStorage.migrations.releaseSnapshot).not.toHaveBeenCalled();
    expect(guestStorage.migrations.completeSnapshot).not.toHaveBeenCalled();
  });

  test('does not call the backend when there is no guest snapshot to migrate', async () => {
    const guestStorage = createStorage();
    guestStorage.migrations.getOrCreateSnapshot.mockResolvedValue(null);
    const importGuestData = vi.fn();
    const service = createGuestMigrationService({ guestStorage, importGuestData });

    await expect(service.migrate()).resolves.toEqual({ skipped: true });
    expect(importGuestData).not.toHaveBeenCalled();
    expect(guestStorage.migrations.completeSnapshot).not.toHaveBeenCalled();
  });
});
