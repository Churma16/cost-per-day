import { useCallback, useEffect, useRef } from 'react';
import {
  ADD_ITEM_DRAFT_WRITE_DELAY_MS,
  clearAddItemDraft,
  readAddItemDraft,
  writeAddItemDraft,
} from '../utils/addItemDraft';

export const getInitialAddItemDraft = ({ enabled, userId }) => {
  if (!enabled) {
    return null;
  }

  return readAddItemDraft(userId)?.data ?? null;
};

export const useAddItemDraft = ({
  enabled,
  userId,
  draftData,
  initialDraft = null,
}) => {
  const serializedDraftData = JSON.stringify(draftData);
  const lastPersistedDraftDataRef = useRef(
    initialDraft ? JSON.stringify(initialDraft) : serializedDraftData
  );
  const draftWriteTimeoutRef = useRef(null);
  const latestDraftDataRef = useRef(draftData);
  const latestSerializedDraftDataRef = useRef(serializedDraftData);

  latestDraftDataRef.current = draftData;
  latestSerializedDraftDataRef.current = serializedDraftData;

  const cancelPendingWrite = useCallback(() => {
    if (draftWriteTimeoutRef.current !== null) {
      window.clearTimeout(draftWriteTimeoutRef.current);
      draftWriteTimeoutRef.current = null;
    }
  }, []);

  const flushPendingDraft = useCallback(() => {
    cancelPendingWrite();

    if (
      !enabled ||
      !userId ||
      latestSerializedDraftDataRef.current === lastPersistedDraftDataRef.current
    ) {
      return;
    }

    if (writeAddItemDraft(userId, latestDraftDataRef.current)) {
      lastPersistedDraftDataRef.current = latestSerializedDraftDataRef.current;
    }
  }, [cancelPendingWrite, enabled, userId]);

  useEffect(() => {
    if (
      !enabled ||
      !userId ||
      serializedDraftData === lastPersistedDraftDataRef.current
    ) {
      return undefined;
    }

    draftWriteTimeoutRef.current = window.setTimeout(() => {
      if (writeAddItemDraft(userId, latestDraftDataRef.current)) {
        lastPersistedDraftDataRef.current = latestSerializedDraftDataRef.current;
      }
      draftWriteTimeoutRef.current = null;
    }, ADD_ITEM_DRAFT_WRITE_DELAY_MS);

    return cancelPendingWrite;
  }, [
    cancelPendingWrite,
    enabled,
    serializedDraftData,
    userId,
  ]);

  useEffect(() => {
    if (!enabled || !userId) {
      return undefined;
    }

    window.addEventListener('pagehide', flushPendingDraft);
    return () => {
      window.removeEventListener('pagehide', flushPendingDraft);
      flushPendingDraft();
    };
  }, [enabled, flushPendingDraft, userId]);

  const clearDraft = useCallback((nextDraftData = latestDraftDataRef.current) => {
    cancelPendingWrite();
    clearAddItemDraft(userId);

    const serializedNextDraftData = JSON.stringify(nextDraftData);
    latestDraftDataRef.current = nextDraftData;
    latestSerializedDraftDataRef.current = serializedNextDraftData;
    lastPersistedDraftDataRef.current = serializedNextDraftData;
  }, [cancelPendingWrite, userId]);

  return {
    clearDraft,
    flushPendingDraft,
  };
};
