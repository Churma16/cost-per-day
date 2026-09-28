import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  usePlannedPurchases,
  useUpdatePlannedPurchase,
  useDeletePlannedPurchase,
} from '../hooks/usePlannedPurchases';
import PlannedPurchaseCard from './PlannedPurchaseCard';
import PlannedPurchaseEditDialog from './planned-purchase/PlannedPurchaseEditDialog';
import { PageHeader } from './ui/PageHeader';
import { PageContainer } from './ui/PageContainer';
import {
  EmptyState,
  ErrorCard,
  NoticeCard,
  PlannedPurchaseListSkeleton,
  SlowLoadIndicator,
  ActionLoadingContent,
} from './ui/AsyncState';
import { useLoadingPhases } from '../hooks/useLoadingPhases';
import { useAuth } from '../contexts/AuthContext';

function PlansListHeader({ title }) {
  return (
    <div className="flex items-center justify-between px-1">
      <span className="text-sm font-bold text-[#20242A]">{title}</span>
    </div>
  );
}

function PlannedPurchases() {
  const { t } = useTranslation();
  const { isGuest = false } = useAuth() ?? {};
  const navigate = useNavigate();
  const {
    data: plannedPurchasesData,
    isLoading,
    isError,
    isRefetchError,
    refetch,
  } = usePlannedPurchases();
  const plannedPurchases = plannedPurchasesData ?? [];
  const loadingState = useLoadingPhases(
    isLoading && plannedPurchasesData === undefined
  );

  const updateMutation = useUpdatePlannedPurchase();
  const deleteMutation = useDeletePlannedPurchase();

  const [expandedPurchaseId, setExpandedPurchaseId] = useState(null);
  const [updatingScenarioId, setUpdatingScenarioId] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [actionError, setActionError] = useState(null);

  const handleToggleExpand = useCallback((id) => {
    setActionError(null);
    setExpandedPurchaseId((currentId) => (currentId === id ? null : id));
  }, []);

  const handleOpenEdit = useCallback((item) => {
    setEditingItem(item);
    setActionError(null);
  }, []);

  const handleCloseForm = useCallback(() => {
    setEditingItem(null);
    setActionError(null);
  }, []);

  const handleDeleteRequest = useCallback((id) => {
    setActionError(null);
    setDeletingId(id);
  }, []);

  const handleCloseDeleteModal = useCallback(() => {
    setDeletingId(null);
  }, []);

  const handleFormSubmit = useCallback(async (payload) => {
    setActionError(null);
    try {
      await updateMutation.mutateAsync({
        plannedPurchaseId: editingItem?.id,
        plannedPurchasePayload: payload,
      });
      handleCloseForm();
    } catch (err) {
      setActionError(t('errorUpdatingPlannedPurchase'));
    }
  }, [editingItem?.id, updateMutation, handleCloseForm, t]);

  const handleApplyScenario = useCallback(async ({ plannedPurchaseId, contributionAmount, contributionCadence }) => {
    setActionError(null);
    setUpdatingScenarioId(plannedPurchaseId);
    try {
      const existingPurchase = plannedPurchases.find((item) => item.id === plannedPurchaseId);
      if (!existingPurchase) return;

      const payload = {
        name: existingPurchase.name,
        targetPrice: Number(existingPurchase.targetPrice),
        currencyCode: existingPurchase.currencyCode,
        targetDate: null,
        contributionAmount: Number(contributionAmount),
        contributionCadence: contributionCadence,
      };

      await updateMutation.mutateAsync({
        plannedPurchaseId,
        plannedPurchasePayload: payload,
      });
    } catch (err) {
      const message = t('errorUpdatingPlannedPurchase');
      setActionError(message);
      throw err;
    } finally {
      setUpdatingScenarioId(null);
    }
  }, [plannedPurchases, updateMutation, t]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingId) return;
    try {
      await deleteMutation.mutateAsync(deletingId);
      setExpandedPurchaseId((currentExpandedId) =>
        currentExpandedId === deletingId ? null : currentExpandedId
      );
      setDeletingId(null);
    } catch (err) {
      setActionError(t('errorDeletingPlannedPurchase'));
    }
  }, [deletingId, deleteMutation, t]);

  const isMutating = updateMutation.isPending || deleteMutation.isPending;

  return (
    <PageContainer className="planning-page-content">
      {/* Intro Header & Philosophy */}
      <PageHeader
        title={t('plannedPurchases')}
        subtitle={t('planningSubtitle')}
      />

      {/* Planned-purchase editing modal drawer */}
      <PlannedPurchaseEditDialog
        isOpen={Boolean(editingItem)}
        item={editingItem}
        onClose={handleCloseForm}
        onSubmit={handleFormSubmit}
        isSubmitting={isMutating}
        errorMessage={actionError}
      />

      {/* Stable section label with state-specific content below it. */}
      <div className="space-y-2.5">
        <PlansListHeader title={t('yourPlans')} />
        {loadingState.phase !== 'idle' ? (
          <div aria-busy="true" className="min-h-[196px]">
            {loadingState.phase !== 'blank' && (
              <>
                <PlannedPurchaseListSkeleton
                  count={3}
                  paused={loadingState.showSlowIndicator}
                />
                {loadingState.showSlowIndicator && (
                  <SlowLoadIndicator message={t('stillLoadingPlans')} />
                )}
              </>
            )}
          </div>
        ) : isError && plannedPurchasesData === undefined ? (
          <NoticeCard
            body={t('planningLoadErrorDescription')}
            actionLabel={t('tryAgain')}
            onAction={() => refetch()}
          />
        ) : (
          <>
            {plannedPurchasesData !== undefined && (isRefetchError || isError) && (
              <NoticeCard
                body={t('refreshShowingSavedData')}
                actionLabel={t('tryAgain')}
                onAction={() => refetch()}
                className="mb-2.5"
              />
            )}
            {plannedPurchases.length === 0 ? (
              <EmptyState
                motif="planning"
                title={t('noPlannedPurchases')}
                description={t('noPlannedPurchasesDescription')}
                actionLabel={t('newPlan')}
                onAction={() => navigate('/add?type=planned')}
              />
            ) : (
              /* List of Cards */
              <div className="state-content-enter space-y-2.5" data-plans-state="loaded">
                <div className="space-y-3">
              {plannedPurchases.map((plannedPurchase) => (
                <PlannedPurchaseCard
                  key={plannedPurchase.id}
                  plannedPurchase={plannedPurchase}
                  isExpanded={expandedPurchaseId === plannedPurchase.id}
                  onToggle={handleToggleExpand}
                  onEdit={handleOpenEdit}
                  onDelete={handleDeleteRequest}
                  onApplyScenario={handleApplyScenario}
                  isUpdating={updatingScenarioId === plannedPurchase.id && updateMutation.isPending}
                  updateError={updatingScenarioId === plannedPurchase.id ? actionError : null}
                />
              ))}
            </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 space-y-4 border border-gray-200">
            <h4 className="font-bold text-gray-900 text-base">{t('confirmDelete')}</h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              {t(isGuest
                ? 'confirmDeletePlannedPurchaseDevice'
                : 'confirmDeletePlannedPurchaseAccount')}
            </p>
            {actionError && (
              <ErrorCard
                title={t('planDeleteErrorTitle')}
                body={t('planDeleteErrorBody')}
                onDismiss={() => setActionError(null)}
              />
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                autoFocus
                onClick={handleCloseDeleteModal}
                className="flex-1 rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[#F6F7F8]"
              >
                {t('keepIt')}
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isMutating}
                className="flex-1 rounded-xl border-[1.5px] border-[var(--error-outline)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--error-text)] disabled:opacity-50"
              >
                {isMutating ? <ActionLoadingContent label={t('deleting')} /> : t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

export default PlannedPurchases;
