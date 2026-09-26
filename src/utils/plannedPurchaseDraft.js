export const PLANNED_PURCHASE_DRAFT_VERSION = 1;
export const PLANNED_PURCHASE_DRAFT_TTL_MS = 30 * 60 * 1000;
export const PLANNED_PURCHASE_DRAFT_WRITE_DELAY_MS = 400;

const STORAGE_PREFIX = 'worthwhile:planned-purchase-draft';
const STRING_FIELDS = [
  'name',
  'targetPrice',
  'currencyCode',
  'planningMode',
  'contributionCadence',
  'contributionAmount',
  'targetDate',
];

const getStorage = () => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const isDraftDataValid = (data) => (
  data &&
  typeof data === 'object' &&
  !Array.isArray(data) &&
  STRING_FIELDS.every((field) => typeof data[field] === 'string') &&
  ['contributionToTime', 'targetDateToContribution'].includes(data.planningMode)
);

export const getPlannedPurchaseDraftStorageKey = (userId) => {
  if (userId === null || userId === undefined) return null;
  const normalizedUserId = String(userId).trim();
  return normalizedUserId
    ? `${STORAGE_PREFIX}:${encodeURIComponent(normalizedUserId)}`
    : null;
};

export const clearPlannedPurchaseDraft = (userId) => {
  const storage = getStorage();
  const storageKey = getPlannedPurchaseDraftStorageKey(userId);
  if (!storage || !storageKey) return;
  try {
    storage.removeItem(storageKey);
  } catch {
    // Draft persistence is best-effort and must never break the form.
  }
};

export const readPlannedPurchaseDraft = (userId, now = Date.now()) => {
  const storage = getStorage();
  const storageKey = getPlannedPurchaseDraftStorageKey(userId);
  if (!storage || !storageKey) return null;

  let parsedDraft;
  try {
    const storedDraft = storage.getItem(storageKey);
    if (!storedDraft) return null;
    parsedDraft = JSON.parse(storedDraft);
  } catch {
    clearPlannedPurchaseDraft(userId);
    return null;
  }

  const isCompatible =
    parsedDraft?.version === PLANNED_PURCHASE_DRAFT_VERSION &&
    Number.isFinite(parsedDraft?.savedAt) &&
    isDraftDataValid(parsedDraft?.data);

  if (!isCompatible || now - parsedDraft.savedAt >= PLANNED_PURCHASE_DRAFT_TTL_MS) {
    clearPlannedPurchaseDraft(userId);
    return null;
  }

  return parsedDraft;
};

export const writePlannedPurchaseDraft = (userId, data, savedAt = Date.now()) => {
  const storage = getStorage();
  const storageKey = getPlannedPurchaseDraftStorageKey(userId);
  if (!storage || !storageKey || !Number.isFinite(savedAt) || !isDraftDataValid(data)) {
    return false;
  }

  try {
    storage.setItem(storageKey, JSON.stringify({
      version: PLANNED_PURCHASE_DRAFT_VERSION,
      savedAt,
      data,
    }));
    return true;
  } catch {
    return false;
  }
};
