import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IoArrowBack } from 'react-icons/io5';
import AddItem from './AddItem';
import PlannedPurchaseCreateForm from './PlannedPurchaseCreateForm';

const ADD_TYPES = ['item', 'planned'];

function AddEntryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedType = searchParams.get('type');
  const activeType = ADD_TYPES.includes(requestedType) ? requestedType : 'item';
  const tabRefs = useRef({});

  useEffect(() => {
    if (requestedType !== activeType) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('type', activeType);
      setSearchParams(nextParams, { replace: true });
    }
  }, [activeType, requestedType, searchParams, setSearchParams]);

  const selectType = (type, focus = false) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('type', type);
    setSearchParams(nextParams);
    if (focus) {
      window.requestAnimationFrame(() => tabRefs.current[type]?.focus());
    }
  };

  const handleTabKeyDown = (event, currentType) => {
    const currentIndex = ADD_TYPES.indexOf(currentType);
    let nextIndex = null;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % ADD_TYPES.length;
    if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + ADD_TYPES.length) % ADD_TYPES.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = ADD_TYPES.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    selectType(ADD_TYPES[nextIndex], true);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="px-3.5 pt-3 pb-2 space-y-3">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center w-7 h-7 -ml-1 text-gray-700 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
            aria-label={t('back')}
          >
            <IoArrowBack className="text-lg" />
          </button>
          <h1 className="text-base font-bold text-gray-900 m-0 translate-y-[0.5px]">
            {t('addEntryTitle')}
          </h1>
        </div>

        <div
          role="tablist"
          aria-label={t('addEntryTypeLabel')}
          className="grid grid-cols-2 rounded-xl bg-gray-200/70 p-1"
        >
          {ADD_TYPES.map((type) => {
            const isActive = activeType === type;
            return (
              <button
                key={type}
                ref={(node) => { tabRefs.current[type] = node; }}
                id={`add-${type}-tab`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`add-${type}-panel`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => selectType(type)}
                onKeyDown={(event) => handleTabKeyDown(event, type)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-1 ${
                  isActive
                    ? 'bg-white text-teal-800 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t(type === 'item' ? 'ownedItemTab' : 'plannedItemTab')}
              </button>
            );
          })}
        </div>
      </div>

      <div
        id="add-item-panel"
        role="tabpanel"
        aria-labelledby="add-item-tab"
        hidden={activeType !== 'item'}
      >
        <AddItem showHeader={false} />
      </div>
      <div
        id="add-planned-panel"
        role="tabpanel"
        aria-labelledby="add-planned-tab"
        hidden={activeType !== 'planned'}
      >
        <PlannedPurchaseCreateForm />
      </div>
    </div>
  );
}

export default AddEntryPage;
