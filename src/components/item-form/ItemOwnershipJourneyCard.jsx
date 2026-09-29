import React from 'react';
import { useTranslation } from 'react-i18next';
import { IoCloseCircleOutline, IoTimeOutline } from 'react-icons/io5';
import FormSectionCard, {
  FormField,
  formControlClassName,
} from '../common/FormSectionCard';

function ItemOwnershipJourneyCard({
  completedItems = [],
  currentItemId = null,
  replacesItemId = '',
  onReplacesItemIdChange,
}) {
  const { t } = useTranslation();
  const eligibleItems = completedItems.filter(
    (candidate) => String(candidate.id) !== String(currentItemId ?? ''),
  );

  return (
    <FormSectionCard title={t('ownershipJourneyOptional')} dashed>
      <div className="flex items-start gap-2 rounded-xl bg-[#F6F7F8] border border-[#E6E8EC] p-2.5">
        <IoTimeOutline className="mt-0.5 text-base text-[#2F7473] flex-shrink-0" aria-hidden="true" />
        <p className="text-xs leading-5 text-[#6F7782]">
          {t('ownershipJourneyHelper')}
        </p>
      </div>

      <FormField label={t('ownershipJourneyQuestion')} htmlFor="item-replaces-item">
        <select
          id="item-replaces-item"
          value={replacesItemId}
          onChange={(event) => onReplacesItemIdChange(event.target.value)}
          className={formControlClassName}
        >
          <option value="">{t('ownershipJourneyNone')}</option>
          {eligibleItems.map((candidate) => (
            <option key={candidate.id} value={String(candidate.id)}>
              {candidate.name}
            </option>
          ))}
        </select>
      </FormField>

      {eligibleItems.length === 0 && (
        <p className="text-[11px] leading-4 text-[#8A929C]">
          {t('ownershipJourneyNoCompletedItems')}
        </p>
      )}

      {replacesItemId && (
        <button
          type="button"
          onClick={() => onReplacesItemIdChange('')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6F7782] hover:text-[#20242A] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded-lg px-1 py-0.5"
        >
          <IoCloseCircleOutline aria-hidden="true" />
          {t('ownershipJourneyRemoveLink')}
        </button>
      )}
    </FormSectionCard>
  );
}

export default ItemOwnershipJourneyCard;
