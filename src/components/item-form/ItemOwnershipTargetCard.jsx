import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'motion/react';
import { IoCheckmarkCircle, IoScaleOutline } from 'react-icons/io5';
import { formatCurrency } from '../../utils/formatters';
import CurrencyInput from '../common/CurrencyInput';

function ItemOwnershipTargetCard({
  targetMode,
  onTargetModeChange,
  targetType,
  onTargetTypeChange,
  targetValue,
  targetValues = null,
  onTargetValueChange,
  currencySymbol,
  currencyCode,
  equivalentTargetNote,
  completedItems = [],
  selectedBenchmarkItemId,
  onSelectBenchmarkItemId,
  onOpenBenchmarkModal,
  isVisible = true,
  allowBenchmark = true,
}) {
  const { t } = useTranslation();
  const shouldReduceMotion = useReducedMotion();
  const manualPanelRef = useRef(null);
  const benchmarkPanelRef = useRef(null);
  const targetPanelsRef = useRef(null);
  const durationTargetPanelRef = useRef(null);
  const costTargetPanelRef = useRef(null);
  const [activePanelHeight, setActivePanelHeight] = useState(null);
  const [targetPanelHeight, setTargetPanelHeight] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const previousModeRef = useRef(targetMode);

  const measureActivePanel = useCallback(() => {
    const activePanel = targetMode === 'manual'
      ? manualPanelRef.current
      : benchmarkPanelRef.current;
    if (!activePanel) return;

    const targetElement = activePanel.firstElementChild || activePanel;
    const nextHeight = Math.ceil(
      targetElement.getBoundingClientRect().height ||
      targetElement.scrollHeight ||
      activePanel.getBoundingClientRect().height ||
      activePanel.scrollHeight
    );
    if (nextHeight > 0) {
      setActivePanelHeight((currentHeight) => (
        currentHeight === nextHeight ? currentHeight : nextHeight
      ));
    }
  }, [targetMode]);

  useEffect(() => {
    if (previousModeRef.current !== targetMode) {
      previousModeRef.current = targetMode;
      setIsTransitioning(true);
      const timer = window.setTimeout(() => {
        setIsTransitioning(false);
      }, 350);
      return () => window.clearTimeout(timer);
    }
  }, [targetMode]);

  const measureTargetPanel = useCallback(() => {
    if (targetType === 'none') return;
    const activeTargetPanel = targetType === 'duration'
      ? durationTargetPanelRef.current
      : costTargetPanelRef.current;
    if (!activeTargetPanel) return;

    const targetElement = activeTargetPanel.firstElementChild || activeTargetPanel;
    const nextHeight = Math.ceil(
      targetElement.getBoundingClientRect().height ||
      targetElement.scrollHeight ||
      activeTargetPanel.getBoundingClientRect().height ||
      activeTargetPanel.scrollHeight
    );
    if (nextHeight > 0) {
      setTargetPanelHeight((currentHeight) => (
        currentHeight === nextHeight ? currentHeight : nextHeight
      ));
    }
  }, [targetType]);

  useLayoutEffect(() => {
    measureTargetPanel();
    const frameId = window.requestAnimationFrame(measureTargetPanel);

    if (typeof ResizeObserver === 'undefined') {
      return () => window.cancelAnimationFrame(frameId);
    }

    const observer = new ResizeObserver(measureTargetPanel);
    [
      targetPanelsRef.current,
      durationTargetPanelRef.current,
      costTargetPanelRef.current,
      durationTargetPanelRef.current?.firstElementChild,
      costTargetPanelRef.current?.firstElementChild,
    ].forEach((panel) => panel && observer.observe(panel));

    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [measureTargetPanel]);

  useLayoutEffect(() => {
    measureActivePanel();
    const frameId = window.requestAnimationFrame(measureActivePanel);

    if (typeof ResizeObserver === 'undefined') {
      return () => window.cancelAnimationFrame(frameId);
    }

    const observer = new ResizeObserver(() => {
      measureActivePanel();
    });
    [
      manualPanelRef.current,
      benchmarkPanelRef.current,
      manualPanelRef.current?.firstElementChild,
      benchmarkPanelRef.current?.firstElementChild,
    ].forEach((panel) => panel && observer.observe(panel));

    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [measureActivePanel]);

  useEffect(() => {
    if (isVisible) {
      measureActivePanel();
      const frameId = window.requestAnimationFrame(measureActivePanel);
      return () => window.cancelAnimationFrame(frameId);
    }
  }, [isVisible, measureActivePanel]);

  useEffect(() => {
    measureActivePanel();
    const frameId = window.requestAnimationFrame(measureActivePanel);
    return () => window.cancelAnimationFrame(frameId);
  }, [completedItems.length, selectedBenchmarkItemId, targetType, targetValue, measureActivePanel]);

  const handleAnimationComplete = () => {
    setIsTransitioning(false);
    measureActivePanel();
  };

  const handleTargetAnimationComplete = () => {
    measureTargetPanel();
    measureActivePanel();
  };

  const calmTransition = {
    duration: shouldReduceMotion ? 0 : 0.32,
    ease: [0.16, 1, 0.3, 1],
  };
  const durationTargetValue = targetValues?.duration
    ?? (targetType === 'duration' ? targetValue : '');
  const costTargetValue = targetValues?.cost_per_day
    ?? (targetType === 'cost_per_day' ? targetValue : '');

  return (
    <div className="bg-white rounded-2xl border border-[#E6E8EC] p-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] space-y-1.5">
      <div>
        <h2 className="text-xs font-semibold text-gray-900 block">
          {t('ownershipGoalOptional')}
        </h2>
        <p className="text-[11px] text-gray-500 mt-0.5">
          {t('ownershipTargetSubheading')}
        </p>
      </div>

      {allowBenchmark && (
        <div className="grid grid-cols-2 gap-1.5" role="group">
          <button
            type="button"
            onClick={() => onTargetModeChange('manual')}
            aria-pressed={targetMode === 'manual'}
            className={`min-h-8 rounded-xl border px-3 py-1 text-xs font-medium transition-all ${
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
            aria-pressed={targetMode === 'benchmark'}
            className={`min-h-8 rounded-xl border px-3 py-1 text-xs font-medium transition-all ${
              targetMode === 'benchmark'
                ? 'border-teal-600 bg-teal-50 text-teal-700 shadow-sm'
                : 'border-[#E6E8EC] bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t('fromCompletedItem')}
          </button>
        </div>
      )}

      {/* Horizontal Slide Carousel Track (Kanan-Kiri) */}
      <motion.div
        data-testid="ownership-target-panels"
        className="overflow-hidden w-full relative"
        initial={false}
        animate={activePanelHeight ? { height: activePanelHeight } : undefined}
        transition={calmTransition}
        onAnimationComplete={handleAnimationComplete}
      >
        <motion.div
          className="flex w-full items-start"
          initial={false}
          animate={{ x: targetMode === 'manual' ? '0%' : '-100%' }}
          transition={calmTransition}
        >
          {/* Panel 1: Set manually (Left) */}
          <div
            ref={manualPanelRef}
            data-testid="manual-ownership-target-panel"
            className={`w-full shrink-0 transition-opacity duration-200 ${
              targetMode === 'manual'
                ? 'opacity-100'
                : `pointer-events-none opacity-0 ${!isTransitioning ? 'h-0 overflow-hidden' : ''}`
            }`}
            aria-hidden={targetMode !== 'manual'}
            inert={targetMode !== 'manual'}
          >
            <div className="space-y-1.5">
              <p className="text-[11px] text-gray-500">{t('manualTargetPrompt')}</p>
              <div className="space-y-1">
                <p className="text-xs text-gray-600 font-medium">{t('ownershipGoalBy')}</p>
                <div className="grid grid-cols-3 gap-1.5" role="group" aria-label={t('targetType')}>
                  {[
                    ['none', t('targetTypeNone')],
                    ['duration', t('targetTypeDurationShort')],
                    ['cost_per_day', t('targetTypeCostPerDayShort')],
                  ].map(([type, label]) => {
                    const isActive = targetType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => onTargetTypeChange(type)}
                        className={`relative min-h-10 rounded-xl border px-1 py-1.5 text-[11px] font-medium transition-all ${
                          isActive
                            ? 'border-teal-600 bg-teal-50 text-teal-700 shadow-sm'
                            : 'border-[#E6E8EC] bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <span className="grid grid-cols-[1fr_auto_1fr] items-center">
                          <IoCheckmarkCircle
                            aria-hidden="true"
                            className={`mr-1 justify-self-end text-sm transition-opacity duration-200 ${isActive ? 'opacity-100' : 'opacity-0'}`}
                          />
                          <span>{label}</span>
                          <span aria-hidden="true" />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div
                className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
                  targetType !== 'none'
                    ? 'grid-rows-[1fr] opacity-100'
                    : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                }`}
              >
                <motion.div
                  ref={targetPanelsRef}
                  data-testid="ownership-goal-target-panels"
                  className="relative w-full overflow-hidden"
                  initial={false}
                  animate={targetPanelHeight ? { height: targetPanelHeight } : undefined}
                  transition={calmTransition}
                  onAnimationComplete={handleTargetAnimationComplete}
                >
                  <motion.div
                    className="flex w-full items-start"
                    initial={false}
                    animate={{ x: targetType === 'cost_per_day' ? '-100%' : '0%' }}
                    transition={calmTransition}
                  >
                    <div
                      ref={durationTargetPanelRef}
                      data-testid="duration-target-panel"
                      className={`w-full shrink-0 ${targetType === 'duration' ? '' : 'pointer-events-none'}`}
                      aria-hidden={targetType !== 'duration'}
                      inert={targetType !== 'duration'}
                    >
                      <div className="space-y-1">
                        <label htmlFor="item-target-duration" className="text-xs text-gray-600 font-medium">
                          {t('targetTypeDuration')}
                        </label>
                        <input
                          id="item-target-duration"
                          type="number"
                          value={durationTargetValue}
                          onChange={(event) => onTargetValueChange(event.target.value, 'duration')}
                          min="1"
                          step="1"
                          placeholder={t('enterTargetDuration')}
                          className="w-full px-3 py-2 rounded-xl border border-[#E6E8EC] bg-white focus:border-teal-600
                          focus:ring-2 focus:ring-teal-500/20 outline-none transition-all duration-200 text-sm"
                        />
                        {targetType === 'duration' && equivalentTargetNote && (
                          <p className="text-[11px] font-medium text-teal-700 pt-0.5">
                            {equivalentTargetNote}
                          </p>
                        )}
                      </div>
                    </div>

                    <div
                      ref={costTargetPanelRef}
                      data-testid="cost-target-panel"
                      className={`w-full shrink-0 ${targetType === 'cost_per_day' ? '' : 'pointer-events-none'}`}
                      aria-hidden={targetType !== 'cost_per_day'}
                      inert={targetType !== 'cost_per_day'}
                    >
                      <div className="space-y-1">
                        <label htmlFor="item-target-cost-per-day" className="text-xs text-gray-600 font-medium">
                          {t('targetTypeCostPerDay')}
                        </label>
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                            {currencySymbol}
                          </div>
                          <CurrencyInput
                            id="item-target-cost-per-day"
                            value={costTargetValue}
                            onChange={(event) => onTargetValueChange(event.target.value, 'cost_per_day')}
                            currencyCode={currencyCode}
                            placeholder={t('enterTargetCostPerDay')}
                            className={`w-full px-3 py-2 ${currencySymbol.length > 1 ? 'pl-9' : 'pl-7'} rounded-xl border border-[#E6E8EC] bg-white focus:border-teal-600
                            focus:ring-2 focus:ring-teal-500/20 outline-none transition-all duration-200 text-sm`}
                          />
                        </div>
                        {targetType === 'cost_per_day' && equivalentTargetNote && (
                          <p className="text-[11px] font-medium text-teal-700 pt-0.5">
                            {equivalentTargetNote}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Panel 2: Based on past item (Right) */}
          {allowBenchmark && <div
            ref={benchmarkPanelRef}
            data-testid="benchmark-ownership-target-panel"
            className={`w-full shrink-0 transition-opacity duration-200 ${
              targetMode === 'benchmark'
                ? 'opacity-100'
                : `pointer-events-none opacity-0 ${!isTransitioning ? 'h-0 overflow-hidden' : ''}`
            }`}
            aria-hidden={targetMode !== 'benchmark'}
            inert={targetMode !== 'benchmark'}
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
          </div>}
        </motion.div>
      </motion.div>
    </div>
  );
}

export default ItemOwnershipTargetCard;
