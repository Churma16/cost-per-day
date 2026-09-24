import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getAllItems, deleteItem } from '../services/api';
import {
  IoChevronDown,
  IoScaleOutline,
  IoHeadsetOutline,
  IoDesktopOutline,
  IoLaptopOutline,
  IoCubeOutline,
  IoReceiptOutline,
  IoCalendarOutline,
  IoPencilOutline,
  IoTrashOutline
} from 'react-icons/io5';
import { formatCurrency } from '../utils/formatters';
import { format } from 'date-fns';
import { useTotalCost } from '../contexts/TotalCostContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useValueEquivalents } from '../contexts/ValueEquivalentsContext';
import { selectBestEquivalent } from '../utils/equivalentCalculator';
import ReplacementBenchmarkModal from './ReplacementBenchmarkModal';

const STATUS_TRANSLATION_KEYS = {
  active: 'statusActive',
  retired: 'statusRetired',
  sold: 'statusSold',
  lost: 'statusLost'
};

export const getCategoryIconInfo = (category, itemName) => {
  const normalizedText = `${category || ''} ${itemName || ''}`.toLowerCase();

  if (/headset|headphone|earphone|audio|tws|earbuds|airpods/i.test(normalizedText)) {
    return {
      Icon: IoHeadsetOutline,
      containerClass: 'bg-blue-50 text-blue-600 border-blue-100'
    };
  }

  if (/monitor|display|screen|tv|television/i.test(normalizedText)) {
    return {
      Icon: IoDesktopOutline,
      containerClass: 'bg-indigo-50 text-indigo-600 border-indigo-100'
    };
  }

  if (/laptop|macbook|computer|pc|notebook/i.test(normalizedText)) {
    return {
      Icon: IoLaptopOutline,
      containerClass: 'bg-amber-50 text-amber-600 border-amber-100'
    };
  }

  return {
    Icon: IoCubeOutline,
    containerClass: 'bg-slate-100 text-slate-500 border-slate-200'
  };
};

export const getStatusBadgeStyle = (status) => {
  switch (status) {
    case 'active':
      return 'text-emerald-600 font-semibold';
    case 'sold':
      return 'text-slate-500 font-medium';
    case 'retired':
      return 'text-stone-500 font-medium';
    case 'lost':
      return 'text-rose-600 font-medium';
    default:
      return 'text-gray-500 font-medium';
  }
};

const getTargetBadgeStyle = (targetState) => {
  switch (targetState) {
    case 'new':
      return 'bg-slate-50 text-slate-700 border-slate-200';
    case 'in_progress':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'target_reached':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'beyond_target':
      return 'bg-teal-50 text-teal-800 border-teal-200';
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200';
  }
};

const formatTargetBadgeText = (item, t) => {
  const percentage = Math.round(item.progressPercentage ?? item.targetProgressPercentage ?? 0);
  const beyondDays = item.daysBeyond ?? item.daysBeyondTarget ?? 0;

  switch (item.targetState) {
    case 'new':
      return t('targetStateNew');
    case 'in_progress':
      return t('targetStateInProgress', {
        percent: percentage
      });
    case 'target_reached':
      return t('targetStateReached');
    case 'beyond_target':
      return t('targetStateBeyond', {
        days: beyondDays
      });
    default:
      return '';
  }
};

