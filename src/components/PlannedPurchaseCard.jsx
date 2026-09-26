import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  IoCalendarOutline,
  IoCashOutline,
  IoChevronDown,
  IoCreateOutline,
  IoTrashOutline,
} from 'react-icons/io5';
import { formatCurrency, formatDisplayDate } from '../utils/formatters';
import { computeTargetDateFromEstimatedDays } from '../utils/plannedPurchaseProjection';
import PlannedPurchaseExploration from './planned-purchase/PlannedPurchaseExploration';

function PlannedPurchaseCard({
  plannedPurchase,
  isExpanded = false,
  onToggle,
  onEdit,
  onDelete,
  onApplyScenario,
  isUpdating = false,
  updateError = null,
}) {
  const { t, i18n } = useTranslation();

  const currencyCode = plannedPurchase.currencyCode || 'USD';
  const targetPrice = Number(plannedPurchase.targetPrice) || 0;

  const hasContribution = Boolean(
    plannedPurchase.contributionAmount && plannedPurchase.contributionCadence
  );
  const hasTargetDate = Boolean(plannedPurchase.targetDate);

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
        : plannedPurchase.contributionCadence === 'monthly'
          ? t('unitMonths')
          : '';

  const isDaily = plannedPurchase.contributionCadence === 'daily';
  const estimatedPeriods = Number(plannedPurchase.estimatedPeriods || 0);
  const estimatedDays = Number(plannedPurchase.estimatedDays || 0);

  const calculatedTargetDate = useMemo(() => {
    if (!hasContribution || !estimatedDays) return null;
    return computeTargetDateFromEstimatedDays(estimatedDays);
  }, [hasContribution, estimatedDays]);

  const heroDurationText = isDaily
    ? t('reachTargetInDays', { days: estimatedDays })
    : t('reachTargetIn', {
        periods: estimatedPeriods,
        periodUnit,
        days: estimatedDays,
      });

  let timeConstraintText = '';
  let derivedInterpretationText = '';

  if (hasContribution && calculatedTargetDate) {
    timeConstraintText = `${formatCurrency(plannedPurchase.contributionAmount, currencyCode)} ${cadencePer}`;
    derivedInterpretationText = `≈ ${t('reachedAroundDate', { date: formatDisplayDate(calculatedTargetDate, i18n?.language) })}`;
  } else if (hasTargetDate) {
    timeConstraintText = t('targetDatePrefix', { date: formatDisplayDate(plannedPurchase.targetDate, i18n?.language) });
    const dailyStr = formatCurrency(plannedPurchase.requiredDailyContribution, currencyCode);
    const monthlyStr = formatCurrency(plannedPurchase.requiredMonthlyContribution || 0, currencyCode);
    derivedInterpretationText = `≈ ${dailyStr} ${t('cadencePerDaily')} · ${monthlyStr} ${t('cadencePerMonthly')}`;
  } else {
    timeConstraintText = t('noScenarioConfigured');
    derivedInterpretationText = t('configurePacePrompt');
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#E6E8EC] hover:border-teal-200 transition-all overflow-hidden">
      {/* Collapsed Compact View Trigger */}
      <button
        type="button"
        id={`planned-purchase-trigger-${plannedPurchase.id}`}
        aria-expanded={isExpanded}
        aria-controls={`planned-purchase-details-${plannedPurchase.id}`}
        onClick={onToggle}
        className="w-full text-left p-3.5 sm:p-4 min-h-[48px] space-y-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 hover:bg-[#F9FAFB] transition-colors"
      >
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-semibold text-[#20242A] text-sm sm:text-base truncate block">
            {plannedPurchase.name}
          </span>
          <span className="text-sm sm:text-base font-bold text-[#20242A] tabular-nums shrink-0">
            {formatCurrency(targetPrice, currencyCode)}
          </span>
        </div>

        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0 space-y-0.5">
            <div className="text-xs font-medium text-gray-700">
              {timeConstraintText}
            </div>
            <div className="text-xs text-[#6F7782] truncate">
              {derivedInterpretationText}
            </div>
          </div>
          <IoChevronDown
            aria-hidden="true"
            className={`transition-transform duration-300 ease-out motion-reduce:transition-none text-base text-[#6F7782] shrink-0 mb-0.5 ${
              isExpanded ? 'rotate-180 text-teal-600' : ''
            }`}
          />
        </div>
      </button>

      {/* Expanded Details Container */}
      <div
        id={`planned-purchase-details-${plannedPurchase.id}`}
        role="region"
        aria-labelledby={`planned-purchase-trigger-${plannedPurchase.id}`}
        aria-hidden={!isExpanded}
        inert={!isExpanded ? true : undefined}
        className={`grid transition-[grid-template-rows,opacity,visibility] duration-300 ease-out motion-reduce:transition-none ${
          isExpanded
            ? 'grid-rows-[1fr] opacity-100 visible'
            : 'grid-rows-[0fr] opacity-0 pointer-events-none invisible'
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4 pt-3 border-t border-[#E6E8EC] space-y-4">
            {/* Top Action Bar: Edit & Delete buttons with >= 40px circular touch targets */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs text-[#6F7782] font-medium">{t('targetPrice')}</div>
                <div className="text-xl font-bold text-[#20242A]">
                  {formatCurrency(targetPrice, currencyCode)}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  tabIndex={isExpanded ? 0 : -1}
                  onClick={() => onEdit(plannedPurchase)}
                  className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center text-gray-500 hover:text-teal-600 hover:bg-teal-50 border border-gray-200 hover:border-teal-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                  title={t('edit')}
                  aria-label={t('edit')}
                >
                  <IoCreateOutline className="text-lg" />
                </button>
                <button
                  type="button"
                  tabIndex={isExpanded ? 0 : -1}
                  onClick={() => onDelete(plannedPurchase.id)}
                  className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center text-gray-500 hover:text-red-600 hover:bg-red-50 border border-gray-200 hover:border-red-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                  title={t('deleteItem')}
                  aria-label={t('deleteItem')}
                >
                  <IoTrashOutline className="text-lg" />
                </button>
              </div>
            </div>

            {/* Primary Result Panel */}
            {hasContribution && calculatedTargetDate ? (
              <div className="bg-[#F6F8F8] rounded-xl p-3.5 border border-teal-100/90 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-teal-900 font-medium">
                  <span className="flex items-center gap-1.5">
                    <IoCashOutline className="text-teal-600 text-sm" />
                    <span>
                      {formatCurrency(plannedPurchase.contributionAmount, currencyCode)} {cadencePer}
                    </span>
                  </span>
                  <span className="text-[11px] font-medium text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded-full">
                    {t('saved')}
                  </span>
                </div>
                <div className="text-[11px] text-[#6F7782]">{t('reachedAround')}</div>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-lg sm:text-xl font-bold text-[#20242A]">
                    {formatDisplayDate(calculatedTargetDate, i18n?.language)}
                  </span>
                  <span className="text-xs text-[#6F7782] font-medium">
                    ({heroDurationText})
                  </span>
                </div>
              </div>
            ) : hasTargetDate ? (
              <div className="bg-[#F6F9FA] rounded-xl p-3.5 border border-cyan-100/90 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs text-cyan-900 font-medium">
                  <IoCalendarOutline className="text-cyan-600 text-sm" />
                  <span>{t('targetDate')}</span>
                </div>
                <div className="text-lg sm:text-xl font-bold text-[#20242A]">
                  {formatDisplayDate(plannedPurchase.targetDate, i18n?.language)}
                </div>
                {plannedPurchase.requiredDailyContribution && (
                  <div className="text-xs text-cyan-900 font-medium">
                    {formatCurrency(plannedPurchase.requiredDailyContribution, currencyCode)} {t('cadencePerDaily')} &middot; {formatCurrency(plannedPurchase.requiredMonthlyContribution || 0, currencyCode)} {t('cadencePerMonthly')}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-200 space-y-1">
                <div className="text-xs font-semibold text-gray-800">
                  {t('noScenarioConfigured')}
                </div>
                <div className="text-[11px] text-[#6F7782]">
                  {t('configurePacePrompt')}
                </div>
              </div>
            )}

            {/* Scenario Accordion */}
            <PlannedPurchaseExploration
              targetPrice={targetPrice}
              currencyCode={currencyCode}
              initialContributionAmount={plannedPurchase.contributionAmount}
              initialCadence={plannedPurchase.contributionCadence}
              initialTargetDate={plannedPurchase.targetDate}
              onApplyScenario={(scenario) =>
                onApplyScenario?.({
                  plannedPurchaseId: plannedPurchase.id,
                  ...scenario,
                })
              }
              isApplying={isUpdating}
              applyError={updateError}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlannedPurchaseCard;
