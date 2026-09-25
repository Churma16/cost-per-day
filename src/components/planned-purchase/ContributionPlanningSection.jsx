import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../utils/formatters';
import { calculateContributionProjection } from '../../utils/plannedPurchaseProjection';
import CurrencyInput from '../common/CurrencyInput';

function ContributionPlanningSection({
  targetPrice,
  contributionCadence,
  onContributionCadenceChange,
  contributionAmount,
  onContributionAmountChange,
  currencyCode,
}) {
  const { t } = useTranslation();
  const numericContributionAmount = parseFloat(contributionAmount);

  const liveTimeProjection = useMemo(
    () =>
      calculateContributionProjection({
        targetPrice,
        contributionAmount: numericContributionAmount,
        cadence: contributionCadence,
      }),
    [targetPrice, numericContributionAmount, contributionCadence]
  );

  const livePeriodUnit =
    contributionCadence === 'daily'
      ? t('unitDays')
      : contributionCadence === 'weekly'
        ? t('unitWeeks')
        : t('unitMonths');

  const liveCadencePer =
    contributionCadence === 'daily'
      ? t('cadencePerDaily')
      : contributionCadence === 'weekly'
        ? t('cadencePerWeekly')
        : t('cadencePerMonthly');

  return (
    <div className="rounded-xl bg-teal-50/60 border border-teal-100 p-4 space-y-3">
      <div>
        <label className="block text-xs font-medium text-teal-900 mb-1">{t('cadence')}</label>
        <div className="grid grid-cols-3 gap-2">
          {['daily', 'weekly', 'monthly'].map((cadenceOption) => (
            <button
              key={cadenceOption}
              type="button"
              onClick={() => onContributionCadenceChange(cadenceOption)}
              className={`py-1.5 px-2 text-xs rounded-md border font-medium transition-colors ${
                contributionCadence === cadenceOption
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
              aria-pressed={contributionCadence === cadenceOption}
            >
              {cadenceOption === 'daily'
                ? t('cadenceDaily')
                : cadenceOption === 'weekly'
                  ? t('cadenceWeekly')
                  : t('cadenceMonthly')}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="contribution-amount" className="block text-xs font-medium text-teal-900">
          {t('recurringContribution')}
        </label>
        <CurrencyInput
          id="contribution-amount"
          value={contributionAmount}
          onChange={(event) => onContributionAmountChange(event.target.value)}
          currencyCode={currencyCode}
          placeholder={t('enterContributionAmount')}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
        />
      </div>

      {liveTimeProjection && (
        <div className="rounded-lg bg-white p-3 border border-teal-200 text-xs text-teal-950 space-y-1">
          <span className="font-semibold block text-teal-800">{t('timeToReachTarget')}:</span>
          <p className="text-sm font-bold text-teal-700">
            {contributionCadence === 'daily'
              ? t('reachTargetInDays', { days: liveTimeProjection.estimatedDays })
              : t('reachTargetIn', {
                  periods: liveTimeProjection.periods,
                  periodUnit: livePeriodUnit,
                  days: liveTimeProjection.estimatedDays,
                })}
          </p>
          <p className="text-gray-500 text-[11px]">
            {formatCurrency(numericContributionAmount, currencyCode)} {liveCadencePer} &rarr; {formatCurrency(targetPrice, currencyCode)}
          </p>
        </div>
      )}
    </div>
  );
}

export default ContributionPlanningSection;
