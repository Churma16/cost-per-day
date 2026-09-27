import { apiRequest } from './httpClient';
import {
  guestRepositories,
} from '../data/persistenceRepositories';

const toMigrationItem = (item) => ({
  name: item.name,
  price: Number(item.price),
  purchaseDate: item.purchaseDate,
  status: item.status || 'active',
  endedAt: item.endedAt ?? null,
  salePrice: item.salePrice === undefined ? null : item.salePrice,
  category: item.category ?? null,
  brand: item.brand ?? null,
  targetType: item.targetType ?? null,
  targetValue: item.targetValue === undefined ? null : item.targetValue,
});

const toMigrationPlannedPurchase = (plannedPurchase) => ({
  name: plannedPurchase.name,
  targetPrice: Number(plannedPurchase.targetPrice),
  currencyCode: plannedPurchase.currencyCode,
  targetDate: plannedPurchase.targetDate ?? null,
  contributionAmount: plannedPurchase.contributionAmount ?? null,
  contributionCadence: plannedPurchase.contributionCadence ?? null,
});

export const createGuestMigrationService = ({
  guestStorage = guestRepositories,
  importGuestData = (payload) => apiRequest('/api/guest-migrations', {
    method: 'POST',
    json: payload,
    networkErrorMessage: 'Unable to migrate local guest data.',
  }),
} = {}) => ({
  async migrate() {
    let lastResult = null;

    while (true) {
      const snapshot = await guestStorage.migrations.getOrCreateSnapshot();
      if (!snapshot) {
        return lastResult || { skipped: true };
      }

      try {
        lastResult = await importGuestData({
          migrationId: snapshot.migrationId,
          items: snapshot.items.map(toMigrationItem),
          plannedPurchases: snapshot.plannedPurchases.map(toMigrationPlannedPurchase),
        });
      } catch (error) {
        if (error?.status === 400) {
          await guestStorage.migrations.releaseSnapshot(snapshot);
        }
        throw error;
      }

      await guestStorage.migrations.completeSnapshot(snapshot);
    }
  },
});

export const guestMigrationService = createGuestMigrationService();
