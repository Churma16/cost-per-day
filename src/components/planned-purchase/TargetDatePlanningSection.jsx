import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../utils/formatters';
import { calculateTargetDateProjection } from '../../utils/plannedPurchaseProjection';
import { FormField, formControlClassName } from '../common/FormSectionCard';

const getTomorrowDateString = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
};

function TargetDatePlanningSection({
  targetPrice,
  targetDate,
  onTargetDateChange,
  currencyCode,
}) {
  const { t } = useTranslation();

  const liveContributionProjection = useMemo(
    () =>
      calculateTargetDateProjection({
        targetPrice,
        targetDate,
      }),
    [targetPrice, targetDate]
  );

  return (
    <div className="rounded-xl bg-teal-50/60 border border-teal-100 p-3 space-y-3">
      <FormField label={t('targetDate')} htmlFor="target-date-input">
        <input
          id="target-date-input"
          type="date"
          min={getTomorrowDateString()}
          value={targetDate}
          onChange={(event) => onTargetDateChange(event.target.value)}
          className={formControlClassName}
        />
      </FormField>

      {liveContributionProjection && (
        <div className="rounded-lg bg-white p-3 border border-teal-200 text-xs text-teal-950 space-y-2">
          <span className="font-semibold block text-teal-800">{t('requiredContribution')}:</span>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-gray-50 p-2 rounded border border-gray-100">
              <div className="text-[10px] text-gray-500">{t('cadenceDaily')}</div>
              <div className="font-bold text-xs text-gray-900">
                {formatCurrency(liveContributionProjection.daily, currencyCode)}
              </div>
            </div>
            <div className="bg-gray-50 p-2 rounded border border-gray-100">
              <div className="text-[10px] text-gray-500">{t('cadenceWeekly')}</div>
              <div className="font-bold text-xs text-gray-900">
                {formatCurrency(liveContributionProjection.weekly, currencyCode)}
              </div>
            </div>
            <div className="bg-gray-50 p-2 rounded border border-gray-100">
              <div className="text-[10px] text-gray-500">{t('cadenceMonthly')}</div>
              <div className="font-bold text-xs text-gray-900">
                {formatCurrency(liveContributionProjection.monthly, currencyCode)}
              </div>
            </div>
          </div>
          <p className="text-[11px] text-gray-500 text-center">
            {t('daysRemaining', { days: liveContributionProjection.daysRemaining })}
          </p>
        </div>
      )}
    </div>
  );
}

export default TargetDatePlanningSection;
