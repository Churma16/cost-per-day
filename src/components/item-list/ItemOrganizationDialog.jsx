import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { IoClose, IoOptionsOutline } from 'react-icons/io5';
import { GROUP_OPTIONS, OWNERSHIP_STATES, SORT_OPTIONS } from '../../utils/itemOrganization';

const STATE_LABEL_KEYS = {
  justJoined: 'statusActiveEarly',
  stillWithYou: 'statusActive',
  noLongerInUse: 'statusRetired',
  changedHands: 'statusSold',
  lost: 'statusLost',
};

const GROUP_LABEL_KEYS = {
  ownershipState: 'groupOwnershipState',
  category: 'category',
  none: 'groupNone',
};

const SORT_LABEL_KEYS = {
  recentlyAcquired: 'sortRecentlyAcquired',
  oldestOwned: 'sortOldestOwned',
  nameAscending: 'sortNameAscending',
  nameDescending: 'sortNameDescending',
  costDescending: 'sortCostDescending',
  costAscending: 'sortCostAscending',
  priceDescending: 'sortPriceDescending',
  priceAscending: 'sortPriceAscending',
};

function ItemOrganizationDialog({ isOpen, organization, onChange, onClose }) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const allStatesSelected = organization.stateFilters.length === 0;
  const toggleState = (state) => {
    const nextStates = organization.stateFilters.includes(state)
      ? organization.stateFilters.filter((candidate) => candidate !== state)
      : [...organization.stateFilters, state];
    onChange({
      ...organization,
      stateFilters: nextStates.length === OWNERSHIP_STATES.length ? [] : nextStates,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="item-organization-title"
        className="w-full sm:max-w-md max-h-[88vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-white shadow-xl border border-gray-100"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-[#E6E8EC] bg-white">
          <div className="flex items-center gap-2">
            <IoOptionsOutline className="text-lg text-[#2F7473]" aria-hidden="true" />
            <h2 id="item-organization-title" className="font-semibold text-[#20242A]">{t('organizeItems')}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label={t('close')} className="w-9 h-9 rounded-full flex items-center justify-center text-[#6F7782] hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
            <IoClose aria-hidden="true" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          <fieldset>
            <legend className="font-semibold text-sm text-[#20242A] mb-2">{t('filterByOwnershipState')}</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="flex items-center gap-2.5 rounded-xl border border-[#E6E8EC] px-3 py-2.5 text-sm cursor-pointer">
                <input type="checkbox" checked={allStatesSelected} onChange={() => onChange({ ...organization, stateFilters: [] })} className="accent-[#2F7473]" />
                {t('allStates')}
              </label>
              {OWNERSHIP_STATES.map((state) => (
                <label key={state} className="flex items-center gap-2.5 rounded-xl border border-[#E6E8EC] px-3 py-2.5 text-sm cursor-pointer">
                  <input type="checkbox" checked={!allStatesSelected && organization.stateFilters.includes(state)} onChange={() => toggleState(state)} className="accent-[#2F7473]" />
                  {t(STATE_LABEL_KEYS[state])}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="font-semibold text-sm text-[#20242A] mb-2">{t('groupBy')}</legend>
            <div className="space-y-2">
              {GROUP_OPTIONS.map((option) => (
                <label key={option} className="flex items-center gap-2.5 rounded-xl border border-[#E6E8EC] px-3 py-2.5 text-sm cursor-pointer">
                  <input type="radio" name="home-group-by" value={option} checked={organization.groupBy === option} onChange={() => onChange({ ...organization, groupBy: option })} className="accent-[#2F7473]" />
                  {t(GROUP_LABEL_KEYS[option])}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="font-semibold text-sm text-[#20242A] mb-2">{t('sortBy')}</legend>
            <div className="space-y-2">
              {SORT_OPTIONS.map((option) => (
                <label key={option} className="flex items-center gap-2.5 rounded-xl border border-[#E6E8EC] px-3 py-2.5 text-sm cursor-pointer">
                  <input type="radio" name="home-sort-by" value={option} checked={organization.sortBy === option} onChange={() => onChange({ ...organization, sortBy: option })} className="accent-[#2F7473]" />
                  {t(SORT_LABEL_KEYS[option])}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="sticky bottom-0 p-4 border-t border-[#E6E8EC] bg-white">
          <button type="button" onClick={onClose} className="w-full rounded-xl bg-[#2F7473] px-4 py-3 text-sm font-semibold text-white hover:bg-[#286563] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-teal-600">
            {t('done')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ItemOrganizationDialog;
