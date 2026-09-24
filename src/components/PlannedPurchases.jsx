import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  usePlannedPurchases,
  useCreatePlannedPurchase,
  useUpdatePlannedPurchase,
  useDeletePlannedPurchase,
} from '../hooks/usePlannedPurchases';
import PlannedPurchaseCard from './PlannedPurchaseCard';
import PlannedPurchaseForm from './PlannedPurchaseForm';
import { IoAddOutline, IoTimeOutline } from 'react-icons/io5';

function PlannedPurchases() {
  const { t } = useTranslation();
  const { data: plannedPurchasesData, isLoading, isError, error, refetch } = usePlannedPurchases();
  const plannedPurchases = plannedPurchasesData ?? [];

  const createMutation = useCreatePlannedPurchase();
  const updateMutation = useUpdatePlannedPurchase();
  const deleteMutation = useDeletePlannedPurchase();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [actionError, setActionError] = useState(null);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setActionError(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setActionError(null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingItem(null);
    setActionError(null);
  };

  const handleFormSubmit = async (payload) => {
    setActionError(null);
    try {
      if (editingItem) {
        await updateMutation.mutateAsync({
          plannedPurchaseId: editingItem.id,
          plannedPurchasePayload: payload,
        });
      } else {
        await createMutation.mutateAsync(payload);
      }
      handleCloseForm();
    } catch (err) {
      setActionError(err.message || 'Operation failed. Please try again.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    try {
      await deleteMutation.mutateAsync(deletingId);
      setDeletingId(null);
    } catch (err) {
      setActionError(err.message || 'Failed to delete planned purchase.');
    }
  };

  const isMutating =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <div className="px-4 pt-4 pb-8 space-y-5 max-w-3xl mx-auto planning-page-content">
      {/* Intro Header & Philosophy */}
      <div className="rounded-2xl p-5 bg-gradient-to-br from-teal-800 via-teal-700 to-cyan-800 text-white shadow-sm space-y-2">
        <div className="flex items-center gap-2">
          <IoTimeOutline className="text-xl text-teal-200" />
          <h1 className="text-lg font-bold tracking-tight">{t('plannedPurchases')}</h1>
        </div>
        <p className="text-xs sm:text-sm text-teal-100 max-w-xl leading-relaxed">
          {t('planningSubtitle')}
        </p>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          {plannedPurchases.length} {plannedPurchases.length === 1 ? 'item' : 'items'}
        </span>
        {!isFormOpen && (
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 transition-colors"
          >
            <IoAddOutline className="text-base" />
            {t('newPlan')}
          </button>
        )}
      </div>

      {/* Form Drawer / Card */}
      {isFormOpen && (
        <div className="rounded-2xl bg-white p-5 border border-teal-200 shadow-md">
          <h3 className="text-base font-bold text-gray-900 mb-3">
            {editingItem ? t('editPlannedPurchase') : t('addPlannedPurchase')}
          </h3>
          <PlannedPurchaseForm
            initialData={editingItem}
            onSubmit={handleFormSubmit}
            onCancel={handleCloseForm}
            isSubmitting={isMutating}
            errorMessage={actionError}
          />
        </div>
      )}

      {/* Loading & Error States */}
      {isLoading && plannedPurchasesData === undefined ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-sm">{t('loading')}</p>
        </div>
      ) : isError && plannedPurchasesData === undefined ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 space-y-2">
          <p>{error?.message || t('errorLoading')}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="text-xs font-semibold underline hover:text-red-900"
          >
            {t('retry') || 'Retry'}
          </button>
        </div>
      ) : plannedPurchases.length === 0 && !isFormOpen ? (
        /* Empty State */
        <div className="rounded-2xl bg-white border border-gray-200 p-8 text-center space-y-4 shadow-sm">
          <div className="mx-auto w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 text-2xl">
            <IoTimeOutline />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-gray-900 text-base">{t('noPlannedPurchases')}</h3>
            <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto">
              {t('noPlannedPurchasesDescription')}
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 transition-colors"
          >
            <IoAddOutline className="text-base" />
            {t('newPlan')}
          </button>
        </div>
      ) : (
        /* List of Cards */
        <div className="space-y-4">
          {plannedPurchases.map((plannedPurchase) => (
            <PlannedPurchaseCard
              key={plannedPurchase.id}
              plannedPurchase={plannedPurchase}
              onEdit={handleOpenEdit}
              onDelete={(id) => setDeletingId(id)}
            />
          ))}
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
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
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
    </div>
  );
}

export default PlannedPurchases;
