import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../contexts/CurrencyContext';
import { getSupportedCurrencies } from '../utils/currencyConfig';
import PlannedPurchaseCoreFields from './planned-purchase/PlannedPurchaseCoreFields';
import PlanningModeSelector from './planned-purchase/PlanningModeSelector';
import ContributionPlanningSection from './planned-purchase/ContributionPlanningSection';
import TargetDatePlanningSection from './planned-purchase/TargetDatePlanningSection';

function PlannedPurchaseForm({
  initialData = null,
  onSubmit,
  onCancel,
  isSubmitting = false,
  errorMessage = null,
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {(errorMessage || validationError) && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {validationError || errorMessage}
        </div>
      )}

      <PlannedPurchaseCoreFields
        name={name}
        onNameChange={setName}
        targetPrice={targetPrice}
        onTargetPriceChange={setTargetPrice}
        currencyCode={currencyCode}
        onCurrencyCodeChange={setCurrencyCode}
        supportedCurrencies={getSupportedCurrencies()}
      />

      <PlanningModeSelector
        planningMode={planningMode}
        onPlanningModeChange={handleModeChange}
      />

      {planningMode === 'contributionToTime' && (
        <ContributionPlanningSection
          targetPrice={numericTargetPrice}
          contributionCadence={contributionCadence}
          onContributionCadenceChange={setContributionCadence}
          contributionAmount={contributionAmount}
          onContributionAmountChange={setContributionAmount}
          currencyCode={currencyCode}
        />
      )}

      {planningMode === 'targetDateToContribution' && (
        <TargetDatePlanningSection
          targetPrice={numericTargetPrice}
          targetDate={targetDate}
          onTargetDateChange={setTargetDate}
          currencyCode={currencyCode}
        />
      )}

      <p className="text-[11px] text-gray-500 italic bg-gray-50 p-2.5 rounded-lg border border-gray-100">
        {t('planningDisclaimer')}
      </p>

      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {t('cancel')}
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50"
        >
          {isSubmitting ? t('loading') : t('save')}
        </button>
      </div>
    </form>
  );
}

export default PlannedPurchaseForm;
