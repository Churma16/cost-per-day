import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useDurabilityAnalytics,
  useCategories,
} from '../hooks/useDurabilityAnalytics';
import { useCurrency } from '../contexts/CurrencyContext';
import { formatCurrency } from '../utils/formatters';
import {
  IoShieldCheckmarkOutline,
  IoStatsChartOutline,
  IoTimeOutline,
  IoRibbonOutline,
  IoChevronDownOutline,
  IoChevronUpOutline,
  IoFilterOutline,
  IoInformationCircleOutline,
  IoRefreshOutline,
  IoCashOutline,
  IoCalendarOutline,
} from 'react-icons/io5';

function DurabilityAnalytics() {
  const { t } = useTranslation();
  const { currencyCode } = useCurrency();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [expandedBrandKeys, setExpandedBrandKeys] = useState({});

  const {
    data: analyticsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useDurabilityAnalytics({ category: selectedCategory });

  const { data: availableCategories = [] } = useCategories();

  const toggleBrandEvidence = (brandKey) => {
    setExpandedBrandKeys((previousState) => ({
      ...previousState,
      [brandKey]: !previousState[brandKey],
    }));
  };

  const formatDaysToMonths = (days) => {
    if (!days || days <= 0) return '';
    const months = (days / 30.4375).toFixed(1);
    return `(~${months} mo)`;
  };

  return (
    <div className="px-4 pt-4 pb-12 space-y-6 max-w-4xl mx-auto durability-analytics-content">
      {/* Intro Header */}
      <div className="rounded-2xl p-6 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 text-white shadow-sm space-y-2">
        <div className="flex items-center gap-2">
          <IoShieldCheckmarkOutline className="text-2xl text-purple-300" />
          <h1 className="text-xl font-bold tracking-tight">{t('durabilityAndOwnership')}</h1>
        </div>
        <p className="text-xs sm:text-sm text-purple-200 max-w-2xl leading-relaxed">
          {t('durabilitySubtitle')}
        </p>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 mr-2">
          <IoFilterOutline className="text-sm" />
          <span>{t('filterByCategory')}:</span>
        </div>
        <button
          type="button"
          onClick={() => setSelectedCategory('')}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
            selectedCategory === ''
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {t('allCategories')}
        </button>
        {availableCategories.map((category) => (
          <button
            key={category.id || category.name}
            type="button"
            onClick={() => setSelectedCategory(category.name)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
              selectedCategory === category.name
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Loading & Error States */}
      {isLoading && analyticsData == null && (
        <div className="text-center py-12 text-gray-500 text-sm">
          {t('loading')}
        </div>
      )}

      {isError && analyticsData == null && (
        <div className="rounded-xl bg-red-50 p-4 border border-red-200 flex items-center justify-between">
          <div className="text-sm text-red-700">
            {error?.message || t('errorLoadingDurability')}
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="flex items-center gap-1 text-xs font-semibold text-red-700 hover:text-red-800"
          >
            <IoRefreshOutline /> {t('retry')}
          </button>
        </div>
      )}

      {/* Analytics Content */}
      {analyticsData && (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-purple-100 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-purple-600 mb-1">
                <IoStatsChartOutline className="text-lg" />
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Completed Items
                </span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {analyticsData.totalCompletedItems}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {analyticsData.totalCategorizedCompletedItems} categorized
              </div>
            </div>

            <div className="rounded-xl border border-purple-100 bg-white p-4 shadow-sm sm:col-span-2">
              <div className="flex items-center gap-2 text-purple-600 mb-1">
                <IoTimeOutline className="text-lg" />
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {t('mostFrequentlyReplacedCategory')}
                </span>
              </div>
              {analyticsData.mostFrequentlyReplacedCategory ? (
                <div>
                  <div className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <span>{analyticsData.mostFrequentlyReplacedCategory.category}</span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                      {analyticsData.mostFrequentlyReplacedCategory.completedCount} items
                    </span>
                  </div>
                  {analyticsData.mostFrequentlyReplacedCategory.typicalReplacementIntervalDays && (
                    <div className="text-xs text-gray-500 mt-1">
                      {t('typicalReplacementInterval')}: ~
                      {Math.round(analyticsData.mostFrequentlyReplacedCategory.typicalReplacementIntervalDays)} {t('daysShort')}{' '}
                      {formatDaysToMonths(analyticsData.mostFrequentlyReplacedCategory.typicalReplacementIntervalDays)}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-400 italic">
                  Not enough historical replacements yet
                </div>
              )}
            </div>
          </div>

          {/* Empty State */}
          {(!analyticsData.categories || analyticsData.categories.length === 0) && (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                <IoShieldCheckmarkOutline className="text-2xl" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">
                {t('noDurabilityDataTitle')}
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
                {t('noDurabilityDataDescription')}
              </p>
            </div>
          )}

          {/* Categories & Brand Insights Breakdown */}
          {analyticsData.categories && analyticsData.categories.length > 0 && (
            <div className="space-y-6">
              {analyticsData.categories.map((categoryInsight) => (
                <div
                  key={categoryInsight.category}
                  className="rounded-2xl border border-purple-100 bg-white shadow-sm overflow-hidden"
                >
                  {/* Category Header */}
                  <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-purple-50/50 to-white">
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-gray-900">
                          {categoryInsight.category}
                        </h2>
                        <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800">
                          {t('completedItemsCount', { count: categoryInsight.completedCount })}
                        </span>
                      </div>

                      {/* Best performers badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {categoryInsight.longestLastingBrand && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 border border-emerald-200">
                            <IoRibbonOutline />
                            <span>{t('longestLastingBrand')}: {categoryInsight.longestLastingBrand}</span>
                          </span>
                        )}
                        {categoryInsight.lowestCostBrand && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 border border-blue-200">
                            <IoCashOutline />
                            <span>{t('lowestCostBrand')}: {categoryInsight.lowestCostBrand}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Metrics Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2">
                      <div className="bg-white rounded-lg p-2.5 border border-purple-50">
                        <span className="text-gray-500 block">{t('averageLifespan')}</span>
                        <span className="font-semibold text-gray-900 text-sm">
                          {Math.round(categoryInsight.averageLifetimeDays)} {t('daysShort')}{' '}
                          <span className="text-gray-400 font-normal">
                            {formatDaysToMonths(categoryInsight.averageLifetimeDays)}
                          </span>
                        </span>
                      </div>
                      <div className="bg-white rounded-lg p-2.5 border border-purple-50">
                        <span className="text-gray-500 block">{t('medianLifespan')}</span>
                        <span className="font-semibold text-gray-900 text-sm">
                          {Math.round(categoryInsight.medianLifetimeDays)} {t('daysShort')}
                        </span>
                      </div>
                      <div className="bg-white rounded-lg p-2.5 border border-purple-50">
                        <span className="text-gray-500 block">{t('currentCostPerDay')}</span>
                        <span className="font-semibold text-gray-900 text-sm">
                          {formatCurrency(categoryInsight.averageFinalCostPerDay, currencyCode)}{t('perDay')}
                        </span>
                      </div>
                      <div className="bg-white rounded-lg p-2.5 border border-purple-50">
                        <span className="text-gray-500 block">{t('typicalReplacementInterval')}</span>
                        <span className="font-semibold text-gray-900 text-sm">
                          {categoryInsight.typicalReplacementIntervalDays
                            ? `~${Math.round(categoryInsight.typicalReplacementIntervalDays)} ${t('daysShort')}`
                            : '-'}
                        </span>
                      </div>
                    </div>

                    {/* Comparison Summary Statement */}
                    {categoryInsight.comparisonSummaryText && (
                      <div className="mt-3 rounded-xl bg-purple-50/70 p-3 border border-purple-100 flex items-start gap-2.5">
                        <IoInformationCircleOutline className="text-purple-600 text-base flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-purple-900 leading-relaxed font-medium">
                          {categoryInsight.comparisonSummaryText}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Brand Comparison Section */}
                  <div className="p-5 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      {t('brandComparison')}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {categoryInsight.brands.map((brandInsight) => {
                        const brandKey = `${categoryInsight.category}-${brandInsight.brand}`;
                        const isExpanded = !!expandedBrandKeys[brandKey];

                        return (
                          <div
                            key={brandKey}
                            className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-3 hover:border-purple-200 transition-all"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="font-bold text-gray-900 text-sm">
                                {brandInsight.brand}
                              </h4>
                              {brandInsight.isPattern ? (
                                <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-xs font-semibold">
                                  {t('patternDetected', { count: brandInsight.completedCount })}
                                </span>
                              ) : (
                                <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-semibold">
                                  {t('singleObservation')}
                                </span>
                              )}
                            </div>

                            {/* Brand Metrics */}
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="bg-white rounded p-2 border border-gray-100">
                                <span className="text-gray-400 block">{t('averageLifespan')}</span>
                                <span className="font-semibold text-gray-800">
                                  {Math.round(brandInsight.averageLifetimeDays)} {t('daysShort')}{' '}
                                  <span className="text-gray-400 font-normal">
                                    {formatDaysToMonths(brandInsight.averageLifetimeDays)}
                                  </span>
                                </span>
                              </div>
                              <div className="bg-white rounded p-2 border border-gray-100">
                                <span className="text-gray-400 block">Final Cost/Day</span>
                                <span className="font-semibold text-gray-800">
                                  {formatCurrency(brandInsight.averageFinalCostPerDay, currencyCode)}{t('perDay')}
                                </span>
                              </div>
                            </div>

                            <p className="text-xs text-gray-600 leading-relaxed italic bg-white p-2.5 rounded border border-gray-100">
                              "{brandInsight.observationText}"
                            </p>

                            <div className="flex items-center justify-between pt-1 text-xs">
                              <span className="text-gray-500 font-medium">
                                {t('totalSpentOnBrand', {
                                  amount: formatCurrency(brandInsight.totalSpent, currencyCode),
                                })}
                              </span>

                              {brandInsight.items && brandInsight.items.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => toggleBrandEvidence(brandKey)}
                                  className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-800 font-semibold"
                                >
                                  <span>
                                    {isExpanded ? t('hideEvidence') : t('viewEvidence')} (
                                    {brandInsight.items.length})
                                  </span>
                                  {isExpanded ? (
                                    <IoChevronUpOutline className="text-sm" />
                                  ) : (
                                    <IoChevronDownOutline className="text-sm" />
                                  )}
                                </button>
                              )}
                            </div>

                            {/* Item Evidence Accordion */}
                            {isExpanded && brandInsight.items && (
                              <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                                  {t('evidence')}
                                </span>
                                {brandInsight.items.map((evidence) => (
                                  <div
                                    key={evidence.id}
                                    className="bg-white rounded-lg p-2.5 border border-purple-50 text-xs space-y-1"
                                  >
                                    <div className="flex items-center justify-between font-medium text-gray-900">
                                      <span>{evidence.name}</span>
                                      <span className="font-bold text-purple-700">
                                        {formatCurrency(evidence.finalCostPerDay, currencyCode)}{t('perDay')}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] text-gray-500">
                                      <span>
                                        {evidence.purchaseDate} - {evidence.endedAt} ({evidence.ownershipDays} {t('daysShort')})
                                      </span>
                                      <span className="capitalize">{evidence.status}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default DurabilityAnalytics;
