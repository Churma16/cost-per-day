import { beforeEach, describe, expect, test } from 'vitest';
import {
  PLANNED_PURCHASE_DRAFT_TTL_MS,
  PLANNED_PURCHASE_DRAFT_VERSION,
  clearPlannedPurchaseDraft,
  getPlannedPurchaseDraftStorageKey,
  readPlannedPurchaseDraft,
  writePlannedPurchaseDraft,
} from '../../src/utils/plannedPurchaseDraft';

const createDraft = (overrides = {}) => ({
  name: 'Camera',
  targetPrice: '1200',
  currencyCode: 'USD',
  planningMode: 'contributionToTime',
  contributionCadence: 'monthly',
  contributionAmount: '100',
  targetDate: '',
  ...overrides,
});

describe('plannedPurchaseDraft', () => {
  beforeEach(() => window.localStorage.clear());

  test('stores drafts independently by authenticated user', () => {
    const savedAt = 1_790_000_000_000;
    expect(writePlannedPurchaseDraft('user-1', createDraft(), savedAt)).toBe(true);
    expect(readPlannedPurchaseDraft('user-1', savedAt + 1_000)).toEqual({
      version: PLANNED_PURCHASE_DRAFT_VERSION,
      savedAt,
      data: createDraft(),
    });
    expect(readPlannedPurchaseDraft('user-2', savedAt + 1_000)).toBeNull();
  });

  test('expires stale drafts', () => {
    const savedAt = 1_790_000_000_000;
    writePlannedPurchaseDraft('user-1', createDraft(), savedAt);
    expect(readPlannedPurchaseDraft('user-1', savedAt + PLANNED_PURCHASE_DRAFT_TTL_MS)).toBeNull();
  });

  test('rejects incompatible shapes and clears only the requested user', () => {
    const key = getPlannedPurchaseDraftStorageKey('user-1');
    window.localStorage.setItem(key, JSON.stringify({
      version: PLANNED_PURCHASE_DRAFT_VERSION,
      savedAt: Date.now(),
      data: createDraft({ planningMode: 'invalid' }),
    }));
    expect(readPlannedPurchaseDraft('user-1')).toBeNull();

    writePlannedPurchaseDraft('user-1', createDraft({ name: 'One' }));
    writePlannedPurchaseDraft('user-2', createDraft({ name: 'Two' }));
    clearPlannedPurchaseDraft('user-1');
    expect(readPlannedPurchaseDraft('user-1')).toBeNull();
    expect(readPlannedPurchaseDraft('user-2')?.data.name).toBe('Two');
  });
});
