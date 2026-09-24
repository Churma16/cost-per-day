import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'motion/react';
import { IoScaleOutline } from 'react-icons/io5';
import { formatCurrency } from '../../utils/formatters';
import CurrencyInput from '../common/CurrencyInput';

function ItemOwnershipTargetCard({
  targetMode,
  onTargetModeChange,
  targetType,
  onTargetTypeChange,
  targetValue,
  onTargetValueChange,
  currencySymbol,
  currencyCode,
  equivalentTargetNote,
  completedItems = [],
  selectedBenchmarkItemId,
  onSelectBenchmarkItemId,
  onOpenBenchmarkModal,
}) {
  const { t } = useTranslation();
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="bg-white rounded-2xl border border-[#E6E8EC] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] space-y-2">
      <div>
        <h2 className="text-xs font-semibold text-gray-900 block">
          {t('ownershipTargetOptional')}
        </h2>
        <p className="text-[11px] text-gray-500 mt-0.5">
          {t('ownershipTargetSubheading')}
        </p>
      </div>

      {/* Segmented Pill Toggle: Set manually / Based on past item */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onTargetModeChange('manual')}
          className={`py-1.5 px-3 text-xs font-medium rounded-xl border transition-all ${
            targetMode === 'manual'
              ? 'border-teal-600 bg-teal-50 text-teal-700 shadow-sm'
              : 'border-[#E6E8EC] bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          {t('setManually')}
        </button>
        <button
          type="button"
          onClick={() => onTargetModeChange('benchmark')}
          className={`py-1.5 px-3 text-xs font-medium rounded-xl border transition-all ${
            targetMode === 'benchmark'
              ? 'border-teal-600 bg-teal-50 text-teal-700 shadow-sm'
              : 'border-[#E6E8EC] bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          {t('fromCompletedItem')}
        </button>
      </div>

      {/* Horizontal Slide Carousel Track (Kanan-Kiri) */}
      <div className="overflow-hidden w-full relative">
        <motion.div
          className="flex w-full items-start"
          initial={false}
          animate={{ x: targetMode === 'manual' ? '0%' : '-100%' }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.32, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Panel 1: Set manually (Left) */}
          <div
            className={`w-full shrink-0 transition-opacity duration-200 ${
              targetMode === 'manual' ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            aria-hidden={targetMode !== 'manual'}
          >
            <div className="space-y-2 pt-0.5">
              <p className="text-[11px] text-gray-500">
                {t('manualTargetPrompt')}
              </p>
              <div className="space-y-1">
                <label htmlFor="item-target-type" className="text-xs text-gray-600 font-medium">
                  {t('targetType')}
                </label>
                <select
                  id="item-target-type"
                  aria-label={t('targetType')}
                  value={targetType}
                  onChange={(event) => {
                    const nextTargetType = event.target.value;
                    onTargetTypeChange(nextTargetType);
                    if (nextTargetType === 'none') {
                      onTargetValueChange('');
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-[#E6E8EC] bg-white focus:border-teal-600
                  focus:ring-2 focus:ring-teal-500/20 outline-none transition-all duration-200 text-sm"
                >
                  <option value="none">{t('targetTypeNone')}</option>
                  <option value="cost_per_day">{t('targetTypeCostPerDay')}</option>
                  <option value="duration">{t('targetTypeDuration')}</option>
                </select>
              </div>

              <div
                className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
                  targetType !== 'none'
                    ? 'grid-rows-[1fr] opacity-100'
                    : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                }`}
              >
                <div className="overflow-hidden">
                  <div className="space-y-1 pt-0.5">
                    <label htmlFor="item-target-value" className="text-xs text-gray-600 font-medium">
                      {targetType === 'cost_per_day' ? t('targetTypeCostPerDay') : t('targetTypeDuration')}
                    </label>
                    <div className="relative">
                      {targetType === 'cost_per_day' && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                          {currencySymbol}
                        </div>
                      )}
                      {targetType === 'cost_per_day' ? (
                        <CurrencyInput
                          id="item-target-value"
                          value={targetValue}
                          onChange={(event) => onTargetValueChange(event.target.value)}
                          required={targetMode === 'manual' && targetType !== 'none'}
                          currencyCode={currencyCode}
                          placeholder={t('enterTargetCostPerDay')}
                          className={`w-full px-3 py-2 ${currencySymbol.length > 1 ? 'pl-9' : 'pl-7'} rounded-xl border border-[#E6E8EC] bg-white focus:border-teal-600
                          focus:ring-2 focus:ring-teal-500/20 outline-none transition-all duration-200 text-sm`}
                        />
                      ) : (
                        <input
                          id="item-target-value"
                          type="number"
                          value={targetValue}
                          onChange={(event) => onTargetValueChange(event.target.value)}
                          required={targetMode === 'manual' && targetType !== 'none'}
                          min="1"
                          step="1"
                          placeholder={t('enterTargetDuration')}
                          className="w-full px-3 py-2 rounded-xl border border-[#E6E8EC] bg-white focus:border-teal-600
                          focus:ring-2 focus:ring-teal-500/20 outline-none transition-all duration-200 text-sm"
                        />
                      )}
                    </div>
                    {equivalentTargetNote && (
                      <p className="text-[11px] font-medium text-teal-700 pt-0.5">
                        {equivalentTargetNote}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Panel 2: Based on past item (Right) */}
          <div
            className={`w-full shrink-0 transition-opacity duration-200 ${
              targetMode === 'benchmark' ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            aria-hidden={targetMode !== 'benchmark'}
          >
            <div className="space-y-2 pt-0.5">
              <p className="text-[11px] text-gray-500">
                {t('benchmarkSelectPrompt')}
              </p>
              {completedItems.length > 0 ? (
                <div className="space-y-2">
                  <select
                    id="benchmark-completed-item"
                    aria-label={t('benchmarkFromPriorItem')}
                    value={selectedBenchmarkItemId}
                    onChange={(event) => onSelectBenchmarkItemId(event.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-[#E6E8EC] bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all duration-200"
                  >
                    <option value="">{t('selectCompletedItem')}</option>
                    {completedItems.map((candidateItem) => (
                      <option key={candidateItem.id} value={candidateItem.id}>
                        {candidateItem.name} ({formatCurrency(Number(candidateItem.netCostPerDay ?? candidateItem.grossCostPerDay ?? 0), currencyCode)}/day)
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!selectedBenchmarkItemId}
                    onClick={onOpenBenchmarkModal}
                    className="w-full py-2 px-3 text-xs bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <IoScaleOutline className="text-sm" />
                    {t('replacementBenchmark')}
                  </button>
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic py-1">
                  {t('noCompletedItemsForBenchmark')}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default ItemOwnershipTargetCard;
