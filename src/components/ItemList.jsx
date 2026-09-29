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
import {
  CardListSkeleton,
  EmptyState,
  ErrorCard,
  NoticeCard,
  SlowLoadIndicator,
} from './ui/AsyncState';
import { useLoadingPhases } from '../hooks/useLoadingPhases';
import OwnershipJourneyDialog from './item-list/OwnershipJourneyDialog';
import { getOwnershipJourneyContext } from '../utils/itemLineage';
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

function ItemListToolbar({ title, actionLabel, disabled = false, onOpen, triggerRef }) {
  return (
    <div className="mb-1 flex items-center justify-between gap-3 px-1 text-xs">
      <span className="text-sm font-bold text-[#20242A]">{title}</span>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={onOpen}
        className="inline-flex items-center gap-1.5 rounded-full border border-[#D5D8DF] bg-white px-3 py-1.5 font-medium text-[#3F4A54] shadow-sm transition-colors hover:border-teal-300 hover:text-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:cursor-not-allowed disabled:border-[#E2E4E8] disabled:bg-[#F8F9FA] disabled:text-[#A0A6AE] disabled:shadow-none"
      >
        <IoOptionsOutline className="text-sm" aria-hidden="true" />
        {actionLabel}
      </button>
    </div>
  );
}

function ItemListContent({ itemsQuery, loadingPhase = null }) {
  const { t, i18n } = useTranslation();
  const [expandedItem, setExpandedItem] = useState(null);
  const [benchmarkModalItem, setBenchmarkModalItem] = useState(null);
  const [ownershipJourneyItem, setOwnershipJourneyItem] = useState(null);
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
    refetch,
  } = itemsQuery;
  const items = itemsData ?? [];
  const localLoadingState = useLoadingPhases(isLoading && itemsData === undefined);
  const resolvedLoadingPhase = loadingPhase ?? localLoadingState.phase;
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
      {resolvedLoadingPhase !== 'idle' ? (
        <>
          <ItemListToolbar
            title={t('yourItems')}
            actionLabel={t('organizeItems')}
            disabled
            onOpen={() => setIsOrganizationOpen(true)}
            triggerRef={organizationTriggerRef}
          />
          <div aria-busy="true" className="min-h-[196px]">
            {resolvedLoadingPhase !== 'blank' && (
              <>
                <CardListSkeleton
                  count={3}
                  paused={resolvedLoadingPhase === 'slow'}
                />
                {resolvedLoadingPhase === 'slow' && (
                  <SlowLoadIndicator message={t('stillLoadingItems')} />
                )}
              </>
            )}
          </div>
        </>
      ) : isError && itemsData === undefined ? (
        <NoticeCard
          body={t('homeLoadErrorDescription')}
          actionLabel={t('tryAgain')}
          onAction={() => refetch()}
        />
      ) : (
        <>
          {itemsData !== undefined && (isRefetchError || isError) && (
            <NoticeCard
              body={t('refreshShowingSavedData')}
              actionLabel={t('tryAgain')}
              onAction={() => refetch()}
              className="mb-1"
            />
          )}
          {items.length === 0 ? (
        <div className="space-y-2.5">
          <ItemListToolbar
            title={t('yourItems')}
            actionLabel={t('organizeItems')}
            disabled
            onOpen={() => setIsOrganizationOpen(true)}
            triggerRef={organizationTriggerRef}
          />
          <EmptyState
            motif="home"
            description={t('homeEmptyListDescription')}
            actionLabel={t('addFirstOwnedItem')}
            onAction={() => navigate('/add?type=item')}
          />
        </div>
      ) : (
        <>
          {errorMessage && (
            <ErrorCard
              title={t('itemDeleteErrorTitle')}
              body={t('itemDeleteErrorBody')}
              onDismiss={() => setErrorMessage(null)}
            />
          )}

          <ItemListToolbar
            title={t('yourItems')}
            actionLabel={t('organizeItems')}
            onOpen={() => setIsOrganizationOpen(true)}
            triggerRef={organizationTriggerRef}
          />

          {visibleItemCount === 0 ? (
            <p className="px-1 py-8 text-center text-[13px] leading-[1.6] text-[var(--text-secondary)]">
              {t('homeFilteredEmptyDescription')}
            </p>
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
                  ownershipJourney={getOwnershipJourneyContext(items, item)}
                  onOpenOwnershipJourney={setOwnershipJourneyItem}
                  isGuest={isGuest}
                  currencyCode={currencyCode}
                  valueEquivalents={valueEquivalents}
                />
              ))}
            </section>
          ))}
        </>
      )}
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
        isGuest={isGuest}
        isDeleting={deleteItemMutation.isPending}
        onCancel={() => setItemToDelete(null)}
        onConfirm={confirmDeleteItem}
      />

      <OwnershipJourneyDialog
        isOpen={Boolean(ownershipJourneyItem)}
        item={ownershipJourneyItem}
        items={items}
        onClose={() => setOwnershipJourneyItem(null)}
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
