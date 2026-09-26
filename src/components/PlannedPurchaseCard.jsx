import React, { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  IoCalendarOutline,
  IoCashOutline,
  IoChevronDown,
  IoCreateOutline,
  IoPricetagOutline,
  IoTrashOutline,
} from 'react-icons/io5';
import { formatCurrency, formatDisplayDate } from '../utils/formatters';
import { computeTargetDateFromEstimatedDays } from '../utils/plannedPurchaseProjection';
import PlannedPurchaseExploration from './planned-purchase/PlannedPurchaseExploration';
import { CollapsibleCard } from './ui/CollapsibleCard';
import { InfoTile } from './ui/InfoTile';
import { ActionButton } from './ui/ActionButton';

export const PlannedPurchaseCard = memo(function PlannedPurchaseCard({
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

  // Row 2: User's chosen constraint (input)
  let userConstraintText = '';
  // Row 3: Worthwhile's interpretation (value)
  let worthwhileInterpretationText = '';

  if (hasContribution && calculatedTargetDate) {
    userConstraintText = `${formatCurrency(plannedPurchase.contributionAmount, currencyCode)} ${cadencePer}`;
    worthwhileInterpretationText = t('estimatedTargetPrefix', {
      date: formatDisplayDate(calculatedTargetDate, i18n?.language),
    });
  } else if (hasTargetDate) {
    userConstraintText = t('targetDatePrefix', {
      date: formatDisplayDate(plannedPurchase.targetDate, i18n?.language),
    });
    const dailyStr = formatCurrency(plannedPurchase.requiredDailyContribution, currencyCode);
    const monthlyStr = formatCurrency(plannedPurchase.requiredMonthlyContribution || 0, currencyCode);
    worthwhileInterpretationText = t('needsPace', {
      daily: `${dailyStr} ${t('cadencePerDaily')}`,
      monthly: `${monthlyStr} ${t('cadencePerMonthly')}`,
    });
  } else {
    userConstraintText = t('noScenarioConfigured');
    worthwhileInterpretationText = t('configurePacePrompt');
  }

  const handleToggle = useCallback(() => {
    onToggle?.(plannedPurchase.id);
  }, [onToggle, plannedPurchase.id]);

  const handleEdit = useCallback(() => {
    onEdit?.(plannedPurchase);
  }, [onEdit, plannedPurchase]);

  const handleDelete = useCallback(() => {
    onDelete?.(plannedPurchase.id);
  }, [onDelete, plannedPurchase.id]);

  const handleApplyScenarioInternal = useCallback(
    (scenario) => {
      onApplyScenario?.({
        plannedPurchaseId: plannedPurchase.id,
        ...scenario,
      });
    },
    [onApplyScenario, plannedPurchase.id]
  );

  const headerContent = (
    <div>
      {/* Row 1: What + Price (Identity) */}
      <div className="flex items-baseline justify-between gap-3 leading-snug">
        <span className="font-semibold text-[#20242A] text-sm sm:text-base truncate block">
          {plannedPurchase.name}
        </span>
        <span className="text-sm sm:text-base font-bold text-[#20242A] tabular-nums shrink-0">
          {formatCurrency(targetPrice, currencyCode)}
        </span>
      </div>

      {/* Row 2 (Constraint) & Row 3 (Interpretation) with Vertically Centered Chevron */}
      <div className="mt-0.5 flex items-center justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <div className="text-xs font-medium text-gray-600 truncate">
            {userConstraintText}
          </div>
          <div className="text-xs font-medium text-teal-700 truncate">
            {worthwhileInterpretationText}
          </div>
        </div>
        <IoChevronDown
          aria-hidden="true"
          className={`transition-transform duration-300 ease-out motion-reduce:transition-none text-base shrink-0 ${
            isExpanded ? 'rotate-180 text-teal-600' : 'text-[#6F7782]'
          }`}
        />
      </div>
    </div>
  );

  return (
    <CollapsibleCard
      id={`purchase-${plannedPurchase.id}`}
      triggerId={`planned-purchase-trigger-${plannedPurchase.id}`}
      contentId={`planned-purchase-details-${plannedPurchase.id}`}
      isExpanded={isExpanded}
      onToggle={handleToggle}
      header={headerContent}
      contentClassName="space-y-3"
    >
      {/* 2x InfoTiles: Target Price + Constraint Pace/Date */}
      <div className="grid grid-cols-2 gap-2.5">
        <InfoTile
          icon={IoPricetagOutline}
          label={t('itemPrice')}
          value={formatCurrency(targetPrice, currencyCode)}
        />
        {hasTargetDate ? (
          <InfoTile
            icon={IoCalendarOutline}
            label={t('targetDate')}
            value={formatDisplayDate(plannedPurchase.targetDate, i18n?.language)}
          />
        ) : hasContribution ? (
          <InfoTile
            icon={IoCashOutline}
            label={t('contributionPace')}
            value={`${formatCurrency(plannedPurchase.contributionAmount, currencyCode)} ${cadencePer}`}
          />
        ) : (
          <InfoTile
            icon={IoCalendarOutline}
            label={t('planningMode')}
            value={t('noScenarioConfigured')}
          />
        )}
      </div>

      {/* Primary Result Projection Highlight Panel */}
      {hasContribution && calculatedTargetDate ? (
        <div className="bg-[#F6F8F8] rounded-xl p-3 border border-teal-100/90 space-y-1">
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
        <div className="bg-[#F6F9FA] rounded-xl p-3 border border-cyan-100/90 space-y-1">
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
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 space-y-1">
          <div className="text-xs font-semibold text-gray-800">
            {t('noScenarioConfigured')}
          </div>
          <div className="text-[11px] text-[#6F7782]">
            {t('configurePacePrompt')}
          </div>
        </div>
      )}

      {/* Scenario Exploration Accordion */}
      <PlannedPurchaseExploration
        targetPrice={targetPrice}
        currencyCode={currencyCode}
        initialContributionAmount={plannedPurchase.contributionAmount}
        initialCadence={plannedPurchase.contributionCadence}
        initialTargetDate={plannedPurchase.targetDate}
        onApplyScenario={handleApplyScenarioInternal}
        isApplying={isUpdating}
        applyError={updateError}
      />

      {/* Bottom Action Buttons (Option A - Matching Home) */}
      <div className="flex items-center gap-2 pt-1 border-t border-[#E6E8EC]/80">
        <ActionButton
          variant="secondary"
          icon={IoCreateOutline}
          onClick={handleEdit}
          tabIndex={isExpanded ? 0 : -1}
          aria-label={t('edit')}
        >
          {t('edit')}
        </ActionButton>
        <ActionButton
          variant="danger"
          icon={IoTrashOutline}
          onClick={handleDelete}
          tabIndex={isExpanded ? 0 : -1}
          aria-label={t('deleteItem')}
        >
          {t('deleteItem')}
        </ActionButton>
      </div>
    </CollapsibleCard>
  );
});

export default PlannedPurchaseCard;
