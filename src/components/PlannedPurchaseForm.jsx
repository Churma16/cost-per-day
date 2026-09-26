import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../contexts/CurrencyContext';
import { getSupportedCurrencies } from '../utils/currencyConfig';
import PlannedPurchaseCoreFields from './planned-purchase/PlannedPurchaseCoreFields';
import PlanningModeSelector from './planned-purchase/PlanningModeSelector';
import ContributionPlanningSection from './planned-purchase/ContributionPlanningSection';
import TargetDatePlanningSection from './planned-purchase/TargetDatePlanningSection';
import AnimatedPlanningModePanels from './planned-purchase/AnimatedPlanningModePanels';
import FormSectionCard from './common/FormSectionCard';

function PlannedPurchaseForm({
  initialData = null,
  onSubmit,
  onCancel,
  onDiscard = null,
  isSubmitting = false,
  errorMessage = null,
  onDraftChange = null,
  isVisible = true,
}) {
  const { t } = useTranslation();
  const { currencyCode: activeCurrencyCode } = useCurrency();

  const [name, setName] = useState(initialData?.name || '');
  const [targetPrice, setTargetPrice] = useState(
    initialData?.targetPrice !== undefined ? String(initialData.targetPrice) : ''
  );
  const [currencyCode, setCurrencyCode] = useState(
    initialData?.currencyCode || activeCurrencyCode || 'USD'
  );
  const [planningMode, setPlanningMode] = useState(() => {
    if (initialData?.planningMode) {
      return initialData.planningMode;
    }
    if (initialData?.targetDate && !initialData?.contributionAmount) {
      return 'targetDateToContribution';
    }
    return 'contributionToTime';
  });
  const [contributionCadence, setContributionCadence] = useState(
    initialData?.contributionCadence || 'daily'
  );
  const [contributionAmount, setContributionAmount] = useState(
    initialData?.contributionAmount !== undefined && initialData?.contributionAmount !== null
      ? String(initialData.contributionAmount)
      : ''
  );
  const [targetDate, setTargetDate] = useState(initialData?.targetDate || '');
  const [validationError, setValidationError] = useState(null);

  const draftData = useMemo(() => ({
    name,
    targetPrice,
    currencyCode,
    planningMode,
    contributionCadence,
    contributionAmount,
    targetDate,
  }), [
    name,
    targetPrice,
    currencyCode,
    planningMode,
    contributionCadence,
    contributionAmount,
    targetDate,
  ]);

  useEffect(() => {
    onDraftChange?.(draftData);
  }, [draftData, onDraftChange]);

  const handleModeChange = (newMode) => {
    setPlanningMode(newMode);
    if (newMode === 'contributionToTime') {
      setTargetDate('');
    } else {
      setContributionAmount('');
    }
  };

  const numericTargetPrice = parseFloat(targetPrice);
  const numericContributionAmount = parseFloat(contributionAmount);

  const handleSubmit = (event) => {
    event.preventDefault();
    setValidationError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setValidationError(t('enterTargetItemName'));
      return;
    }

    if (isNaN(numericTargetPrice) || numericTargetPrice <= 0) {
      setValidationError(t('enterTargetPrice'));
      return;
    }

    const payload = {
      name: trimmedName,
      targetPrice: numericTargetPrice,
      currencyCode: currencyCode.toUpperCase(),
      targetDate: null,
      contributionAmount: null,
      contributionCadence: null,
    };

    if (planningMode === 'contributionToTime') {
      if (contributionAmount !== '') {
        if (isNaN(numericContributionAmount) || numericContributionAmount <= 0) {
          setValidationError(t('enterContributionAmount'));
          return;
        }
        payload.contributionAmount = numericContributionAmount;
        payload.contributionCadence = contributionCadence;
      }
      payload.targetDate = null;
    } else {
      if (targetDate) {
        payload.targetDate = targetDate;
      }
      payload.contributionAmount = null;
      payload.contributionCadence = null;
    }

    onSubmit(payload);
  };

  const handleDiscard = () => {
    const resetDraft = {
      name: '',
      targetPrice: '',
      currencyCode: activeCurrencyCode || 'USD',
      planningMode: 'contributionToTime',
      contributionCadence: 'daily',
      contributionAmount: '',
      targetDate: '',
    };

    setName(resetDraft.name);
    setTargetPrice(resetDraft.targetPrice);
    setCurrencyCode(resetDraft.currencyCode);
    setPlanningMode(resetDraft.planningMode);
    setContributionCadence(resetDraft.contributionCadence);
    setContributionAmount(resetDraft.contributionAmount);
    setTargetDate(resetDraft.targetDate);
    setValidationError(null);
    onDiscard(resetDraft);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2.5">
      {(errorMessage || validationError) && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {validationError || errorMessage}
        </div>
      )}

      <FormSectionCard title={t('requiredSection')} data-swipe-protected>
        <PlannedPurchaseCoreFields
          name={name}
          onNameChange={setName}
          targetPrice={targetPrice}
          onTargetPriceChange={setTargetPrice}
          currencyCode={currencyCode}
          onCurrencyCodeChange={setCurrencyCode}
          supportedCurrencies={getSupportedCurrencies()}
        />
      </FormSectionCard>

      <FormSectionCard title={t('planningMode')}>
        <PlanningModeSelector
          planningMode={planningMode}
          onPlanningModeChange={handleModeChange}
        />

        <AnimatedPlanningModePanels
          planningMode={planningMode}
          isVisible={isVisible}
          contributionPanel={(
            <ContributionPlanningSection
              targetPrice={numericTargetPrice}
              contributionCadence={contributionCadence}
              onContributionCadenceChange={setContributionCadence}
              contributionAmount={contributionAmount}
              onContributionAmountChange={setContributionAmount}
              currencyCode={currencyCode}
            />
          )}
          targetDatePanel={(
            <TargetDatePlanningSection
              targetPrice={numericTargetPrice}
              targetDate={targetDate}
              onTargetDateChange={setTargetDate}
              currencyCode={currencyCode}
            />
          )}
        />

        <p className="text-[11px] text-gray-500 italic bg-gray-50 p-2.5 rounded-xl border border-gray-100">
          {t('planningDisclaimer')}
        </p>
      </FormSectionCard>

      <div className="space-y-2 pt-1">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 bg-teal-600 text-white rounded-xl font-medium
            hover:bg-teal-700 transition-all duration-200 shadow-sm hover:shadow
            disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-sm"
        >
          {isSubmitting ? t('loading') : t('save')}
        </button>
        <button
          type="button"
          onClick={onDiscard ? handleDiscard : onCancel}
          disabled={isSubmitting}
          className="w-full py-2 bg-white text-gray-700 rounded-xl font-medium border border-gray-300
            hover:bg-gray-50 hover:text-gray-900 shadow-sm transition-all duration-200 text-sm disabled:opacity-50"
        >
          {t(onDiscard ? 'discardDraft' : 'cancel')}
        </button>
      </div>
    </form>
  );
}

export default PlannedPurchaseForm;
