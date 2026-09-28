import React from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../contexts/CurrencyContext';
import { useDashboard } from '../hooks/useDashboard';
import { useItems } from '../hooks/useItems';
import { formatCurrency } from '../utils/formatters';
import HeroCarousel from './HeroCarousel';
import { ItemListContent } from './ItemList';
import WorthwhileBrandLockup from './WorthwhileBrandLockup';
import { HeroSkeleton, NoticeCard } from './ui/AsyncState';
import { useLoadingPhases } from '../hooks/useLoadingPhases';

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

function HomeHeader({
  totalDailyCost = 0,
  currencyCode: dashboardCurrencyCode,
  state = 'content',
  onRetryDashboard,
}) {
  const { t } = useTranslation();
  const { currencyCode } = useCurrency();
  const resolvedCurrencyCode = dashboardCurrencyCode || currencyCode;

  const isBlank = state === 'blank';
  const isLoadingSkeleton = state === 'skeleton' || state === 'slow';
  const isEmpty = state === 'empty';
  const isDashboardError = state === 'dashboard-error';
  const isCollapsed = isBlank || isLoadingSkeleton || state === 'error';
  const isBusy = isBlank || isLoadingSkeleton;
  const hasReflectionCopy = state === 'content' || isDashboardError;

  return (
    <>
      <HomeBrandHeader />
      <div className="w-full min-w-0 flex-shrink-0 px-4">
        <div
          className="home-insight-card mx-auto w-full min-w-0 max-w-lg overflow-hidden rounded-[1.25rem] bg-white ring-1 ring-black/[0.04]"
          data-hero-state={isCollapsed ? 'collapsed' : 'expanded'}
          aria-busy={isBusy}
        >
          <div className="home-reflection-surface relative isolate w-full min-w-0 text-white">
            <div className={`home-reflection-content relative z-[1] w-full min-w-0 min-h-[218px] ${isCollapsed ? 'home-reflection-content--collapsed' : ''}`}>
              <div
                aria-hidden={!isLoadingSkeleton}
                data-home-hero-loading-panel
                className={`grid transition-[grid-template-rows,opacity,visibility] duration-300 ease-out motion-reduce:transition-none ${
                  isLoadingSkeleton
                    ? 'grid-rows-[1fr] opacity-100 visible'
                    : 'grid-rows-[0fr] opacity-0 pointer-events-none invisible'
                }`}
              >
                <div className="min-h-0 overflow-hidden">
                  <HeroSkeleton compact paused={state === 'slow'} />
                </div>
              </div>
              <div
                aria-hidden={isCollapsed}
                data-home-hero-content-panel
                className={`grid transition-[grid-template-rows,opacity,visibility] duration-300 ease-out motion-reduce:transition-none ${
                  isCollapsed
                    ? 'grid-rows-[0fr] opacity-0 pointer-events-none invisible'
                    : 'grid-rows-[1fr] opacity-100 visible'
                }`}
              >
                <div className="home-reflection-content-inner">
                  {!isCollapsed && (isDashboardError ? (
                    <div role="alert" className="flex min-h-[178px] flex-col items-start justify-center px-0.5 py-2 text-left">
                      <p className="mb-3 text-[11px] font-semibold uppercase leading-4 tracking-[0.16em] text-white/70">
                        {t('insights')}
                      </p>
                      <h2 className="text-[1.25rem] font-semibold leading-[1.2] tracking-[-0.02em] text-white sm:text-[1.4rem]">
                        {t('homeDashboardErrorTitle')}
                      </h2>
                      <p className="mt-2 max-w-sm text-sm leading-5 text-white/80">
                        {t('homeDashboardErrorBody')}
                      </p>
                      {typeof onRetryDashboard === 'function' && (
                        <button
                          type="button"
                          onClick={onRetryDashboard}
                          className="mt-4 inline-flex min-h-9 items-center justify-center rounded-xl border border-white/35 bg-white/10 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#32636A]"
                        >
                          {t('tryAgain')}
                        </button>
                      )}
                    </div>
                  ) : isEmpty ? (
                    <div className="flex min-h-[178px] flex-col items-start justify-center px-0.5 py-2 text-left">
                      <h2 className="text-[1.55rem] font-semibold leading-[1.12] tracking-[-0.025em] text-white sm:text-[1.75rem]">
                        {t('homeEmptyHeroTitle')}
                      </h2>
                      <p className="mt-3 max-w-sm text-sm leading-5 text-white/80">
                        {t('homeEmptyHeroBody')}
                      </p>
                    </div>
                  ) : (
                    <HeroCarousel />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <p
            data-home-reflection-row
            aria-hidden={isBusy || !hasReflectionCopy ? true : undefined}
            className="min-h-[72px] max-w-md px-5 py-4 text-sm leading-5 text-[#66707A] sm:min-h-[52px] sm:px-6"
          >
            {isLoadingSkeleton ? (
              <span
                aria-hidden="true"
                className={`block h-2.5 w-2/3 rounded bg-[var(--skeleton-bar)] ${state === 'slow' ? 'state-skeleton state-skeleton--paused' : 'state-skeleton'}`}
              />
            ) : isBusy || !hasReflectionCopy ? null : t('dailyOwnershipReflection', {
              amount: formatCurrency(totalDailyCost, resolvedCurrencyCode),
            })}
          </p>
        </div>
      </div>
    </>
  );
}

function Home() {
  const { t } = useTranslation();
  const {
    data: dashboardData,
    isLoading: isDashboardLoading,
    isFetching: isDashboardFetching,
    isError: isDashboardError,
    isRefetchError,
    refetch: refetchDashboard,
  } = useDashboard();
  const itemsQuery = useItems();
  const initialItemsLoading = itemsQuery.isLoading && itemsQuery.data === undefined;
  const items = itemsQuery.data ?? [];
  const itemLoadingState = useLoadingPhases(initialItemsLoading);
  const initialDashboardLoading = (isDashboardLoading || isDashboardFetching)
    && dashboardData == null;
  const heroLoadingState = useLoadingPhases(
    initialItemsLoading || (items.length > 0 && initialDashboardLoading)
  );
  const isTrueEmpty = itemsQuery.data !== undefined
    && items.length === 0;
  const isInitialItemsError = itemsQuery.isError && itemsQuery.data === undefined;
  const isInitialDashboardError = isDashboardError
    && dashboardData == null
    && items.length > 0;
  const homeState = heroLoadingState.phase !== 'idle'
    ? heroLoadingState.phase
    : isTrueEmpty
      ? 'empty'
      : isInitialItemsError
        ? 'error'
        : isInitialDashboardError
          ? 'dashboard-error'
          : 'content';
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
        state={homeState}
        onRetryDashboard={refetchDashboard}
      />
      {homeState === 'content' && isRefetchError && (
        <div className="mx-auto max-w-lg px-4 pt-3">
          <NoticeCard
            body={t('refreshShowingSavedData')}
            actionLabel={t('tryAgain')}
            onAction={refetchDashboard}
          />
        </div>
      )}
      <ItemListContent
        itemsQuery={itemsQuery}
        loadingPhase={itemLoadingState.phase}
      />
    </div>
  );
}

export { HomeHeader };
export default Home;
