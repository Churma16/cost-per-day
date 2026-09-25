import React, { useEffect, useState } from 'react';
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

export {
  getCategoryIconInfo,
  getStatusBadgeStyle,
  getLifecycleTranslationKey,
  getNextDurationUnit,
  formatOwnershipDuration,
  CalmCycleText,
} from './item-list/ItemCard';

function ItemList() {
  const { t } = useTranslation();
  const [expandedItem, setExpandedItem] = useState(null);
  const [benchmarkModalItem, setBenchmarkModalItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
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

  const sortedItems = [...items].sort((firstItem, secondItem) => {
    const firstCost = Number(firstItem.grossCostPerDay || 0);
    const secondCost = Number(secondItem.grossCostPerDay || 0);
    return secondCost - firstCost;
  });

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
          <div className="flex items-center justify-between px-1 text-xs mb-1">
            <span className="font-bold text-[#20242A] text-sm">{t('yourItems')}</span>
            <span className="text-[#6F7782] font-normal">{t('sortedHighestCost')}</span>
          </div>

          {sortedItems.map((item) => (
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
        </>
      )}

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
