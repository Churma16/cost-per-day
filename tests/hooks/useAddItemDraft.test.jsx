import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getInitialAddItemDraft,
  useAddItemDraft,
} from '../../src/hooks/useAddItemDraft';
import {
  ADD_ITEM_DRAFT_WRITE_DELAY_MS,
  getAddItemDraftStorageKey,
  readAddItemDraft,
  writeAddItemDraft,
} from '../../src/utils/addItemDraft';

const createDraftData = (overrides = {}) => ({
  name: '',
  price: '',
  category: '',
  brand: '',
  purchaseDate: '2026-09-26',
  targetType: 'none',
  targetValue: '',
  targetMode: 'manual',
  selectedBenchmarkItemId: '',
  ...overrides,
});

describe('useAddItemDraft', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('restores drafts only for Add mode and the authenticated user', () => {
    const draft = createDraftData({ name: 'Private draft' });
    writeAddItemDraft('user-1', draft);

    expect(getInitialAddItemDraft({
      enabled: true,
      userId: 'user-1',
    })).toEqual(draft);
    expect(getInitialAddItemDraft({
      enabled: false,
      userId: 'user-1',
    })).toBeNull();
    expect(getInitialAddItemDraft({
      enabled: true,
      userId: 'user-2',
    })).toBeNull();
  });

  it('debounces dirty draft writes', () => {
    vi.useFakeTimers();
    const storageKey = getAddItemDraftStorageKey('user-1');
    const initialData = createDraftData();

    const { rerender } = renderHook(
      ({ draftData }) => useAddItemDraft({
        enabled: true,
        userId: 'user-1',
        draftData,
      }),
      { initialProps: { draftData: initialData } }
    );

    rerender({ draftData: createDraftData({ name: 'Draft laptop' }) });

    act(() => {
      vi.advanceTimersByTime(ADD_ITEM_DRAFT_WRITE_DELAY_MS - 1);
    });
    expect(window.localStorage.getItem(storageKey)).toBeNull();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(readAddItemDraft('user-1')?.data.name).toBe('Draft laptop');
  });

  it('flushes the latest dirty draft on pagehide and unmount', () => {
    vi.useFakeTimers();
    const initialData = createDraftData();

    const view = renderHook(
      ({ draftData }) => useAddItemDraft({
        enabled: true,
        userId: 'user-1',
        draftData,
      }),
      { initialProps: { draftData: initialData } }
    );

    view.rerender({ draftData: createDraftData({ name: 'Pagehide draft' }) });
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    expect(readAddItemDraft('user-1')?.data.name).toBe('Pagehide draft');

    view.rerender({ draftData: createDraftData({ name: 'Unmount draft' }) });
    view.unmount();
    expect(readAddItemDraft('user-1')?.data.name).toBe('Unmount draft');
  });

  it('clears persisted data without recreating it during cleanup', () => {
    vi.useFakeTimers();
    const draft = createDraftData({ name: 'Saved draft' });
    writeAddItemDraft('user-1', draft);

    const view = renderHook(() => useAddItemDraft({
      enabled: true,
      userId: 'user-1',
      draftData: draft,
      initialDraft: draft,
    }));

    act(() => {
      view.result.current.clearDraft();
    });
    expect(readAddItemDraft('user-1')).toBeNull();

    view.unmount();
    expect(readAddItemDraft('user-1')).toBeNull();
  });
});
