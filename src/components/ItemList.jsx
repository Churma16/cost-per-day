import React, { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../contexts/CurrencyContext';
import { useValueEquivalents } from '../contexts/ValueEquivalentsContext';
import { useAuth } from '../contexts/AuthContext';
import { useDeleteItem, useItems } from '../hooks/useItems';
import { useHomeOrganization } from '../hooks/useHomeOrganization';
import ReplacementBenchmarkModal from './ReplacementBenchmarkModal';
import ItemCard from './item-list/ItemCard';
import ItemDeleteConfirmDialog from './item-list/ItemDeleteConfirmDialog';
import ItemOrganizationDialog from './item-list/ItemOrganizationDialog';
import { InlineStateNotice, StatePanel } from './ui/AsyncState';
import { IoOptionsOutline } from 'react-icons/io5';

const OWNERSHIP_STATE_LABEL_KEYS = {
  justJoined: 'statusActiveEarly',
  stillWithYou: 'statusActive',
  noLongerInUse: 'statusRetired',
  changedHands: 'statusSold',
  lost: 'statusLost',
};

export {
  getCategoryIconInfo,
  getStatusBadgeStyle,
  CalmCycleText,
} from './item-list/ItemCard';
export {
  getLifecycleTranslationKey,
  getNextDurationUnit,
  formatOwnershipDuration,
} from '../utils/itemLifecycle';

function ItemListContent({ itemsQuery }) {
  const { t, i18n } = useTranslation();
  const [expandedItem, setExpandedItem] = useState(null);
  const [benchmarkModalItem, setBenchmarkModalItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isOrganizationOpen, setIsOrganizationOpen] = useState(false);
  const organizationTriggerRef = useRef(null);
  const navigate = useNavigate();
  const { currencyCode } = useCurrency();
  const { valueEquivalents = [] } = useValueEquivalents();
  const { isGuest = false } = useAuth() ?? {};
  const {
    data: itemsData,
    isLoading,
    isError,
    isRefetchError,
    error: itemsError,
    refetch,
  } = itemsQuery;
  const items = itemsData ?? [];
  const deleteItemMutation = useDeleteItem();
  const {
    organization,
    organizedGroups,
    visibleItemCount,
    setOrganization,
  } = useHomeOrganization(items, i18n?.language);

  const handleEditItem = (item) => {
    navigate(`/edit?id=${item.id}`);
  };

  const toggleItem = (id) => {
    setExpandedItem((currentId) => (currentId === id ? null : id));
  };

  const confirmDeleteItem = async () => {
    if (!itemToDelete) return;
    try {
      await deleteItemMutation.mutateAsync(itemToDelete.id);
      setItemToDelete(null);
    } catch (error) {
      console.error('Error deleting item:', error);
      setErrorMessage(t('errorDeletingItem'));
    }
  };

  const handleOrganizationChange = useCallback((nextOrganization) => {
    setOrganization(nextOrganization);
  }, [setOrganization]);
  const handleOrganizationClose = useCallback(() => {
    setIsOrganizationOpen(false);
  }, []);


  return (
    <div className="px-4 pt-3 pb-8 space-y-2.5 home-page-content max-w-lg mx-auto">
      {isLoading && itemsData === undefined ? (
        <StatePanel
          variant="loading"
          title={t('homeLoadingTitle')}
          description={t('homeLoadingDescription')}
        />
      ) : isError && itemsData === undefined ? (
        <StatePanel
          variant="error"
          title={t('homeLoadErrorTitle')}
          description={t('homeLoadErrorDescription')}
          actionLabel={t('retry')}
          onAction={() => refetch()}
        />
      ) : items.length === 0 ? (
        <StatePanel
          variant="empty"
          title={t('homeEmptyTitle')}
          description={t('homeEmptyDescription')}
          actionLabel={t('addFirstOwnedItem')}
          onAction={() => navigate('/add?type=item')}
        />
      ) : (
        <>
          {errorMessage && (
            <InlineStateNotice
              variant="error"
              message={errorMessage}
            />
          )}

          {itemsData !== undefined && (isRefetchError || isError) && (
            <InlineStateNotice
              variant="error"
              message={t('homeRefreshError')}
              actionLabel={t('retry')}
              onAction={() => refetch()}
            />
          )}
          <div className="flex items-center justify-between gap-3 px-1 text-xs mb-1">
            <span className="font-bold text-[#20242A] text-sm">{t('yourItems')}</span>
            <button
              ref={organizationTriggerRef}
              type="button"
              onClick={() => setIsOrganizationOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#D5D8DF] bg-white px-3 py-1.5 font-medium text-[#3F4A54] shadow-sm hover:border-teal-300 hover:text-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              <IoOptionsOutline className="text-sm" aria-hidden="true" />
              {t('organizeItems')}
            </button>
          </div>

          {visibleItemCount === 0 ? (
            <StatePanel
              variant="empty"
              title={t('homeFilteredEmptyTitle')}
              description={t('homeFilteredEmptyDescription')}
              actionLabel={t('clearFilters')}
              onAction={() => setOrganization({
                ...organization,
                stateFilters: [],
              })}
              className="mt-2"
            />
          ) : organizedGroups.map((group) => (
            <section key={group.key} className="space-y-2.5" aria-labelledby={organization.groupBy === 'none' ? undefined : `item-group-${group.key}`}>
              {organization.groupBy !== 'none' && (
                <h2 id={`item-group-${group.key}`} className="px-1 pt-2 text-xs font-semibold uppercase tracking-wide text-[#6F7782]">
                  {organization.groupBy === 'ownershipState'
                    ? t(OWNERSHIP_STATE_LABEL_KEYS[group.key])
                    : group.key === 'uncategorized' ? t('uncategorized') : group.key}
                </h2>
              )}
              {group.items.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  isExpanded={expandedItem === item.id}
                  onToggle={toggleItem}
                  onEdit={handleEditItem}
                  onDelete={(item) => {
                    setErrorMessage(null);
                    setItemToDelete(item);
                  }}
                  onBenchmark={setBenchmarkModalItem}
                  isGuest={isGuest}
                  currencyCode={currencyCode}
                  valueEquivalents={valueEquivalents}
                />
              ))}
            </section>
          ))}
        </>
      )}

      <ItemOrganizationDialog
        isOpen={isOrganizationOpen}
        organization={organization}
        onChange={handleOrganizationChange}
        onClose={handleOrganizationClose}
        returnFocusRef={organizationTriggerRef}
      />

      <ItemDeleteConfirmDialog
        item={itemToDelete}
        isDeleting={deleteItemMutation.isPending}
        onCancel={() => setItemToDelete(null)}
        onConfirm={confirmDeleteItem}
      />

      {benchmarkModalItem && (
        <ReplacementBenchmarkModal
          isOpen={Boolean(benchmarkModalItem)}
          onClose={() => setBenchmarkModalItem(null)}
          completedItem={benchmarkModalItem}
        />
      )}
    </div>
  );
}

function ItemList() {
  const itemsQuery = useItems();
  return <ItemListContent itemsQuery={itemsQuery} />;
}

export { ItemListContent };
export default ItemList;
