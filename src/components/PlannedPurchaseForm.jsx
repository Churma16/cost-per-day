import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../contexts/CurrencyContext';
import { getSupportedCurrencies } from '../utils/currencyConfig';
import { formatCurrency } from '../utils/formatters';
import CurrencyInput from './common/CurrencyInput';

const getTomorrowDateString = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
};

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

  // Direction Mode: 'contributionToTime' or 'targetDateToContribution'
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

  // Live calculation: Contribution -> Time
  const liveTimeProjection = useMemo(() => {
    if (isNaN(numericTargetPrice) || numericTargetPrice <= 0) return null;
    if (isNaN(numericContributionAmount) || numericContributionAmount <= 0) return null;

    const periods = Math.ceil(numericTargetPrice / numericContributionAmount);
    let estimatedDays = periods;
    if (contributionCadence === 'weekly') {
      estimatedDays = Math.ceil(periods * 7);
    } else if (contributionCadence === 'monthly') {
      estimatedDays = Math.round(periods * (365 / 12));
    }

    const periodUnit =
      contributionCadence === 'daily'
        ? t('unitDays')
        : contributionCadence === 'weekly'
        ? t('unitWeeks')
        : t('unitMonths');

    const cadencePer =
      contributionCadence === 'daily'
        ? t('cadencePerDaily')
        : contributionCadence === 'weekly'
        ? t('cadencePerWeekly')
        : t('cadencePerMonthly');

    return {
      periods,
      estimatedDays,
      periodUnit,
      cadencePer,
      isDaily: contributionCadence === 'daily',
    };
  }, [numericTargetPrice, numericContributionAmount, contributionCadence, t]);

  // Live calculation: Target Date -> Required Contribution
  const liveContributionProjection = useMemo(() => {
    if (isNaN(numericTargetPrice) || numericTargetPrice <= 0) return null;
    if (!targetDate) return null;

    const targetDateObj = new Date(targetDate + 'T00:00:00Z');
    const todayObj = new Date();
    const todayUTC = new Date(Date.UTC(todayObj.getUTCFullYear(), todayObj.getUTCMonth(), todayObj.getUTCDate()));

    const millisecondsDiff = targetDateObj.getTime() - todayUTC.getTime();
    const daysRemaining = Math.max(1, Math.ceil(millisecondsDiff / (1000 * 60 * 60 * 24)));

    const daily = numericTargetPrice / daysRemaining;
    const weekly = daily * 7;
    const monthly = daily * (365 / 12);

    return {
      daysRemaining,
      daily,
      weekly,
      monthly,
    };
  }, [numericTargetPrice, targetDate]);

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
      if (contributionAmount !== '' && !isNaN(numericContributionAmount) && numericContributionAmount > 0) {
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

  const supportedCurrencies = getSupportedCurrencies();
  const minDate = getTomorrowDateString();

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {(errorMessage || validationError) && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {validationError || errorMessage}
        </div>
      )}

      <div>
        <label htmlFor="planned-purchase-name" className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
          {t('targetItemName')} *
        </label>
        <input
          id="planned-purchase-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('enterTargetItemName')}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="planned-purchase-price" className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
            {t('targetPrice')} *
          </label>
          <CurrencyInput
            id="planned-purchase-price"
            value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
            currencyCode={currencyCode}
            placeholder={t('enterTargetPrice')}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            required
          />
        </div>

        <div>
          <label htmlFor="planned-purchase-currency" className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
            {t('currency')}
          </label>
          <select
            id="planned-purchase-currency"
            value={currencyCode}
            onChange={(e) => setCurrencyCode(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
          >
            {supportedCurrencies.map((config) => (
              <option key={config.code} value={config.code}>
                {t(config.nameKey)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-3">
        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-2">
          {t('planningMode')}
        </label>
        <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg">
          <button
            type="button"
            onClick={() => handleModeChange('contributionToTime')}
            className={`py-2 px-3 text-xs font-medium rounded-md transition-all ${
              planningMode === 'contributionToTime'
                ? 'bg-white text-teal-800 shadow-sm font-semibold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t('modeContributionToTime')}
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('targetDateToContribution')}
            className={`py-2 px-3 text-xs font-medium rounded-md transition-all ${
              planningMode === 'targetDateToContribution'
                ? 'bg-white text-teal-800 shadow-sm font-semibold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t('modeTargetDateToContribution')}
          </button>
        </div>
      </div>

      {planningMode === 'contributionToTime' && (
        <div className="rounded-xl bg-teal-50/60 border border-teal-100 p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-teal-900 mb-1">{t('cadence')}</label>
            <div className="grid grid-cols-3 gap-2">
              {['daily', 'weekly', 'monthly'].map((cadenceOption) => (
                <button
                  key={cadenceOption}
                  type="button"
                  onClick={() => setContributionCadence(cadenceOption)}
                  className={`py-1.5 px-2 text-xs rounded-md border font-medium transition-colors ${
                    contributionCadence === cadenceOption
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
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
              onChange={(e) => setContributionAmount(e.target.value)}
              currencyCode={currencyCode}
              placeholder={t('enterContributionAmount')}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
            />
          </div>

          {liveTimeProjection && (
            <div className="rounded-lg bg-white p-3 border border-teal-200 text-xs text-teal-950 space-y-1">
              <span className="font-semibold block text-teal-800">{t('timeToReachTarget')}:</span>
              <p className="text-sm font-bold text-teal-700">
                {liveTimeProjection.isDaily
                  ? t('reachTargetInDays', { days: liveTimeProjection.estimatedDays })
                  : t('reachTargetIn', {
                      periods: liveTimeProjection.periods,
                      periodUnit: liveTimeProjection.periodUnit,
                      days: liveTimeProjection.estimatedDays,
                    })}
              </p>
              <p className="text-gray-500 text-[11px]">
                {formatCurrency(numericContributionAmount, currencyCode)} {liveTimeProjection.cadencePer} &rarr; {formatCurrency(numericTargetPrice, currencyCode)}
              </p>
            </div>
          )}
        </div>
      )}

      {planningMode === 'targetDateToContribution' && (
        <div className="rounded-xl bg-teal-50/60 border border-teal-100 p-4 space-y-3">
          <div>
            <label htmlFor="target-date-input" className="block text-xs font-medium text-teal-900">
              {t('targetDate')}
            </label>
            <input
              id="target-date-input"
              type="date"
              min={minDate}
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
            />
          </div>

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
