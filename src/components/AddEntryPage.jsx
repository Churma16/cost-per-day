import React, { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import AddItem from './AddItem';
import PlannedPurchaseCreateForm from './PlannedPurchaseCreateForm';

const ADD_TYPES = ['item', 'planned'];

function AddEntryPage() {
  const { t } = useTranslation();
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
      <div className="px-4 space-y-4 pb-2">
        <div className="pt-6 pb-1 px-1">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {t('addEntryTitle')}
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-[#6F7782]">
            {t('addEntrySubtitle')}
          </p>
        </div>

        <div
          role="tablist"
          aria-label={t('addEntryTypeLabel')}
          className="relative grid grid-cols-2 rounded-xl bg-gray-200/70 p-1"
        >
          <motion.span
            data-testid="add-type-indicator"
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-1 left-1 z-0 w-[calc(50%_-_0.25rem)] rounded-lg bg-white shadow-sm"
            initial={false}
            animate={{ x: activeType === 'item' ? '0%' : '100%' }}
            transition={{ type: 'spring', stiffness: 240, damping: 30, mass: 0.9 }}
          />
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
                className={`relative z-10 rounded-lg px-3 py-2 text-sm font-semibold transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-1 ${
                  isActive
                    ? 'text-teal-800'
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
