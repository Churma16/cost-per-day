import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IoChevronDown, IoTimeOutline } from 'react-icons/io5';
import { formatCurrency } from '../../utils/formatters';
import { calculateContributionProjection } from '../../utils/plannedPurchaseProjection';
import CurrencyInput from '../common/CurrencyInput';

function PlannedPurchaseExploration({
  targetPrice,
  currencyCode,
  initialContributionAmount,
  initialCadence,
}) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [contributionAmount, setContributionAmount] = useState(
    initialContributionAmount !== null && initialContributionAmount !== undefined
      ? String(initialContributionAmount)
      : ''
  );
  const [cadence, setCadence] = useState(initialCadence || 'daily');

  const exploredProjection = useMemo(
    () =>
      calculateContributionProjection({
        targetPrice,
        contributionAmount: parseFloat(contributionAmount),
        cadence,
      }),
    [contributionAmount, cadence, targetPrice]
  );

  const exploredPeriodUnit =
    cadence === 'daily'
      ? t('unitDays')
      : cadence === 'weekly'
        ? t('unitWeeks')
        : t('unitMonths');

  return (
    <div className="pt-2">
      <button
        type="button"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        className="flex items-center justify-between w-full text-xs font-semibold text-teal-700 hover:text-teal-900 py-1"
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-1">
          <IoTimeOutline className="text-sm" />
          {t('exploreFraming')}
        </span>
        <IoChevronDown
          className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="mt-2.5 p-3 rounded-lg bg-gray-50 border border-gray-200 text-xs space-y-3">
          <p className="text-gray-600 text-[11px]">
            {t('explorePaceDescription')}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">
                {t('cadence')}
              </label>
              <select
                value={cadence}
                onChange={(event) => setCadence(event.target.value)}
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
              <CurrencyInput
                value={contributionAmount}
                onChange={(event) => setContributionAmount(event.target.value)}
                currencyCode={currencyCode}
                placeholder={t('enterContributionAmount')}
                className="w-full rounded border border-gray-300 p-1.5 text-xs bg-white focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          {exploredProjection && (
            <div className="p-2 rounded bg-white border border-teal-100 text-teal-950 font-medium">
              {cadence === 'daily'
                ? t('reachTargetInDays', { days: exploredProjection.estimatedDays })
                : t('reachTargetIn', {
                    periods: exploredProjection.periods,
                    periodUnit: exploredPeriodUnit,
                    days: exploredProjection.estimatedDays,
                  })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PlannedPurchaseExploration;
