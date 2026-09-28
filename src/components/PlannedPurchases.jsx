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
import { InlineStateNotice, StatePanel } from './ui/AsyncState';

function PlannedPurchases() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    data: plannedPurchasesData,
    isLoading,
    isError,
    isRefetchError,
    refetch,
  } = usePlannedPurchases();
  const plannedPurchases = plannedPurchasesData ?? [];

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

      {/* Loading, error, and empty states */}
      {isLoading && plannedPurchasesData === undefined ? (
        <StatePanel
          variant="loading"
          title={t('planningLoadingTitle')}
          description={t('planningLoadingDescription')}
        />
      ) : isError && plannedPurchasesData === undefined ? (
        <StatePanel
          variant="error"
          title={t('planningLoadErrorTitle')}
          description={t('planningLoadErrorDescription')}
          actionLabel={t('retry')}
          onAction={() => refetch()}
        />
      ) : plannedPurchases.length === 0 ? (
        <StatePanel
          variant="empty"
          title={t('noPlannedPurchases')}
          description={t('noPlannedPurchasesDescription')}
          actionLabel={t('addFirstPlan')}
          onAction={() => navigate('/add?type=planned')}
        />
      ) : (
        /* List of Cards */
        <div className="space-y-2.5">
          {plannedPurchasesData !== undefined && (isRefetchError || isError) && (
            <InlineStateNotice
              variant="error"
              message={t('planningRefreshError')}
              actionLabel={t('retry')}
              onAction={() => refetch()}
            />
          )}
          <div className="flex items-center justify-between px-1">
            <span className="font-bold text-[#20242A] text-sm">
              {t('yourPlans')}
            </span>
          </div>

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

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 space-y-4 border border-gray-200">
            <h4 className="font-bold text-gray-900 text-base">{t('confirmDelete')}</h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              {t('confirmDeletePlannedPurchase')}
            </p>
            {actionError && (
              <InlineStateNotice
                variant="error"
                message={actionError}
              />
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleCloseDeleteModal}
                className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isMutating}
                className="px-3 py-1.5 rounded-lg bg-red-600 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isMutating ? t('loading') : t('confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

export default PlannedPurchases;
