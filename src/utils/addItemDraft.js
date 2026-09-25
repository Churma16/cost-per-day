export const ADD_ITEM_DRAFT_VERSION = 1;
export const ADD_ITEM_DRAFT_TTL_MS = 30 * 60 * 1000;
export const ADD_ITEM_DRAFT_WRITE_DELAY_MS = 400;

const ADD_ITEM_DRAFT_STORAGE_PREFIX = 'worthwhile:add-item-draft';
const DRAFT_STRING_FIELDS = [
  'name',
  'price',
  'category',
  'brand',
  'purchaseDate',
  'targetType',
  'targetValue',
  'targetMode',
  'selectedBenchmarkItemId',
];

const getStorage = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const isDraftDataValid = (data) => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return false;
  }

  if (!DRAFT_STRING_FIELDS.every((field) => typeof data[field] === 'string')) {
    return false;
  }

  const purchaseDate = new Date(`${data.purchaseDate}T12:00:00.000Z`);
  return !Number.isNaN(purchaseDate.getTime());
};

export const getAddItemDraftStorageKey = (userId) => {
  if (userId === null || userId === undefined) {
    return null;
  }

  const normalizedUserId = String(userId).trim();
  if (!normalizedUserId) {
    return null;
  }

  return `${ADD_ITEM_DRAFT_STORAGE_PREFIX}:${encodeURIComponent(normalizedUserId)}`;
};

export const clearAddItemDraft = (userId) => {
  const storage = getStorage();
  const storageKey = getAddItemDraftStorageKey(userId);

  if (!storage || !storageKey) {
    return;
  }

  try {
    storage.removeItem(storageKey);
  } catch {
    // Draft persistence is best-effort and must never break the form.
  }
};

export const readAddItemDraft = (userId, now = Date.now()) => {
  const storage = getStorage();
  const storageKey = getAddItemDraftStorageKey(userId);

  if (!storage || !storageKey) {
    return null;
  }

  let parsedDraft;

  try {
    const storedDraft = storage.getItem(storageKey);
    if (!storedDraft) {
      return null;
    }

    parsedDraft = JSON.parse(storedDraft);
  } catch {
    clearAddItemDraft(userId);
    return null;
  }

  const isCompatible =
    parsedDraft?.version === ADD_ITEM_DRAFT_VERSION &&
    Number.isFinite(parsedDraft?.savedAt) &&
    isDraftDataValid(parsedDraft?.data);

  if (!isCompatible || now - parsedDraft.savedAt >= ADD_ITEM_DRAFT_TTL_MS) {
    clearAddItemDraft(userId);
    return null;
  }

  return parsedDraft;
};

export const writeAddItemDraft = (userId, data, savedAt = Date.now()) => {
  const storage = getStorage();
  const storageKey = getAddItemDraftStorageKey(userId);

  if (
    !storage ||
    !storageKey ||
    !Number.isFinite(savedAt) ||
    !isDraftDataValid(data)
  ) {
    return false;
  }

  try {
    storage.setItem(storageKey, JSON.stringify({
      version: ADD_ITEM_DRAFT_VERSION,
      savedAt,
      data,
    }));
    return true;
  } catch {
    return false;
  }
};
