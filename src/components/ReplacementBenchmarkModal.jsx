import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IoClose, IoScaleOutline, IoCalendarOutline, IoCashOutline } from 'react-icons/io5';
import { useCurrency } from '../contexts/CurrencyContext';
import { useReplacementBenchmark } from '../hooks/useBenchmark';
import { formatCurrency } from '../utils/formatters';

function ReplacementBenchmarkModal({
  isOpen,
  onClose,
  completedItem,
  initialCandidatePrice = '',
  onApplyBenchmark,
}) {
  const { t } = useTranslation();
  const { currencyCode, currencySymbol } = useCurrency();
  const [candidatePriceInput, setCandidatePriceInput] = useState(
    initialCandidatePrice ? String(initialCandidatePrice) : ''
  );

  React.useEffect(() => {
    if (isOpen && initialCandidatePrice) {
      setCandidatePriceInput(String(initialCandidatePrice));
    }
  }, [isOpen, initialCandidatePrice]);

  const numericCandidatePrice = Number(candidatePriceInput);
  const isValidCandidatePrice = Number.isFinite(numericCandidatePrice) && numericCandidatePrice > 0;

  const {
    data: benchmarkData,
    isLoading: isBenchmarkLoading,
    error: benchmarkError,
  } = useReplacementBenchmark(completedItem?.id, numericCandidatePrice, {
    enabled: isOpen && Boolean(completedItem?.id) && isValidCandidatePrice,
  });

  if (!isOpen || !completedItem) {
    return null;
  }

  const handleApply = () => {
    if (!benchmarkData || !onApplyBenchmark) {
      return;
    }
    onApplyBenchmark(benchmarkData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white w-full max-w-lg rounded-2xl p-6 space-y-5 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <IoScaleOutline className="text-xl text-purple-600" />
            <h2 className="text-lg font-bold text-gray-900">
              {t('replacementBenchmark')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label={t('close')}
          >
            <IoClose className="text-xl" />
          </button>
        </div>

        <p className="text-xs text-gray-500">
          {t('benchmarkDescription')}
        </p>

        {/* Prior completed item factual summary */}
        <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-900">{completedItem.name}</span>
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 capitalize">
              {completedItem.status || 'completed'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 pt-1">
            <div className="flex items-center gap-1.5">
              <IoCalendarOutline className="text-purple-500" />
              <span>
                {t('previousOwnershipDays', { days: completedItem.ownershipDays || 1 })}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <IoCashOutline className="text-purple-500" />
              <span>
                {t('previousFinalCostPerDay', {
                  amount: formatCurrency(Number(completedItem.netCostPerDay ?? completedItem.grossCostPerDay ?? 0), currencyCode)
                })}
              </span>
            </div>
            {completedItem.targetCostPerDay && (
              <div className="col-span-2 text-xs text-gray-500">
                {t('previousTargetCostPerDay', {
                  amount: formatCurrency(Number(completedItem.targetCostPerDay), currencyCode)
                })}
                {completedItem.targetDurationDays && ` (${completedItem.targetDurationDays} days)`}
              </div>
            )}
          </div>
        </div>

        {/* Candidate price input */}
        <div className="space-y-2">
          <label htmlFor="candidate-replacement-price" className="text-sm text-gray-700 font-medium">
            {t('candidatePrice')}
          </label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              {currencySymbol}
            </div>
            <input
              id="candidate-replacement-price"
              type="number"
              value={candidatePriceInput}
              onChange={(event) => setCandidatePriceInput(event.target.value)}
              min="0.01"
              step="0.01"
              placeholder={t('enterCandidatePrice')}
              className={`w-full px-4 py-3 ${currencySymbol.length > 1 ? 'pl-11' : 'pl-8'} rounded-xl border border-purple-100 focus:border-purple-300 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all duration-200`}
            />
          </div>
        </div>

        {/* Benchmark calculations result */}
        {isBenchmarkLoading && (
          <div className="text-center py-4 text-sm text-gray-500">
            {t('loading')}
          </div>
        )}

        {benchmarkError && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {benchmarkError.message}
          </div>
        )}

        {benchmarkData && (
          <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div>
              <p className="text-xs text-gray-500">
                {t('benchmarkResultRequiredDuration', {
                  rate: formatCurrency(benchmarkData.finalCostPerDay, currencyCode)
                })}
              </p>
              <p className="text-base font-semibold text-gray-900 mt-0.5">
                {t('benchmarkResultDays', { days: benchmarkData.daysToMatchPrevious })}
              </p>
              {benchmarkData.daysToBeatPrevious && (
                <p className="text-xs text-purple-600 mt-1 font-medium">
                  {t('benchmarkResultDaysToBeat', { days: benchmarkData.daysToBeatPrevious })}
                </p>
              )}
            </div>

            {benchmarkData.hasTarget && benchmarkData.daysToMatchTarget && (
              <div className="border-t border-gray-200 pt-2">
                <p className="text-xs text-gray-500">
                  {t('benchmarkResultTargetDuration', {
                    rate: formatCurrency(benchmarkData.targetCostPerDay, currencyCode)
                  })}
                </p>
                <p className="text-base font-semibold text-gray-900 mt-0.5">
                  {t('benchmarkResultDays', { days: benchmarkData.daysToMatchTarget })}
                </p>
              </div>
            )}

            {onApplyBenchmark && (
              <button
                type="button"
                onClick={handleApply}
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors shadow-sm"
              >
                {t('useBenchmarkAsTarget')}
              </button>
            )}
          </div>
        )}

        <div className="pt-2">
          <button
            type="button"
            className="w-full py-3 px-4 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors duration-200"
            onClick={onClose}
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReplacementBenchmarkModal;
