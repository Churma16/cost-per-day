import { apiRequest } from './httpClient';
import {
  guestRepositories,
  hasGuestData,
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
  guestDataExists = hasGuestData,
} = {}) => ({
  async migrate() {
    if (!(await guestDataExists())) {
      return { skipped: true };
    }

    const [items, plannedPurchases, migrationId] = await Promise.all([
      guestStorage.items.list(),
      guestStorage.plannedPurchases.list(),
      guestStorage.meta.getOrCreateMigrationId(),
    ]);

    const result = await importGuestData({
      migrationId,
      items: items.map(toMigrationItem),
      plannedPurchases: plannedPurchases.map(toMigrationPlannedPurchase),
    });

    await guestStorage.clear();
    return result;
  },
});

export const guestMigrationService = createGuestMigrationService();
