import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { deleteItem } from '../services/api';
import { useTotalCost } from '../contexts/TotalCostContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useValueEquivalents } from '../contexts/ValueEquivalentsContext';
import { useItems, useInvalidateItems } from '../hooks/useItems';
import { queryKeys } from '../query/queryConfig';
import ReplacementBenchmarkModal from './ReplacementBenchmarkModal';
import ItemCard from './item-list/ItemCard';
import ItemDeleteConfirmDialog from './item-list/ItemDeleteConfirmDialog';
import ItemOrganizationDialog from './item-list/ItemOrganizationDialog';
import { IoOptionsOutline } from 'react-icons/io5';
import {
  loadHomeOrganization,
  normalizeHomeOrganization,
  organizeItems,
  saveHomeOrganization,
} from '../utils/itemOrganization';

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
  getLifecycleTranslationKey,
  getNextDurationUnit,
  formatOwnershipDuration,
  CalmCycleText,
} from './item-list/ItemCard';

function ItemList() {
  const { t, i18n } = useTranslation();
  const [expandedItem, setExpandedItem] = useState(null);
  const [benchmarkModalItem, setBenchmarkModalItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isOrganizationOpen, setIsOrganizationOpen] = useState(false);
  const [organization, setOrganization] = useState(loadHomeOrganization);
  const navigate = useNavigate();
  const { setTotalDailyCost } = useTotalCost();
  const { currencyCode } = useCurrency();
  const { valueEquivalents = [] } = useValueEquivalents();
  const queryClient = useQueryClient();
  const { data: itemsData, isLoading, error: itemsError } = useItems();
  const items = itemsData ?? [];
  const invalidateItems = useInvalidateItems();

  useEffect(() => {
    const total = items.reduce((sum, item) => {
      const itemStatus = item.status || 'active';
      return itemStatus === 'active' ? sum + Number(item.grossCostPerDay || 0) : sum;
    }, 0);
    setTotalDailyCost(total);
  }, [items, setTotalDailyCost]);

  const handleEditItem = (item) => {
    navigate(`/edit?id=${item.id}`);
  };

  const toggleItem = (id) => {
    setExpandedItem((currentId) => (currentId === id ? null : id));
  };

  const confirmDeleteItem = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await deleteItem(itemToDelete.id);
      queryClient.setQueryData(queryKeys.items, (cachedItems = []) =>
        cachedItems.filter((item) => String(item.id) !== String(itemToDelete.id))
      );
      await invalidateItems();
      setItemToDelete(null);
    } catch (error) {
      console.error('Error deleting item:', error);
      setErrorMessage(error.message || t('errorDeletingItem'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOrganizationChange = useCallback((nextOrganization) => {
    const normalized = normalizeHomeOrganization(nextOrganization);
    setOrganization(normalized);
    saveHomeOrganization(normalized);
  }, []);

  const organizedGroups = useMemo(
    () => organizeItems(items, organization, i18n?.language),
    [items, organization, i18n?.language]
  );
  const visibleItemCount = organizedGroups.reduce((count, group) => count + group.items.length, 0);

  return (
    <div className="px-4 pt-3 pb-8 space-y-2.5 home-page-content max-w-lg mx-auto">
      {isLoading && itemsData === undefined ? (
        <div className="text-center py-10 text-[#6F7782]">
          <p>{t('loading')}</p>
        </div>
      ) : errorMessage || (itemsError && itemsData === undefined) ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage || itemsError?.message || t('errorLoadingItems')}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-10 text-[#6F7782]">
          <p>{t('noItems')}</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 px-1 text-xs mb-1">
            <span className="font-bold text-[#20242A] text-sm">{t('yourItems')}</span>
            <button
              type="button"
              onClick={() => setIsOrganizationOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#D5D8DF] bg-white px-3 py-1.5 font-medium text-[#3F4A54] shadow-sm hover:border-teal-300 hover:text-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              <IoOptionsOutline className="text-sm" aria-hidden="true" />
              {t('organizeItems')}
            </button>
          </div>

          {visibleItemCount === 0 ? (
            <div className="text-center py-10 text-[#6F7782]">
              <p>{t('noItemsMatchFilter')}</p>
            </div>
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
                  onDelete={setItemToDelete}
                  onBenchmark={setBenchmarkModalItem}
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
        onClose={() => setIsOrganizationOpen(false)}
      />

      <ItemDeleteConfirmDialog
        item={itemToDelete}
        isDeleting={isDeleting}
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

export default ItemList;
