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
      className="sticky top-0 z-10 shadow-sm flex-shrink-0 text-white"
      style={{
        background: 'linear-gradient(135deg, #334A5B 0%, #32636A 55%, #2F7473 100%)',
      }}
    >
      <div className="pt-3 pb-3 px-4 max-w-lg mx-auto">
        <div>
          <HeroCarousel />
          <div className="mt-2.5 pt-2.5 border-t border-white/10 flex items-center justify-between text-white/90 px-1">
            <span className="text-xs tracking-wide text-white/75 font-normal">{t('totalDailyCost')}</span>
            <span className="font-semibold text-base text-white tracking-tight tabular-nums">
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
