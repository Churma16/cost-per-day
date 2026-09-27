import React from 'react';
import { useTranslation } from 'react-i18next';
import { IoCheckmarkCircle } from 'react-icons/io5';

function PlanningModeSelector({ planningMode, onPlanningModeChange }) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-2 gap-2" role="group" aria-label={t('planningMode')}>
      <button
        type="button"
        onClick={() => onPlanningModeChange('contributionToTime')}
        aria-label={t('modeContributionToTime')}
        className={`min-h-20 p-2.5 text-left text-xs rounded-xl border transition-all ${
          planningMode === 'contributionToTime'
            ? 'border-teal-600 bg-teal-50 text-teal-700 shadow-sm'
            : 'border-[#E6E8EC] bg-white text-gray-600 hover:bg-gray-50'
        }`}
        aria-pressed={planningMode === 'contributionToTime'}
      >
        <span className="flex items-center gap-1.5 font-semibold">
          {planningMode === 'contributionToTime' && <IoCheckmarkCircle aria-hidden="true" className="shrink-0 text-sm" />}
          {t('modeContributionToTime')}
        </span>
        <span className="mt-1 block text-[10px] leading-snug font-normal text-gray-500">
          {t('modeContributionToTimeHelp')}
        </span>
      </button>
      <button
        type="button"
        onClick={() => onPlanningModeChange('targetDateToContribution')}
        aria-label={t('modeTargetDateToContribution')}
        className={`min-h-20 p-2.5 text-left text-xs rounded-xl border transition-all ${
          planningMode === 'targetDateToContribution'
            ? 'border-teal-600 bg-teal-50 text-teal-700 shadow-sm'
            : 'border-[#E6E8EC] bg-white text-gray-600 hover:bg-gray-50'
        }`}
        aria-pressed={planningMode === 'targetDateToContribution'}
      >
        <span className="flex items-center gap-1.5 font-semibold">
          {planningMode === 'targetDateToContribution' && <IoCheckmarkCircle aria-hidden="true" className="shrink-0 text-sm" />}
          {t('modeTargetDateToContribution')}
        </span>
        <span className="mt-1 block text-[10px] leading-snug font-normal text-gray-500">
          {t('modeTargetDateToContributionHelp')}
        </span>
      </button>
    </div>
  );
}

export default PlanningModeSelector;
