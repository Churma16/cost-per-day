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

function useHeroPastStickyBoundary() {
  const heroRef = React.useRef(null);
  const [isPastBoundary, setIsPastBoundary] = React.useState(false);

  React.useEffect(() => {
    const hero = heroRef.current;
    if (!hero || typeof IntersectionObserver === 'undefined') {
      return undefined;
    }

    const scrollRoot = hero.closest('.page-content');
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry) {
        return;
      }

      const rootTop = entry.rootBounds?.top ?? 0;
      const heroIsAboveRoot = entry.boundingClientRect.bottom <= rootTop;

      setIsPastBoundary(!entry.isIntersecting && heroIsAboveRoot);
    }, {
      root: scrollRoot || null,
      threshold: 0,
    });

    observer.observe(hero);

    return () => observer.disconnect();
  }, []);

  return { heroRef, isPastBoundary };
}

function CompactHomeBrandHeader() {
  return (
    <div
      className="sticky top-0 z-10 h-14 w-full flex-shrink-0 border-b border-[#E6E8EC] bg-[#F6F7F8]/95 px-4 backdrop-blur-sm"
      data-home-header="compact"
    >
      <div className="mx-auto flex h-full w-full max-w-lg items-center px-1">
        <WorthwhileBrandLockup />
      </div>
    </div>
  );
}

function HomeHeader({ totalDailyCost = 0, currencyCode: dashboardCurrencyCode }) {
  const { t } = useTranslation();
  const { currencyCode } = useCurrency();
  const resolvedCurrencyCode = dashboardCurrencyCode || currencyCode;
  const { heroRef, isPastBoundary } = useHeroPastStickyBoundary();

  return (
    <>
      <header className="w-full min-w-0 flex-shrink-0 bg-[#F6F7F8] px-4 pt-4">
        <div className="mx-auto mb-3 w-full max-w-lg px-1">
          <WorthwhileBrandLockup />
        </div>
        <div
          ref={heroRef}
          className="home-insight-card mx-auto w-full min-w-0 max-w-lg overflow-hidden rounded-[1.25rem] bg-white ring-1 ring-black/[0.04]"
        >
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
      </header>
      {isPastBoundary ? <CompactHomeBrandHeader /> : null}
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
