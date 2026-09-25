import React from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../contexts/CurrencyContext';
import { useTotalCost } from '../contexts/TotalCostContext';
import { formatCurrency } from '../utils/formatters';
import HeroCarousel from './HeroCarousel';
import ItemList from './ItemList';

function HomeHeader() {
  const { t } = useTranslation();
  const { totalDailyCost } = useTotalCost();
  const { currencyCode } = useCurrency();

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
              {formatCurrency(totalDailyCost, currencyCode)}
              <span className="text-xs font-normal text-white/75">{t('perDay')}</span>
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

function Home() {
  return (
    <div className="min-h-full">
      <HomeHeader />
      <ItemList />
    </div>
  );
}

export { HomeHeader };
export default Home;
