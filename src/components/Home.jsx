import React from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../contexts/CurrencyContext';
import { useDashboard } from '../hooks/useDashboard';
import { useItems } from '../hooks/useItems';
import { formatCurrency } from '../utils/formatters';
import HeroCarousel from './HeroCarousel';
import { ItemListContent } from './ItemList';
import WorthwhileBrandLockup from './WorthwhileBrandLockup';

export const calculateActiveItemsDailyCost = (items = []) => items.reduce((total, item) => {
  const status = item?.status || 'active';
  return status === 'active'
    ? total + Number(item?.grossCostPerDay || 0)
    : total;
}, 0);

function HomeBrandHeader() {
  const headerRef = React.useRef(null);
  const [isCompact, setIsCompact] = React.useState(false);

  React.useEffect(() => {
    const scrollRoot = headerRef.current?.closest('.page-content');
    if (!scrollRoot) {
      return undefined;
    }

    const updateCompactState = () => {
      setIsCompact(scrollRoot.scrollTop > 12);
    };

    updateCompactState();
    scrollRoot.addEventListener('scroll', updateCompactState, { passive: true });

    return () => scrollRoot.removeEventListener('scroll', updateCompactState);
  }, []);

  return (
    <header
      ref={headerRef}
      className={`sticky top-0 z-10 w-full flex-shrink-0 bg-[#F6F7F8] transition-[height,padding] duration-300 ease-out ${
        isCompact ? 'h-10 px-3' : 'h-14 px-4'
      }`}
      data-home-header="brand"
      data-compact={isCompact ? 'true' : 'false'}
    >
      <div className={`mx-auto flex h-full w-full max-w-lg items-center transition-[padding] duration-300 ease-out ${
        isCompact ? 'px-0.5' : 'px-1'
      }`}>
        <WorthwhileBrandLockup
          size={isCompact ? 'compact' : 'small'}
        />
      </div>
    </header>
  );
}

function HomeHeader({ totalDailyCost = 0, currencyCode: dashboardCurrencyCode }) {
  const { t } = useTranslation();
  const { currencyCode } = useCurrency();
  const resolvedCurrencyCode = dashboardCurrencyCode || currencyCode;

  return (
    <>
      <HomeBrandHeader />
      <div className="w-full min-w-0 flex-shrink-0 px-4">
        <div className="home-insight-card mx-auto w-full min-w-0 max-w-lg overflow-hidden rounded-[1.25rem] bg-white ring-1 ring-black/[0.04]">
          <div className="home-reflection-surface relative isolate w-full min-w-0 text-white">
            <div className="relative z-[1] w-full min-w-0 px-5 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6">
              <HeroCarousel />
            </div>
          </div>
          <p className="max-w-md px-5 py-4 text-sm leading-5 text-[#66707A] sm:px-6">
            {t('dailyOwnershipReflection', {
              amount: formatCurrency(totalDailyCost, resolvedCurrencyCode),
            })}
          </p>
        </div>
      </div>
    </>
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
