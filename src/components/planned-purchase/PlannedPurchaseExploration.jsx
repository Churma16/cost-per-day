import React, { useEffect, useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IoChevronDown, IoEyeOutline, IoOptionsOutline } from 'react-icons/io5';
import { calculateContributionProjection } from '../../utils/plannedPurchaseProjection';
import CurrencyInput from '../common/CurrencyInput';

function PlannedPurchaseExploration({
  targetPrice,
  currencyCode,
  initialContributionAmount,
  initialCadence,
  initialTargetDate,
  onApplyScenario,
  isApplying = false,
  applyError = null,
}) {
  const { t } = useTranslation();
  const generatedId = useId();
  const triggerId = `exploration-trigger-${generatedId}`;
  const contentId = `exploration-content-${generatedId}`;
  const [isOpen, setIsOpen] = useState(false);
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
    } else {
      const timeoutIdentifier = setTimeout(() => {
        setIsRendered(false);
      }, 300);
      return () => clearTimeout(timeoutIdentifier);
    }
  }, [isOpen]);

  const shouldRenderContent = isOpen || isRendered;
  const [contributionAmount, setContributionAmount] = useState(
    initialContributionAmount !== null && initialContributionAmount !== undefined
      ? String(initialContributionAmount)
      : ''
  );
  const [cadence, setCadence] = useState(initialCadence || 'daily');
  const [localError, setLocalError] = useState(null);

  useEffect(() => {
    setContributionAmount(
      initialContributionAmount !== null && initialContributionAmount !== undefined
        ? String(initialContributionAmount)
        : ''
    );
    setCadence(initialCadence || 'daily');
  }, [initialContributionAmount, initialCadence]);

  const initialNumericAmount =
    initialContributionAmount !== null && initialContributionAmount !== undefined
      ? parseFloat(initialContributionAmount)
      : null;
  const currentNumericAmount = parseFloat(contributionAmount);
  const isValidAmount = Number.isFinite(currentNumericAmount) && currentNumericAmount > 0;

  const isCadenceChanged = cadence !== (initialCadence || 'daily');
  const isAmountChanged =
    initialNumericAmount === null
      ? isValidAmount
      : isValidAmount && currentNumericAmount !== initialNumericAmount;
  const isTargetDateConversion = Boolean(initialTargetDate && isValidAmount);

  const isDirty = isCadenceChanged || isAmountChanged || isTargetDateConversion;

  const exploredProjection = useMemo(
    () =>
      calculateContributionProjection({
        targetPrice,
        contributionAmount: currentNumericAmount,
        cadence,
      }),
    [currentNumericAmount, cadence, targetPrice]
  );

  const exploredPeriodUnit =
    cadence === 'daily'
      ? t('unitDays')
      : cadence === 'weekly'
        ? t('unitWeeks')
        : t('unitMonths');

  const handleCancel = () => {
    setContributionAmount(
      initialContributionAmount !== null && initialContributionAmount !== undefined
        ? String(initialContributionAmount)
        : ''
    );
    setCadence(initialCadence || 'daily');
    setLocalError(null);
  };

  const handleApply = async () => {
    setLocalError(null);
    if (!isValidAmount) return;

    try {
      if (onApplyScenario) {
        await onApplyScenario({
          contributionAmount: currentNumericAmount,
          contributionCadence: cadence,
        });
        setIsOpen(false);
      }
    } catch (err) {
      setLocalError(err.message || t('operationFailed'));
    }
  };

  return (
    <div className="pt-2">
      <button
        type="button"
        id={triggerId}
        aria-controls={contentId}
        aria-expanded={isOpen}
        onClick={() => {
          setIsOpen((currentValue) => !currentValue);
          setLocalError(null);
        }}
        className="flex items-center justify-between w-full text-xs font-semibold text-teal-700 hover:text-teal-900 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
      >
        <span className="flex items-center gap-1.5">
          <IoOptionsOutline className="text-sm" />
          {t('exploreFraming')}
        </span>
        <IoChevronDown
          className={`transform transition-transform duration-300 ease-out motion-reduce:transition-none text-base shrink-0 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <div
        id={contentId}
        role="region"
        aria-labelledby={triggerId}
        aria-hidden={!isOpen}
        inert={!isOpen ? true : undefined}
        className={`grid transition-[grid-template-rows,opacity,visibility] duration-300 ease-out motion-reduce:transition-none ${
          isOpen
            ? 'grid-rows-[1fr] opacity-100 visible'
            : 'grid-rows-[0fr] opacity-0 pointer-events-none invisible'
        }`}
      >
        <div className="overflow-hidden">
          {shouldRenderContent && (
            <div className="mt-2.5 p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-xs space-y-3">
            <p className="text-[#6F7782] text-[11px] leading-relaxed">
              {t('explorePaceDescription')}
            </p>

            {isDirty && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-2 text-xs font-medium">
                <IoEyeOutline className="text-sm shrink-0 text-amber-700" />
                <span>{t('previewUnsaved')}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-1">
                  {t('cadence')}
                </label>
                <select
                  value={cadence}
                  disabled={isApplying}
                  onChange={(event) => setCadence(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-2 text-xs bg-white focus:outline-none focus-border-teal-500 focus:ring-1 focus:ring-teal-500 disabled:opacity-50"
                >
                  <option value="daily">{t('cadenceDaily')}</option>
                  <option value="weekly">{t('cadenceWeekly')}</option>
                  <option value="monthly">{t('cadenceMonthly')}</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-1">
                  {isCadenceChanged
                    ? t('recurringContributionAdjustForCadence')
                    : t('recurringContribution')}
                </label>
                <CurrencyInput
                  value={contributionAmount}
                  disabled={isApplying}
                  onChange={(event) => setContributionAmount(event.target.value)}
                  currencyCode={currencyCode}
                  placeholder={t('enterContributionAmount')}
                  className="w-full rounded-lg border border-gray-300 p-2 text-xs bg-white focus:outline-none focus-border-teal-500 focus:ring-1 focus:ring-teal-500 disabled:opacity-50"
                />
              </div>
            </div>

            {exploredProjection && (
              <div className="p-2.5 rounded-lg bg-white border border-teal-100 text-teal-950 font-medium text-xs">
                {cadence === 'daily'
                  ? t('reachTargetInDays', { days: exploredProjection.estimatedDays })
                  : t('reachTargetIn', {
                      periods: exploredProjection.periods,
                      periodUnit: exploredPeriodUnit,
                      days: exploredProjection.estimatedDays,
                    })}
              </div>
            )}

            {(localError || applyError) && (
              <div role="alert" className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {localError || applyError}
              </div>
            )}

            <div className="pt-1 flex items-center justify-end gap-2">
              {isDirty ? (
                <>
                  <button
                    type="button"
                    disabled={isApplying}
                    onClick={handleCancel}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-colors"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="button"
                    disabled={!isValidAmount || isApplying}
                    onClick={handleApply}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-xs font-semibold text-white shadow-sm disabled:opacity-50 transition-colors"
                  >
                    {isApplying ? t('saving') : t('applyChanges')}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled
                  className="w-full sm:w-auto px-4 py-2 rounded-lg bg-gray-200 text-xs font-semibold text-gray-400 cursor-not-allowed transition-colors"
                >
                  {t('apply')}
                </button>
              )}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

export default PlannedPurchaseExploration;
