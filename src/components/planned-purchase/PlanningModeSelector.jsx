import React from 'react';
import { useTranslation } from 'react-i18next';

function PlanningModeSelector({ planningMode, onPlanningModeChange }) {
  const { t } = useTranslation();

  return (
    <div className="border-t border-gray-200 pt-3">
      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-2">
        {t('planningMode')}
      </label>
      <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg">
        <button
          type="button"
          onClick={() => onPlanningModeChange('contributionToTime')}
          className={`py-2 px-3 text-xs font-medium rounded-md transition-all ${
            planningMode === 'contributionToTime'
              ? 'bg-white text-teal-800 shadow-sm font-semibold'
              : 'text-gray-600 hover:text-gray-900'
          }`}
          aria-pressed={planningMode === 'contributionToTime'}
        >
          {t('modeContributionToTime')}
        </button>
        <button
          type="button"
          onClick={() => onPlanningModeChange('targetDateToContribution')}
          className={`py-2 px-3 text-xs font-medium rounded-md transition-all ${
            planningMode === 'targetDateToContribution'
              ? 'bg-white text-teal-800 shadow-sm font-semibold'
              : 'text-gray-600 hover:text-gray-900'
          }`}
          aria-pressed={planningMode === 'targetDateToContribution'}
        >
          {t('modeTargetDateToContribution')}
        </button>
      </div>
    </div>
  );
}

export default PlanningModeSelector;
