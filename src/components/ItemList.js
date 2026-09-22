import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getAllItems } from '../services/api';
import { IoChevronDown, IoChevronForward, IoCalendar, IoCash } from 'react-icons/io5';
import { formatCurrency } from '../utils/formatters';
import { format } from 'date-fns';
import { useTotalCost } from '../contexts/TotalCostContext';
import { useCurrency } from '../contexts/CurrencyContext';

const STATUS_TRANSLATION_KEYS = {
  active: 'statusActive',
  retired: 'statusRetired',
  sold: 'statusSold',
  lost: 'statusLost'
};

function ItemList() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [expandedItem, setExpandedItem] = useState(null);
  const [activeIcon, setActiveIcon] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const navigate = useNavigate();
  const { setTotalDailyCost } = useTotalCost();
  const { currencyCode } = useCurrency();

  useEffect(() => {
    const loadItems = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const storedItems = await getAllItems();
        setItems(storedItems);

        const total = storedItems.reduce((sum, item) => {
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
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">{item.name}</h3>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      {t(statusTranslationKey)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {t(isActive ? 'currentCostPerDay' : 'finalGrossCostPerDay')}
                  </p>
                  <p className="text-sm text-gray-700">
                    {formatCurrency(Number(item.grossCostPerDay || 0), currencyCode)}{t('perDay')}
                  </p>
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
    </div>
  );
}

export default ItemList;
