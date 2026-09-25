import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  IoAdd,
  IoPencilOutline,
  IoScaleOutline,
  IoTrashOutline,
} from 'react-icons/io5';
import { formatCurrency } from '../../utils/formatters';

function ValueEquivalentsSection({
  valueEquivalents,
  isLoading,
  error,
  isInteractionBlocked,
  onAdd,
  onEdit,
  onDelete,
}) {
  const { t } = useTranslation();

  return (
    <div>
      <div className="flex items-center justify-between mb-0.5 px-1">
        <h2 className="text-xs font-medium text-gray-500">
          {t('valueEquivalents')}
        </h2>
        <button
          type="button"
          className="text-xs font-semibold text-[#2F7473] hover:text-[#265e5d] flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded-md hover:bg-teal-50/60"
          onClick={() => {
            if (!isInteractionBlocked) onAdd();
          }}
          aria-label={t('addEquivalent')}
        >
          <IoAdd className="text-sm" />
          <span>{t('add')}</span>
        </button>
      </div>
      <p className="text-xs text-gray-400 mb-1.5 px-1">
        {t('valueEquivalentsSubtitle')}
      </p>

      {isLoading ? (
        <div className="text-center py-6 text-gray-400 text-sm">
          <p>{t('loading')}</p>
        </div>
      ) : error ? (
        <div role="alert" className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-medium border border-red-100">
          {error.message || t('errorLoadingEquivalents')}
        </div>
      ) : valueEquivalents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center shadow-sm">
          <p className="text-sm text-gray-400">{t('noEquivalents')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {valueEquivalents.map((equivalentItem, index) => (
            <React.Fragment key={equivalentItem.id}>
              {index > 0 && <div className="border-b border-gray-100 mx-3.5" />}
              <div className="py-2.5 px-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#2F7473] flex items-center justify-center flex-shrink-0 border border-teal-100/60">
                    <IoScaleOutline className="text-base" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate leading-tight">{equivalentItem.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-tight">
                      {formatCurrency(Number(equivalentItem.amount || 0), equivalentItem.currencyCode)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <button
                    type="button"
                    aria-label={`${t('editEquivalent')} ${equivalentItem.name}`}
                    className="p-1.5 text-gray-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                    onClick={() => {
                      if (!isInteractionBlocked) onEdit(equivalentItem);
                    }}
                  >
                    <IoPencilOutline className="text-base" />
                  </button>
                  <button
                    type="button"
                    aria-label={`${t('deleteEquivalent')} ${equivalentItem.name}`}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    onClick={() => {
                      if (!isInteractionBlocked) onDelete(equivalentItem);
                    }}
                  >
                    <IoTrashOutline className="text-base" />
                  </button>
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

export default ValueEquivalentsSection;
