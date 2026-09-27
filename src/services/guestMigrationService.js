import { apiRequest } from './httpClient';
import {
  guestRepositories,
} from '../data/persistenceRepositories';

const supportedLanguages = new Set(['en', 'id']);
const supportedCurrencies = new Set(['USD', 'EUR', 'CNY', 'IDR']);

const transferableSettings = (settings = {}) => ({
  ...(supportedLanguages.has(settings.language) ? { language: settings.language } : {}),
  ...(supportedCurrencies.has(settings.currency) ? { currency: settings.currency } : {}),
  ...(String(settings.onboardingCompleted).toLowerCase() === 'true'
    ? { onboardingCompleted: 'true' }
    : {}),
});

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

const toMigrationValueEquivalent = (equivalent) => ({
  name: equivalent.name,
  amount: Number(equivalent.amount),
  currencyCode: equivalent.currencyCode,
});

export const createGuestMigrationService = ({
  guestStorage = guestRepositories,
  importGuestData = (payload) => apiRequest('/api/guest-migrations', {
    method: 'POST',
    json: payload,
    networkErrorMessage: 'Unable to migrate local guest data.',
  }),
  getAccountSettings = () => apiRequest('/api/settings'),
  updateAccountSetting = (key, value) => apiRequest(
    `/api/settings/${encodeURIComponent(key)}`,
    { method: 'PUT', json: { value } },
  ),
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
          valueEquivalents: (snapshot.valueEquivalents || []).map(toMigrationValueEquivalent),
        });
      } catch (error) {
        if (error?.status === 400) {
          await guestStorage.migrations.releaseSnapshot(snapshot);
        }
        throw error;
      }

      const guestSettings = transferableSettings(snapshot.settings);
      if (guestSettings.onboardingCompleted === 'true') {
        const accountSettings = await getAccountSettings();
        if (String(accountSettings?.onboardingCompleted).toLowerCase() !== 'true') {
          for (const [key, value] of Object.entries(guestSettings)) {
            await updateAccountSetting(key, value);
          }
        }
      }

      await guestStorage.migrations.completeSnapshot(snapshot);
    }
  },
});

export const guestMigrationService = createGuestMigrationService();
