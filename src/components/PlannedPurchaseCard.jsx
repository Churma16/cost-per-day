import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../utils/formatters';
import {
  IoTimeOutline,
  IoCalendarOutline,
  IoCashOutline,
  IoChevronDown,
  IoCreateOutline,
  IoTrashOutline,
} from 'react-icons/io5';

function PlannedPurchaseCard({
  plannedPurchase,
  onEdit,
  onDelete,
}) {
  const { t } = useTranslation();
  const [isExplorationOpen, setIsExplorationOpen] = useState(false);
  const [exploreContributionAmount, setExploreContributionAmount] = useState(
    plannedPurchase.contributionAmount !== null && plannedPurchase.contributionAmount !== undefined
      ? String(plannedPurchase.contributionAmount)
      : ''
  );
  const [exploreCadence, setExploreCadence] = useState(
    plannedPurchase.contributionCadence || 'daily'
  );

  const currencyCode = plannedPurchase.currencyCode || 'USD';
  const targetPrice = Number(plannedPurchase.targetPrice) || 0;

  // Real-time what-if calculation inside card
  const exploredPeriods = useMemo(() => {
    const numericAmount = parseFloat(exploreContributionAmount);
    if (isNaN(numericAmount) || numericAmount <= 0 || targetPrice <= 0) return null;

    const periods = Math.ceil(targetPrice / numericAmount);
    let days = periods;
    if (exploreCadence === 'weekly') {
      days = Math.ceil(periods * 7);
    } else if (exploreCadence === 'monthly') {
      days = Math.ceil(periods * (365 / 12));
    }
    return { periods, days };
  }, [exploreContributionAmount, exploreCadence, targetPrice]);

  const cadenceName =
    plannedPurchase.contributionCadence === 'daily'
      ? t('cadenceDaily').toLowerCase()
      : plannedPurchase.contributionCadence === 'weekly'
      ? t('cadenceWeekly').toLowerCase()
      : plannedPurchase.contributionCadence === 'monthly'
      ? t('cadenceMonthly').toLowerCase()
      : '';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-teal-100 overflow-hidden hover:shadow-md transition-shadow">
      {/* Top Banner Accent */}
      <div className="h-1.5 bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-600" />

      <div className="p-4 sm:p-5 space-y-4">
        {/* Header: Title, Badge, Price */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 text-base">{plannedPurchase.name}</h3>
              <span className="rounded-full bg-teal-50 border border-teal-200 px-2.5 py-0.5 text-[11px] font-medium text-teal-700">
                {t('statusPlanned')}
              </span>
            </div>
            <div className="mt-1 text-xs text-gray-500">{t('targetPrice')}</div>
            <div className="text-lg font-bold text-teal-800">
              {formatCurrency(targetPrice, currencyCode)}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onEdit(plannedPurchase)}
              className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
              title={t('edit')}
              aria-label={t('edit')}
            >
              <IoCreateOutline className="text-base" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(plannedPurchase.id)}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title={t('deleteItem')}
              aria-label={t('deleteItem')}
            >
              <IoTrashOutline className="text-base" />
            </button>
          </div>
        </div>

        {/* Primary Framing Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-gray-100">
          {/* Contribution -> Time */}
          {plannedPurchase.contributionAmount && plannedPurchase.contributionCadence && (
            <div className="bg-teal-50/50 rounded-lg p-3 border border-teal-100">
              <div className="flex items-center gap-1.5 text-xs text-teal-900 font-medium mb-1">
                <IoCashOutline className="text-teal-600" />
                <span>{t('recurringContribution')}</span>
              </div>
              <div className="text-sm font-bold text-gray-900">
                {formatCurrency(plannedPurchase.contributionAmount, currencyCode)}/{cadenceName}
              </div>
              {plannedPurchase.estimatedPeriods && (
                <div className="mt-1 text-xs text-teal-700 font-medium">
                  &rarr; {t('reachTargetIn', {
                    periods: plannedPurchase.estimatedPeriods,
                    cadence: cadenceName,
                    days: plannedPurchase.estimatedDays || plannedPurchase.estimatedPeriods,
                  })}
                </div>
              )}
            </div>
          )}

          {/* Target Date -> Contribution */}
          {plannedPurchase.targetDate && (
            <div className="bg-cyan-50/50 rounded-lg p-3 border border-cyan-100">
              <div className="flex items-center gap-1.5 text-xs text-cyan-900 font-medium mb-1">
                <IoCalendarOutline className="text-cyan-600" />
                <span>{t('targetDate')}</span>
              </div>
              <div className="text-sm font-bold text-gray-900">
                {plannedPurchase.targetDate}
              </div>
              {plannedPurchase.requiredDailyContribution && (
                <div className="mt-1 text-xs text-cyan-800 font-medium">
                  {formatCurrency(plannedPurchase.requiredDailyContribution, currencyCode)}/day &middot; {formatCurrency(plannedPurchase.requiredMonthlyContribution || 0, currencyCode)}/month
                </div>
              )}
            </div>
          )}
        </div>

        {/* Interactive Exploration Toggle */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setIsExplorationOpen(!isExplorationOpen)}
            className="flex items-center justify-between w-full text-xs font-semibold text-teal-700 hover:text-teal-900 py-1"
          >
            <span className="flex items-center gap-1">
              <IoTimeOutline className="text-sm" />
              {t('exploreFraming')}
            </span>
            <IoChevronDown
              className={`transform transition-transform ${isExplorationOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {isExplorationOpen && (
            <div className="mt-2.5 p-3 rounded-lg bg-gray-50 border border-gray-200 text-xs space-y-3">
              <p className="text-gray-600 text-[11px]">
                {t('planningSubtitle')}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">
                    {t('cadence')}
                  </label>
                  <select
                    value={exploreCadence}
                    onChange={(e) => setExploreCadence(e.target.value)}
                    className="w-full rounded border border-gray-300 p-1.5 text-xs bg-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="daily">{t('cadenceDaily')}</option>
                    <option value="weekly">{t('cadenceWeekly')}</option>
                    <option value="monthly">{t('cadenceMonthly')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">
                    {t('recurringContribution')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={exploreContributionAmount}
                    onChange={(e) => setExploreContributionAmount(e.target.value)}
                    placeholder={t('enterContributionAmount')}
                    className="w-full rounded border border-gray-300 p-1.5 text-xs bg-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {exploredPeriods && (
                <div className="p-2 rounded bg-white border border-teal-100 text-teal-950 font-medium">
                  {t('reachTargetIn', {
                    periods: exploredPeriods.periods,
                    cadence:
                      exploreCadence === 'daily'
                        ? t('cadenceDaily').toLowerCase()
                        : exploreCadence === 'weekly'
                        ? t('cadenceWeekly').toLowerCase()
                        : t('cadenceMonthly').toLowerCase(),
                    days: exploredPeriods.days,
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PlannedPurchaseCard;
