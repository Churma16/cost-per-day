import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getAllItems } from '../services/api';
import { IoChevronDown, IoChevronForward, IoCalendar, IoCash, IoScaleOutline } from 'react-icons/io5';
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

const getTargetBadgeStyle = (targetState) => {
  switch (targetState) {
    case 'new':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'in_progress':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'target_reached':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'beyond_target':
      return 'bg-purple-50 text-purple-700 border-purple-200';
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
  const [activeIcon, setActiveIcon] = useState(null);
  const [benchmarkModalItem, setBenchmarkModalItem] = useState(null);
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

  const getItemStatus = (item) => item.status || 'active';

  return (
    <div className="px-4 py-6 space-y-4 home-page-content">
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
        items.map((item) => {
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

          return (
            <div
              key={item.id}
              className="bg-white rounded-xl shadow-md overflow-hidden border border-purple-100"
            >
              <div
                className="p-4 flex items-center justify-between cursor-pointer"
                onClick={() => toggleItem(item.id)}
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium text-gray-900">{item.name}</h3>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      {t(statusTranslationKey)}
                    </span>
                    {item.category && (
                      <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700 border border-purple-200">
                        {item.category}
                      </span>
                    )}
                    {item.brand && (
                      <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 border border-indigo-200">
                        {item.brand}
                      </span>
                    )}
                    {item.targetState && (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium border ${getTargetBadgeStyle(item.targetState)}`}>
                        {formatTargetBadgeText(item, t)}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {t(isActive ? 'currentCostPerDay' : 'finalGrossCostPerDay')}
                  </p>
                  <p className="text-sm text-gray-700">
                    {formatCurrency(itemCostPerDay, currencyCode)}{t('perDay')}
                  </p>
                  {bestEquivalent && (
                    <p className="mt-0.5 text-xs font-medium text-purple-600">
                      ≈ {bestEquivalent.text}
                    </p>
                  )}
                </div>
                <div className="flex items-center">
                  <IoChevronDown
                    className={`text-purple-500 transition-transform ${expandedItem === item.id ? 'rotate-180' : ''}`}
                  />
                </div>
              </div>

              {expandedItem === item.id && (
                <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <div
                        className={`p-2 rounded-lg ${activeIcon === 'price' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500'}`}
                        onMouseEnter={() => setActiveIcon('price')}
                        onMouseLeave={() => setActiveIcon(null)}
                      >
                        <IoCash className="text-lg" />
                      </div>
                      <div className="ml-3">
                        <div className="text-xs text-gray-500">{t('purchaseAmount')}</div>
                        <div className="font-medium">{formatCurrency(item.price, currencyCode)}</div>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <div
                        className={`p-2 rounded-lg ${activeIcon === 'date' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500'}`}
                        onMouseEnter={() => setActiveIcon('date')}
                        onMouseLeave={() => setActiveIcon(null)}
                      >
                        <IoCalendar className="text-lg" />
                      </div>
                      <div className="ml-3">
                        <div className="text-xs text-gray-500">{t('purchaseDate')}</div>
                        <div className="font-medium">
                          {format(new Date(item.purchaseDate), 'yyyy-MM-dd')}
                          <span className="text-sm text-gray-500 ml-2">
                            ({item.ownershipDays || 1} {t('ownershipDays')})
                          </span>
                        </div>
                      </div>
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
                      <div className="rounded-lg bg-purple-50/50 border border-purple-100 p-3 space-y-2">
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
                                ? 'bg-purple-600'
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
                        className="w-full mt-2 flex items-center justify-center gap-2 p-2 bg-purple-50 hover:bg-purple-100 rounded-lg text-sm font-medium text-purple-700 transition-colors border border-purple-200"
                        onClick={() => setBenchmarkModalItem(item)}
                      >
                        <IoScaleOutline className="text-base" /> {t('benchmarkReplacement')}
                      </button>
                    )}

                    <button
                      className="w-full mt-3 flex items-center justify-center gap-2 p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
                      onClick={() => handleEditItem(item)}
                    >
                      {t('edit')} <IoChevronForward />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })
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
