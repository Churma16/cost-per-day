import React from 'react';
import { useTranslation } from 'react-i18next';

function PlanningModeSelector({ planningMode, onPlanningModeChange }) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => onPlanningModeChange('contributionToTime')}
        className={`py-1.5 px-3 text-xs font-medium rounded-xl border transition-all ${
          planningMode === 'contributionToTime'
            ? 'border-teal-600 bg-teal-50 text-teal-700 shadow-sm'
            : 'border-[#E6E8EC] bg-white text-gray-600 hover:bg-gray-50'
        }`}
        aria-pressed={planningMode === 'contributionToTime'}
      >
        {t('modeContributionToTime')}
      </button>
      <button
        type="button"
        onClick={() => onPlanningModeChange('targetDateToContribution')}
        className={`py-1.5 px-3 text-xs font-medium rounded-xl border transition-all ${
          planningMode === 'targetDateToContribution'
            ? 'border-teal-600 bg-teal-50 text-teal-700 shadow-sm'
            : 'border-[#E6E8EC] bg-white text-gray-600 hover:bg-gray-50'
        }`}
        aria-pressed={planningMode === 'targetDateToContribution'}
      >
        {t('modeTargetDateToContribution')}
      </button>
    </div>
  );
}

export default PlanningModeSelector;
