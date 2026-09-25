import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../utils/formatters';
import PlannedPurchaseExploration from './planned-purchase/PlannedPurchaseExploration';
import {
  IoCalendarOutline,
  IoCashOutline,
  IoCreateOutline,
  IoTrashOutline,
} from 'react-icons/io5';

function PlannedPurchaseCard({
  plannedPurchase,
  onEdit,
  onDelete,
}) {
  const { t } = useTranslation();

  const currencyCode = plannedPurchase.currencyCode || 'USD';
  const targetPrice = Number(plannedPurchase.targetPrice) || 0;

  const cadencePer =
    plannedPurchase.contributionCadence === 'daily'
      ? t('cadencePerDaily')
      : plannedPurchase.contributionCadence === 'weekly'
        ? t('cadencePerWeekly')
        : plannedPurchase.contributionCadence === 'monthly'
          ? t('cadencePerMonthly')
          : '';

  const periodUnit =
    plannedPurchase.contributionCadence === 'daily'
      ? t('unitDays')
      : plannedPurchase.contributionCadence === 'weekly'
        ? t('unitWeeks')
        : t('unitMonths');

  const isDaily = plannedPurchase.contributionCadence === 'daily';
  const estimatedPeriods = Number(plannedPurchase.estimatedPeriods || 0);
  const estimatedDays = Number(plannedPurchase.estimatedDays || 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-teal-100 overflow-hidden hover:shadow-md transition-shadow">
      <div className="h-1.5 bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-600" />

      <div className="p-4 sm:p-5 space-y-4">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-gray-100">
          {plannedPurchase.contributionAmount && plannedPurchase.contributionCadence && (
            <div className="bg-teal-50/50 rounded-lg p-3 border border-teal-100">
              <div className="flex items-center gap-1.5 text-xs text-teal-900 font-medium mb-1">
                <IoCashOutline className="text-teal-600" />
                <span>{t('recurringContribution')}</span>
              </div>
              <div className="text-sm font-bold text-gray-900">
                {formatCurrency(plannedPurchase.contributionAmount, currencyCode)} {cadencePer}
              </div>
              {plannedPurchase.estimatedPeriods && (
                <div className="mt-1 text-xs text-teal-700 font-medium">
                  &rarr; {isDaily
                    ? t('reachTargetInDays', { days: estimatedDays })
                    : t('reachTargetIn', {
                        periods: estimatedPeriods,
                        periodUnit,
                        days: estimatedDays,
                      })}
                </div>
              )}
            </div>
          )}

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
                  {formatCurrency(plannedPurchase.requiredDailyContribution, currencyCode)} {t('cadencePerDaily')} &middot; {formatCurrency(plannedPurchase.requiredMonthlyContribution || 0, currencyCode)} {t('cadencePerMonthly')}
                </div>
              )}
            </div>
          )}
        </div>

        <PlannedPurchaseExploration
          targetPrice={targetPrice}
          currencyCode={currencyCode}
          initialContributionAmount={plannedPurchase.contributionAmount}
          initialCadence={plannedPurchase.contributionCadence}
        />
      </div>
    </div>
  );
}

export default PlannedPurchaseCard;
