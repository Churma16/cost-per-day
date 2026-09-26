import { describe, expect, test, vi } from 'vitest';
import { createGuestMigrationService } from '../../src/services/guestMigrationService';

const createStorage = () => ({
  items: {
    list: vi.fn().mockResolvedValue([{
      id: 'guest-item-1',
      userId: 'untrusted-owner',
      name: 'Camera',
      price: 1200,
      purchaseDate: '2026-09-20',
      status: 'active',
      ownershipDays: 7,
      grossCostPerDay: 171.42,
    }]),
  },
  plannedPurchases: {
    list: vi.fn().mockResolvedValue([{
      id: 'guest-plan-1',
      userId: 'untrusted-owner',
      name: 'Lens',
      targetPrice: 500,
      currencyCode: 'USD',
      estimatedDays: 10,
    }]),
  },
  meta: {
    getOrCreateMigrationId: vi.fn().mockResolvedValue('guest-migration-stable'),
  },
  clear: vi.fn().mockResolvedValue(undefined),
});

describe('guest migration orchestration', () => {
  test('imports sanitized guest payload and clears local data only after confirmation', async () => {
    const guestStorage = createStorage();
    const importGuestData = vi.fn().mockResolvedValue({
      importedItems: 1,
      importedPlannedPurchases: 1,
    });
    const service = createGuestMigrationService({
      guestStorage,
      importGuestData,
      guestDataExists: vi.fn().mockResolvedValue(true),
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
    });
    expect(guestStorage.clear).toHaveBeenCalledTimes(1);
  });

  test('preserves local guest data and migration id after a failed import so retry is safe', async () => {
    const guestStorage = createStorage();
    const importGuestData = vi.fn()
      .mockRejectedValueOnce(new Error('network failed'))
      .mockResolvedValueOnce({ alreadyImported: false });
    const service = createGuestMigrationService({
      guestStorage,
      importGuestData,
      guestDataExists: vi.fn().mockResolvedValue(true),
    });

    await expect(service.migrate()).rejects.toThrow('network failed');
    expect(guestStorage.clear).not.toHaveBeenCalled();

    await expect(service.migrate()).resolves.toEqual({ alreadyImported: false });
    expect(guestStorage.meta.getOrCreateMigrationId).toHaveBeenCalledTimes(2);
    expect(importGuestData.mock.calls[0][0].migrationId).toBe('guest-migration-stable');
    expect(importGuestData.mock.calls[1][0].migrationId).toBe('guest-migration-stable');
    expect(guestStorage.clear).toHaveBeenCalledTimes(1);
  });

  test('does not call the backend when there is no guest data to migrate', async () => {
    const guestStorage = createStorage();
    const importGuestData = vi.fn();
    const service = createGuestMigrationService({
      guestStorage,
      importGuestData,
      guestDataExists: vi.fn().mockResolvedValue(false),
    });

    await expect(service.migrate()).resolves.toEqual({ skipped: true });
    expect(importGuestData).not.toHaveBeenCalled();
    expect(guestStorage.clear).not.toHaveBeenCalled();
  });
});
