import { beforeEach, describe, expect, test } from 'vitest';
import {
  ADD_ITEM_DRAFT_TTL_MS,
  ADD_ITEM_DRAFT_VERSION,
  clearAddItemDraft,
  getAddItemDraftStorageKey,
  readAddItemDraft,
  writeAddItemDraft,
} from '../../src/utils/addItemDraft';

const createDraftData = (overrides = {}) => ({
  name: 'Laptop',
  price: '1200',
  category: 'Tech',
  brand: 'Example',
  purchaseDate: '2026-09-20',
  targetType: 'none',
  targetValue: '',
  targetMode: 'manual',
  selectedBenchmarkItemId: '',
  ...overrides,
});

describe('addItemDraft', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('stores drafts in an authenticated-user namespace', () => {
    const savedAt = 1_790_000_000_000;
    const draftData = createDraftData();

    expect(writeAddItemDraft('user-1', draftData, savedAt)).toBe(true);
    expect(readAddItemDraft('user-1', savedAt + 1_000)).toEqual({
      version: ADD_ITEM_DRAFT_VERSION,
      savedAt,
      data: draftData,
    });
    expect(readAddItemDraft('user-2', savedAt + 1_000)).toBeNull();
  });

  test('reading a fresh draft does not refresh its savedAt timestamp', () => {
    const savedAt = 1_790_000_000_000;
    const storageKey = getAddItemDraftStorageKey('user-1');
    writeAddItemDraft('user-1', createDraftData(), savedAt);

    readAddItemDraft('user-1', savedAt + 5_000);

    expect(JSON.parse(window.localStorage.getItem(storageKey)).savedAt).toBe(savedAt);
  });

  test('expires and removes drafts at exactly the 30-minute TTL', () => {
    const savedAt = 1_790_000_000_000;
    const storageKey = getAddItemDraftStorageKey('user-1');
    writeAddItemDraft('user-1', createDraftData(), savedAt);

    expect(readAddItemDraft('user-1', savedAt + ADD_ITEM_DRAFT_TTL_MS)).toBeNull();
    expect(window.localStorage.getItem(storageKey)).toBeNull();
  });

  test('removes corrupt JSON without throwing', () => {
    const storageKey = getAddItemDraftStorageKey('user-1');
    window.localStorage.setItem(storageKey, '{invalid json');

    expect(() => readAddItemDraft('user-1')).not.toThrow();
    expect(readAddItemDraft('user-1')).toBeNull();
    expect(window.localStorage.getItem(storageKey)).toBeNull();
  });

  test('removes incompatible draft versions', () => {
    const storageKey = getAddItemDraftStorageKey('user-1');
    window.localStorage.setItem(storageKey, JSON.stringify({
      version: ADD_ITEM_DRAFT_VERSION + 1,
      savedAt: Date.now(),
      data: createDraftData(),
    }));

    expect(readAddItemDraft('user-1')).toBeNull();
    expect(window.localStorage.getItem(storageKey)).toBeNull();
  });

  test('rejects unsafe serialized draft shapes', () => {
    const storageKey = getAddItemDraftStorageKey('user-1');
    window.localStorage.setItem(storageKey, JSON.stringify({
      version: ADD_ITEM_DRAFT_VERSION,
      savedAt: Date.now(),
      data: createDraftData({ purchaseDate: 'not-a-date' }),
    }));

    expect(readAddItemDraft('user-1')).toBeNull();
    expect(window.localStorage.getItem(storageKey)).toBeNull();
  });

  test('clearAddItemDraft removes only the selected user draft', () => {
    writeAddItemDraft('user-1', createDraftData({ name: 'One' }));
    writeAddItemDraft('user-2', createDraftData({ name: 'Two' }));

    clearAddItemDraft('user-1');

    expect(readAddItemDraft('user-1')).toBeNull();
    expect(readAddItemDraft('user-2')?.data.name).toBe('Two');
  });
});