function ItemList() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [expandedItem, setExpandedItem] = useState(null);
  const [benchmarkModalItem, setBenchmarkModalItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const navigate = useNavigate();
  const { setTotalDailyCost } = useTotalCost();
  const { currencyCode } = useCurrency();
  const { valueEquivalents = [] } = useValueEquivalents();

  useEffect(() => {
    const loadItems = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const storedItems = await getAllItems();
        setItems(storedItems);

        const total = storedItems.reduce((sum, item) => {
          const itemStatus = item.status || 'active';
          if (itemStatus !== 'active') {
            return sum;
          }
          return sum + Number(item.grossCostPerDay || 0);
        }, 0);
        setTotalDailyCost(total);
      } catch (error) {
        console.error('Error loading items:', error);
        setErrorMessage(error.message || 'Failed to load items from the server.');
      } finally {
        setIsLoading(false);
      }
    };

    loadItems();
  }, [setTotalDailyCost]);

  const handleEditItem = (item) => {
    navigate(`/edit?id=${item.id}`);
  };

  const toggleItem = (id) => {
    setExpandedItem(expandedItem === id ? null : id);
  };

  const confirmDeleteItem = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await deleteItem(itemToDelete.id);
      const remainingItems = items.filter((item) => item.id !== itemToDelete.id);
      setItems(remainingItems);
      const total = remainingItems.reduce((sum, item) => {
        const itemStatus = item.status || 'active';
        if (itemStatus !== 'active') {
          return sum;
        }
        return sum + Number(item.grossCostPerDay || 0);
      }, 0);
      setTotalDailyCost(total);
      setItemToDelete(null);
    } catch (error) {
      console.error('Error deleting item:', error);
      setErrorMessage(error.message || 'Failed to delete item.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getItemStatus = (item) => item.status || 'active';

  // Sort items by highest grossCostPerDay descending
  const sortedItems = [...items].sort((firstItem, secondItem) => {
    const firstCost = Number(firstItem.grossCostPerDay || 0);
    const secondCost = Number(secondItem.grossCostPerDay || 0);
    return secondCost - firstCost;
  });

  return (
    <div className="px-4 pt-3 pb-8 space-y-2.5 home-page-content max-w-lg mx-auto">
      {isLoading ? (
        <div className="text-center py-10 text-gray-500">
          <p>{t('loading')}</p>
        </div>
      ) : errorMessage ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          <p>{t('noItems')}</p>
        </div>
      ) : (
        <>
          {/* Section Header */}
          <div className="flex items-center justify-between px-1 text-xs mb-1">
            <span className="font-bold text-gray-900 text-sm">{t('yourItems')}</span>
            <span className="text-gray-500 font-normal">{t('sortedHighestCost')}</span>
          </div>

          {sortedItems.map((item) => {
            const itemStatus = getItemStatus(item);
            const isActive = itemStatus === 'active';
            const statusTranslationKey = STATUS_TRANSLATION_KEYS[itemStatus] || STATUS_TRANSLATION_KEYS.active;
            const itemCostPerDay = Number(item.grossCostPerDay || 0);
            const bestEquivalent = selectBestEquivalent(
              itemCostPerDay,
              valueEquivalents,
              currencyCode,
              t
            );
            const categoryInfo = getCategoryIconInfo(item.category, item.name);
            const CategoryIconComponent = categoryInfo.Icon;

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:border-gray-200 transition-colors"
              >
                {/* Collapsed Row */}
                <div
                  className="p-3 flex items-center justify-between cursor-pointer gap-3"
                  onClick={() => toggleItem(item.id)}
                >
                  {/* Left: Category Icon Squircle */}
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${categoryInfo.containerClass}`}
                    aria-hidden="true"
                  >
                    <CategoryIconComponent className="text-lg" />
                  </div>

                  {/* Center: Identity + Equivalent / Cue */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-medium text-gray-900 truncate max-w-[180px] sm:max-w-xs">{item.name}</h3>
                      {item.targetState && (
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${getTargetBadgeStyle(item.targetState)}`}>
                          {formatTargetBadgeText(item, t)}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-baseline gap-2 flex-wrap">
                      {!isActive && (
                        <span className="text-xs text-gray-500 font-normal">
                          {t('finalGrossCostPerDay')}
                        </span>
                      )}
                      {bestEquivalent && (
                        <p className="text-xs text-gray-500 font-normal">
                          ≈ {bestEquivalent.text}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Cost + Status + Chevron */}
                  <div className="flex items-center gap-2.5 flex-shrink-0 text-right">
                    <div className="flex flex-col items-end">
                      <p className="text-sm font-semibold text-gray-900 tabular-nums">
                        {formatCurrency(itemCostPerDay, currencyCode)}
                      </p>
                      <span className={`text-xs mt-0.5 ${getStatusBadgeStyle(itemStatus)}`}>
                        {t(statusTranslationKey)}
                      </span>
                    </div>
                    <IoChevronDown
                      className={`text-gray-400 transition-transform duration-300 ease-out text-base ${expandedItem === item.id ? 'rotate-180' : ''}`}
                    />
                  </div>
                </div>

                {/* Expanded Details with Two-Way Smooth Animation */}
                <div
                  className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
                    expandedItem === item.id
                      ? 'grid-rows-[1fr] opacity-100'
                      : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                      <div className="space-y-3">
                        {/* 2-Column Metadata Grid */}
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100/80">
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                              <IoReceiptOutline className="text-sm" />
                              <span>{t('purchaseAmount')}</span>
                            </div>
                            <div className="font-semibold text-gray-900 text-sm tabular-nums">
                              {formatCurrency(item.price, currencyCode)}
                            </div>
                          </div>

                          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100/80">
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                              <IoCalendarOutline className="text-sm" />
                              <span>{t('purchaseDate')}</span>
                            </div>
                            <div className="font-semibold text-gray-900 text-sm">
                              {format(new Date(item.purchaseDate), 'yyyy-MM-dd')}
                            </div>
                          </div>
                        </div>

                        {/* Full-width Ownership Duration */}
                        <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 flex items-center justify-between text-xs">
                          <span className="text-gray-500 font-medium">{t('ownedFor')}</span>
                          <span className="font-semibold text-gray-900 text-sm">
                            {item.ownershipDays || 1} {t('ownershipDays')}
                          </span>
                        </div>

                        {(item.category || item.brand) && (
                          <div className="flex items-center gap-4 text-xs bg-gray-50 rounded-lg p-2.5">
                            {item.category && (
                              <div>
                                <span className="text-gray-400 font-normal">{t('category')}: </span>
                                <span className="font-medium text-gray-700">{item.category}</span>
                              </div>
                            )}
                            {item.brand && (
                              <div>
                                <span className="text-gray-400 font-normal">{t('brand')}: </span>
                                <span className="font-medium text-gray-700">{item.brand}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {!isActive && item.endedAt && (
                          <div className="rounded-lg bg-gray-50 p-3">
                            <div className="text-xs text-gray-500">{t('ownershipEndDate')}</div>
                            <div className="font-medium">{format(new Date(item.endedAt), 'yyyy-MM-dd')}</div>
                          </div>
                        )}

                        {itemStatus === 'sold' && (
                          <div className="grid gap-3 rounded-lg bg-gray-50 p-3 sm:grid-cols-3">
                            <div>
                              <div className="text-xs text-gray-500">{t('salePrice')}</div>
                              <div className="font-medium">{formatCurrency(Number(item.salePrice || 0), currencyCode)}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500">{t('netOwnershipCost')}</div>
                              <div className="font-medium">{formatCurrency(Number(item.netOwnershipCost || 0), currencyCode)}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500">{t('netCostPerDay')}</div>
                              <div className="font-medium">
                                {formatCurrency(Number(item.netCostPerDay || 0), currencyCode)}{t('perDay')}
                              </div>
                            </div>
                          </div>
                        )}

                        {item.targetType && (
                          <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-3 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium text-gray-700">{t('targetMilestone')}</span>
                              <span className="text-gray-500">
                                {item.targetCostPerDay && `${formatCurrency(item.targetCostPerDay, currencyCode)}/day`}
                                {item.targetDurationDays && ` (~${item.targetDurationDays} days)`}
                              </span>
                            </div>

                            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  item.targetState === 'beyond_target'
                                    ? 'bg-teal-700'
                                    : item.targetState === 'target_reached'
                                      ? 'bg-emerald-500'
                                      : 'bg-amber-500'
                                }`}
                                style={{ width: `${Math.min(100, Math.max(0, item.progressPercentage ?? item.targetProgressPercentage ?? 0))}%` }}
                              ></div>
                            </div>

                            <div className="text-xs text-gray-500 flex justify-between items-center">
                              <span>
                                {item.targetState === 'in_progress' && t('remainingDaysToTarget', { days: item.remainingDays ?? item.remainingDaysToTarget ?? 0 })}
                                {item.targetState === 'beyond_target' && t('daysBeyondTarget', { days: item.daysBeyond ?? item.daysBeyondTarget ?? 0 })}
                                {item.targetState === 'target_reached' && t('targetStateReached')}
                                {item.targetState === 'new' && t('targetStateNew')}
                              </span>
                              <span className="font-medium text-gray-700">
                                {Math.round(item.progressPercentage ?? item.targetProgressPercentage ?? 0)}%
                              </span>
                            </div>
                          </div>
                        )}

                        {!isActive && (
                          <button
                            type="button"
                            className="w-full mt-2 flex items-center justify-center gap-2 p-2 bg-teal-50 hover:bg-teal-100 rounded-lg text-sm font-medium text-teal-800 transition-colors border border-teal-200"
                            onClick={() => setBenchmarkModalItem(item)}
                          >
                            <IoScaleOutline className="text-base" /> {t('benchmarkReplacement')}
                          </button>
                        )}

                        {/* Action Row: Edit & Delete */}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            className="flex-1 flex items-center justify-center gap-1.5 p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleEditItem(item);
                            }}
                          >
                            <IoPencilOutline className="text-base" /> {t('edit')}
                          </button>
                          <button
                            type="button"
                            className="flex-1 flex items-center justify-center gap-1.5 p-2 bg-white hover:bg-red-50 border border-red-200 rounded-lg text-sm font-medium text-red-600 transition-colors"
                            onClick={(event) => {
                              event.stopPropagation();
                              setItemToDelete(item);
                            }}
                          >
                            <IoTrashOutline className="text-base" /> {t('deleteItem')}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold text-gray-900">{t('confirmDelete')}</h3>
            <p className="mt-2 text-sm text-gray-600">
              {t('deleteConfirmation')}
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                onClick={() => setItemToDelete(null)}
                disabled={isDeleting}
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
                onClick={confirmDeleteItem}
                disabled={isDeleting}
              >
                {isDeleting ? t('loading') : t('confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

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
