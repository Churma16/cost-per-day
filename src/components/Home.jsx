import React from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../contexts/CurrencyContext';
import { useDashboard } from '../hooks/useDashboard';
import { useItems } from '../hooks/useItems';
import { formatCurrency } from '../utils/formatters';
import HeroCarousel from './HeroCarousel';
import { ItemListContent } from './ItemList';

export const calculateActiveItemsDailyCost = (items = []) => items.reduce((total, item) => {
  const status = item?.status || 'active';
  return status === 'active'
    ? total + Number(item?.grossCostPerDay || 0)
    : total;
}, 0);

function HomeHeader({ totalDailyCost = 0, currencyCode: dashboardCurrencyCode }) {
  const { t } = useTranslation();
  const { currencyCode } = useCurrency();
  const resolvedCurrencyCode = dashboardCurrencyCode || currencyCode;

  return (
    <header
      className="sticky top-0 z-10 w-full min-w-0 flex-shrink-0 text-white shadow-sm"
      style={{
        background: 'linear-gradient(135deg, #334A5B 0%, #32636A 55%, #2F7473 100%)',
      }}
    >
      <div className="mx-auto w-full min-w-0 max-w-lg px-4 pb-3 pt-3">
        <div className="w-full min-w-0">
          <HeroCarousel />
          <div className="mt-2.5 grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 border-t border-white/10 px-1 pt-2.5 text-white/90">
            <span className="min-w-0 text-xs tracking-wide text-white/75 font-normal">{t('totalDailyCost')}</span>
            <span className="max-w-full whitespace-nowrap text-right font-semibold text-base text-white tracking-tight tabular-nums">
              {formatCurrency(totalDailyCost, resolvedCurrencyCode)}
              <span className="text-xs font-normal text-white/75">{t('perDay')}</span>
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

function Home() {
  const { data: dashboardData, isError: isDashboardError, isRefetchError } = useDashboard();
  const itemsQuery = useItems();
  const dashboardTotal = dashboardData?.totalDailyCost;
  const hasDashboardTotal = dashboardTotal !== null
    && dashboardTotal !== undefined
    && Number.isFinite(Number(dashboardTotal));
  const canUseDashboardTotal = hasDashboardTotal
    && !isDashboardError
    && !isRefetchError;
  const totalDailyCost = canUseDashboardTotal
    ? Number(dashboardTotal)
    : calculateActiveItemsDailyCost(itemsQuery.data ?? []);

  return (
    <div className="min-h-full">
      <HomeHeader
        totalDailyCost={totalDailyCost}
        currencyCode={dashboardData?.currencyCode}
      />
      <ItemListContent itemsQuery={itemsQuery} />
    </div>
  );
}

export { HomeHeader };
export default Home;
