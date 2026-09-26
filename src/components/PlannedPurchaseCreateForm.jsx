import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useCreatePlannedPurchase } from '../hooks/usePlannedPurchases';
import {
  PLANNED_PURCHASE_DRAFT_WRITE_DELAY_MS,
  clearPlannedPurchaseDraft,
  readPlannedPurchaseDraft,
  writePlannedPurchaseDraft,
} from '../utils/plannedPurchaseDraft';
import PlannedPurchaseForm from './PlannedPurchaseForm';

function PlannedPurchaseCreateForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth() ?? {};
  const userId = user?.id ?? null;
  const createMutation = useCreatePlannedPurchase();
  const initialDraft = useMemo(
    () => readPlannedPurchaseDraft(userId)?.data ?? null,
    [userId]
  );
  const [errorMessage, setErrorMessage] = useState(null);
  const draftTimeoutRef = useRef(null);
  const latestDraftRef = useRef(initialDraft);
  const latestSerializedDraftRef = useRef(initialDraft ? JSON.stringify(initialDraft) : null);
  const lastPersistedDraftRef = useRef(initialDraft ? JSON.stringify(initialDraft) : null);

  const flushDraft = useCallback(() => {
    if (draftTimeoutRef.current !== null) {
      window.clearTimeout(draftTimeoutRef.current);
      draftTimeoutRef.current = null;
    }
    if (
      latestDraftRef.current &&
      latestSerializedDraftRef.current !== lastPersistedDraftRef.current &&
      writePlannedPurchaseDraft(userId, latestDraftRef.current)
    ) {
      lastPersistedDraftRef.current = latestSerializedDraftRef.current;
    }
  }, [userId]);

  useEffect(() => {
    window.addEventListener('pagehide', flushDraft);
    return () => {
      window.removeEventListener('pagehide', flushDraft);
      flushDraft();
    };
  }, [flushDraft]);

  const handleDraftChange = useCallback((draft) => {
    const serializedDraft = JSON.stringify(draft);
    latestDraftRef.current = draft;
    latestSerializedDraftRef.current = serializedDraft;
    if (lastPersistedDraftRef.current === null) {
      lastPersistedDraftRef.current = serializedDraft;
      return;
    }
    if (serializedDraft === lastPersistedDraftRef.current) return;
    if (!userId) return;
    if (draftTimeoutRef.current !== null) {
      window.clearTimeout(draftTimeoutRef.current);
    }
    draftTimeoutRef.current = window.setTimeout(() => {
      if (writePlannedPurchaseDraft(userId, latestDraftRef.current)) {
        lastPersistedDraftRef.current = latestSerializedDraftRef.current;
      }
      draftTimeoutRef.current = null;
    }, PLANNED_PURCHASE_DRAFT_WRITE_DELAY_MS);
  }, [userId]);

  const handleSubmit = async (payload) => {
    setErrorMessage(null);
    try {
      await createMutation.mutateAsync(payload);
      if (draftTimeoutRef.current !== null) {
        window.clearTimeout(draftTimeoutRef.current);
        draftTimeoutRef.current = null;
      }
      latestDraftRef.current = null;
      latestSerializedDraftRef.current = null;
      clearPlannedPurchaseDraft(userId);
      navigate('/planning');
    } catch (error) {
      setErrorMessage(error.message || t('operationFailed'));
    }
  };

  return (
    <div className="px-3.5 py-1.5 pb-8 form-page-content">
      <PlannedPurchaseForm
        initialData={initialDraft}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/planning')}
        isSubmitting={createMutation.isPending}
        errorMessage={errorMessage}
        onDraftChange={handleDraftChange}
      />
    </div>
  );
}

export default PlannedPurchaseCreateForm;
