import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IoClose, IoScaleOutline, IoCalendarOutline, IoCashOutline } from 'react-icons/io5';
import { motion, AnimatePresence } from 'motion/react';
import { useCurrency } from '../contexts/CurrencyContext';
import { useReplacementBenchmark } from '../hooks/useBenchmark';
import { formatCurrency } from '../utils/formatters';

function ReplacementBenchmarkModal({
  isOpen,
  onClose,
  completedItem,
  initialCandidatePrice = '',
  onCandidatePriceChange,
  onApplyBenchmark,
}) {
  const { t } = useTranslation();
  const { currencyCode, currencySymbol } = useCurrency();
  const [candidatePriceInput, setCandidatePriceInput] = useState(
    initialCandidatePrice ? String(initialCandidatePrice) : ''
  );

  React.useEffect(() => {
    if (isOpen) {
      setCandidatePriceInput(initialCandidatePrice ? String(initialCandidatePrice) : '');
    }
  }, [isOpen]);

  const handleCandidatePriceChange = (event) => {
    const updatedValue = event.target.value;
    setCandidatePriceInput(updatedValue);
    if (onCandidatePriceChange) {
      onCandidatePriceChange(updatedValue);
    }
  };

  const numericCandidatePrice = Number(candidatePriceInput);
  const isValidCandidatePrice = Number.isFinite(numericCandidatePrice) && numericCandidatePrice > 0;

  const {
    data: benchmarkData,
    isLoading: isBenchmarkLoading,
    error: benchmarkError,
  } = useReplacementBenchmark(completedItem?.id, numericCandidatePrice, {
    enabled: isOpen && Boolean(completedItem?.id) && isValidCandidatePrice,
  });

  const canApply = Boolean(
    isValidCandidatePrice &&
    !isBenchmarkLoading &&
    !benchmarkError &&
    benchmarkData &&
    !benchmarkData.isUnmatchable &&
    Boolean(benchmarkData.daysToMatchPrevious)
  );

  const handleApply = () => {
    if (!canApply || !onApplyBenchmark) {
      return;
    }
    onApplyBenchmark(benchmarkData);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && completedItem && (
        <motion.div
          key="benchmark-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              onClose();
            }
          }}
        >
          <motion.div
            key="benchmark-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="benchmark-modal-title"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white w-full max-w-sm rounded-2xl p-4 space-y-3.5 shadow-xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
              <div className="flex items-center gap-2">
                <IoScaleOutline className="text-lg text-teal-600" />
                <h2 id="benchmark-modal-title" className="text-base font-bold text-gray-900">
              {t('replacementBenchmark')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label={t('close')}
          >
            <IoClose className="text-lg" />
          </button>
        </div>

        <p className="text-xs text-gray-500">
          {t('benchmarkDescription')}
        </p>

        {/* Prior completed item factual summary */}
        <div className="rounded-xl border border-[#E6E8EC] bg-[#F6F7F8] p-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900">{completedItem.name}</span>
            <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600 capitalize">
              {completedItem.status || 'completed'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 pt-1">
            <div className="flex items-center gap-1.5">
              <IoCalendarOutline className="text-slate-500" />
              <span>
                {t('previousOwnershipDays', { days: completedItem.ownershipDays || 1 })}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <IoCashOutline className="text-slate-500" />
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
        <div className="space-y-1">
          <label htmlFor="candidate-replacement-price" className="text-xs text-gray-600 font-medium">
            {t('candidatePrice')}
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
              {currencySymbol}
            </div>
            <input
              id="candidate-replacement-price"
              type="number"
              value={candidatePriceInput}
              onChange={handleCandidatePriceChange}
              min="0.01"
              step="0.01"
              placeholder={t('enterCandidatePrice')}
              className={`w-full px-3 py-2 ${currencySymbol.length > 1 ? 'pl-9' : 'pl-7'} rounded-xl border border-[#E6E8EC] focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all duration-200 text-sm`}
            />
          </div>
        </div>

        {/* State 1: Empty input prompt */}
        {!isValidCandidatePrice && (
          <div className="min-h-[88px] rounded-xl border border-[#E6E8EC] bg-[#F6F7F8] p-3 flex flex-col justify-center">
            <p className="text-xs text-gray-500 leading-relaxed">
              {t('benchmarkEmptyHint', {
                amount: formatCurrency(Number(completedItem.netCostPerDay ?? completedItem.grossCostPerDay ?? 0), currencyCode)
              })}
            </p>
          </div>
        )}

        {/* State 2 & 3: Loading or Error */}
        {isValidCandidatePrice && isBenchmarkLoading && (
          <div className="min-h-[88px] rounded-xl border border-[#E6E8EC] bg-[#F6F7F8] p-3 flex items-center justify-center">
            <span className="text-xs text-gray-500">{t('loading')}</span>
          </div>
        )}

        {isValidCandidatePrice && !isBenchmarkLoading && benchmarkError && (
          <div role="alert" className="min-h-[88px] rounded-xl border border-red-200 bg-red-50 p-3 flex items-center text-xs text-red-700">
            {benchmarkError.message}
          </div>
        )}

        {/* State 2: Benchmark calculations result */}
        {isValidCandidatePrice && !isBenchmarkLoading && !benchmarkError && benchmarkData && (
          <div className="min-h-[88px] space-y-1.5 rounded-xl border border-gray-200 bg-gray-50 p-3 flex flex-col justify-center">
            {benchmarkData.isUnmatchable || benchmarkData.finalCostPerDay <= 0 ? (
              <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
                {t('benchmarkUnmatchableZeroCost')}
              </div>
            ) : (
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
                  <p className="text-xs text-teal-700 mt-0.5 font-medium">
                    {t('benchmarkResultDaysToBeat', { days: benchmarkData.daysToBeatPrevious })}
                  </p>
                )}
              </div>
            )}

            {benchmarkData.hasTarget && benchmarkData.daysToMatchTarget && (
              <div className="border-t border-gray-200 pt-1.5">
                <p className="text-xs text-gray-500">
                  {t('benchmarkResultTargetDuration', {
                    rate: formatCurrency(benchmarkData.targetCostPerDay, currencyCode)
                  })}
                </p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">
                  {t('benchmarkResultDays', { days: benchmarkData.daysToMatchTarget })}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Bottom Actions: Cancel & Set as Ownership Target persistently side by side */}
        <div className="flex gap-2.5 pt-1">
          <button
            type="button"
            className="flex-1 py-2 px-3 rounded-xl border border-gray-200 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors text-xs"
            onClick={onClose}
          >
            {t('cancel')}
          </button>
          {onApplyBenchmark && (
            <button
              type="button"
              disabled={!canApply}
              onClick={handleApply}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium transition-colors shadow-sm ${
                canApply
                  ? 'bg-teal-600 text-white hover:bg-teal-700 cursor-pointer'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
              }`}
            >
              {t('useBenchmarkAsTarget')}
            </button>
          )}
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ReplacementBenchmarkModal;
