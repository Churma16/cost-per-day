import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  IoChevronDown,
  IoScaleOutline,
  IoHeadsetOutline,
  IoDesktopOutline,
  IoLaptopOutline,
  IoCubeOutline,
  IoReceiptOutline,
  IoCalendarOutline,
  IoPencilOutline,
  IoTrashOutline,
  IoSyncOutline,
} from 'react-icons/io5';
import { formatCurrency, formatDisplayDate } from '../../utils/formatters';
import { selectBestEquivalent } from '../../utils/equivalentCalculator';

const STATUS_TRANSLATION_KEYS = {
  active: 'statusActive',
  retired: 'statusRetired',
  sold: 'statusSold',
  lost: 'statusLost',
};

const RECENT_PURCHASE_WINDOW_DAYS = 14;

export const getLifecycleTranslationKey = (status, ownershipDays) => {
  const normalizedStatus = STATUS_TRANSLATION_KEYS[status] ? status : 'active';

  if (normalizedStatus === 'active') {
    const days = Math.max(1, Number(ownershipDays) || 1);
    return days <= RECENT_PURCHASE_WINDOW_DAYS ? 'statusActiveEarly' : 'statusActive';
  }

  return STATUS_TRANSLATION_KEYS[normalizedStatus];
};

export const getCategoryIconInfo = (category) => {
  const normalizedCategory = String(category || '').trim().toLowerCase();

  if (!normalizedCategory) {
    return {
      Icon: IoCubeOutline,
      containerClass: 'bg-slate-100 text-slate-500 border-slate-200',
    };
  }

  if (/headset|headphone|earphone|audio|tws|earbuds|airpods/i.test(normalizedCategory)) {
    return {
      Icon: IoHeadsetOutline,
      containerClass: 'bg-blue-50 text-blue-600 border-blue-100',
    };
  }

  if (/monitor|display|screen|tv|television/i.test(normalizedCategory)) {
    return {
      Icon: IoDesktopOutline,
      containerClass: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    };
  }

  if (/laptop|macbook|computer|pc|notebook/i.test(normalizedCategory)) {
    return {
      Icon: IoLaptopOutline,
      containerClass: 'bg-amber-50 text-amber-600 border-amber-100',
    };
  }

  return {
    Icon: IoCubeOutline,
    containerClass: 'bg-slate-100 text-slate-500 border-slate-200',
  };
};

export const getStatusBadgeStyle = (status) => {
  switch (status) {
    case 'active':
      return 'text-emerald-600 font-semibold';
    case 'sold':
      return 'text-slate-500 font-medium';
    case 'retired':
      return 'text-stone-500 font-medium';
    case 'lost':
      return 'text-rose-600 font-medium';
    default:
      return 'text-gray-500 font-medium';
  }
};

export const getNextDurationUnit = (currentUnit = 'days', days) => {
  if (days < 30) {
    return 'days';
  }
  if (days < 365) {
    return currentUnit === 'days' ? 'months' : 'days';
  }
  if (currentUnit === 'days') return 'months';
  if (currentUnit === 'months') return 'years';
  return 'days';
};

export const formatOwnershipDuration = (ownershipDays, unit = 'days', t, language = 'en') => {
  const days = Math.max(1, Number(ownershipDays) || 1);

  if (unit === 'months' && days >= 30) {
    const months = (days / 30.4375).toFixed(1).replace(/\.0$/, '');
    const localizedMonths = language === 'id' ? months.replace('.', ',') : months;
    return `~${localizedMonths} ${t('unitMonths')}`;
  }

  if (unit === 'years' && days >= 365) {
    const years = (days / 365.25).toFixed(1).replace(/\.0$/, '');
    const localizedYears = language === 'id' ? years.replace('.', ',') : years;
    return `~${localizedYears} ${t('unitYears')}`;
  }

  const daysLabel = language === 'en' && days === 1 ? 'day' : t('unitDays');
  return `${days} ${daysLabel}`;
};

export function CalmCycleText({ text, hasCycled }) {
  const [currentText, setCurrentText] = useState(text);
  const [previousText, setPreviousText] = useState(null);
  const [transitionKey, setTransitionKey] = useState(0);

  useEffect(() => {
    if (text !== currentText) {
      setPreviousText(currentText);
      setCurrentText(text);
      setTransitionKey((previousIndex) => previousIndex + 1);

      const timeoutIdentifier = setTimeout(() => {
        setPreviousText(null);
      }, 500);

      return () => clearTimeout(timeoutIdentifier);
    }
  }, [text, currentText]);

  if (!previousText || !hasCycled) {
    return (
      <span className="font-semibold text-[#20242A] text-sm tabular-nums whitespace-nowrap">
        {currentText}
      </span>
    );
  }

  return (
    <span className="relative inline-flex items-center justify-end overflow-hidden">
      <span
        key={`outgoing-${transitionKey}`}
        aria-hidden="true"
        className="font-semibold text-[#20242A] text-sm tabular-nums whitespace-nowrap animate-calm-cycle-exit pointer-events-none absolute right-0"
      >
        {previousText}
      </span>
      <span
        key={`incoming-${transitionKey}`}
        className="font-semibold text-[#20242A] text-sm tabular-nums whitespace-nowrap animate-calm-cycle animate-calm-cycle-enter"
      >
        {currentText}
      </span>
    </span>
  );
}

function ItemCard({
  item,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onBenchmark,
  currencyCode,
  valueEquivalents,
}) {
  const { t, i18n } = useTranslation();
  const [durationUnit, setDurationUnit] = useState('days');
  const [syncRotation, setSyncRotation] = useState(0);
  const [hasCycledDuration, setHasCycledDuration] = useState(false);

  const itemStatus = item.status || 'active';
  const isActive = itemStatus === 'active';
  const lifecycleTranslationKey = getLifecycleTranslationKey(itemStatus, item.ownershipDays);
  const itemCostPerDay = Number(item.grossCostPerDay || 0);
  const bestEquivalent = selectBestEquivalent(
    itemCostPerDay,
    valueEquivalents,
    currencyCode,
    t
  );
  const categoryInfo = getCategoryIconInfo(item.category);
  const CategoryIconComponent = categoryInfo.Icon;

  const days = Math.max(1, Number(item.ownershipDays) || 1);
  const isDurationInteractive = days >= 30;
  const displayDuration = formatOwnershipDuration(days, durationUnit, t, i18n?.language);

  const handleCycleDurationUnit = (event) => {
    event.stopPropagation();
    if (!isDurationInteractive) return;
    setDurationUnit((currentUnit) => getNextDurationUnit(currentUnit, days));
    setSyncRotation((currentRotation) => currentRotation + 180);
    setHasCycledDuration(true);
  };

  return (
    <div
      className={`bg-white rounded-2xl overflow-hidden transition-all duration-200 ${
        isExpanded
          ? 'border border-teal-200 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
          : 'border border-[#E6E8EC] shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:border-[#D5D8DF]'
      }`}
    >
      <button
        type="button"
        id={`item-trigger-${item.id}`}
        aria-expanded={isExpanded}
        aria-controls={`item-details-${item.id}`}
        onClick={() => onToggle(item.id)}
        className="w-full text-left p-3 flex items-center justify-between cursor-pointer gap-3 bg-transparent border-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-inset transition-colors rounded-xl"
      >
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${categoryInfo.containerClass}`}
          aria-hidden="true"
        >
          <CategoryIconComponent className="text-lg" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-[#20242A] truncate">{item.name}</h3>
          <div className="mt-0.5 flex items-baseline gap-2 flex-wrap">
            {!isActive && (
              <span className="text-xs text-[#6F7782] font-normal">
                {t('finalGrossCostPerDay')}
              </span>
            )}
            {bestEquivalent && (
              <p className="text-xs text-[#6F7782] font-normal">
                ≈ {bestEquivalent.text}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-shrink-0 text-right">
          <div className="flex flex-col items-end">
            <p className="text-sm font-semibold text-[#20242A] tabular-nums">
              {formatCurrency(itemCostPerDay, currencyCode)}
            </p>
          </div>
          <IoChevronDown
            aria-hidden="true"
            className={`transition-transform duration-300 ease-out motion-reduce:transition-none text-base ${
              isExpanded ? 'rotate-180 text-teal-600' : 'text-[#6F7782]'
            }`}
          />
        </div>
      </button>

      <div
        id={`item-details-${item.id}`}
        role="region"
        aria-labelledby={`item-trigger-${item.id}`}
        aria-hidden={!isExpanded}
        inert={!isExpanded}
        className={`grid transition-[grid-template-rows,opacity,visibility] duration-300 ease-out motion-reduce:transition-none ${
          isExpanded
            ? 'grid-rows-[1fr] opacity-100 visible'
            : 'grid-rows-[0fr] opacity-0 pointer-events-none invisible'
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4 border-t border-[#E6E8EC] pt-3">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-[#F6F7F8] rounded-xl p-3 border border-[#E6E8EC]">
                  <div className="flex items-center gap-1.5 text-xs text-[#6F7782] mb-1">
                    <IoReceiptOutline className="text-sm" />
                    <span>{t('purchaseAmount')}</span>
                  </div>
                  <div className="font-semibold text-[#20242A] text-sm tabular-nums">
                    {formatCurrency(item.price, currencyCode)}
                  </div>
                </div>

                <div className="bg-[#F6F7F8] rounded-xl p-3 border border-[#E6E8EC]">
                  <div className="flex items-center gap-1.5 text-xs text-[#6F7782] mb-1">
                    <IoCalendarOutline className="text-sm" />
                    <span>{t('purchaseDate')}</span>
                  </div>
                  <div className="font-semibold text-[#20242A] text-sm">
                    {formatDisplayDate(item.purchaseDate, i18n?.language)}
                  </div>
                </div>
              </div>

              <button
                type="button"
                tabIndex={isExpanded && isDurationInteractive ? 0 : -1}
                disabled={!isDurationInteractive}
                onClick={handleCycleDurationUnit}
                className={`w-full rounded-xl bg-[#F6F7F8] border border-[#E6E8EC] p-3 flex items-center justify-between text-xs transition-[background-color] duration-300 text-left ${
                  isDurationInteractive
                    ? 'hover:bg-[#EEF0F3] cursor-pointer'
                    : 'cursor-default'
                }`}
                title={isDurationInteractive ? t('clickToCycleUnit') : undefined}
                aria-label={`${t(lifecycleTranslationKey)}: ${displayDuration}`}
              >
                <div className="flex items-center gap-1.5 text-[#6F7782] font-medium">
                  <span className={isActive ? undefined : getStatusBadgeStyle(itemStatus)}>
                    {t(lifecycleTranslationKey)}
                  </span>
                  {isDurationInteractive && (
                    <IoSyncOutline
                      className="text-xs text-[#6F7782] transition-transform duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
                      style={{ transform: `rotate(${syncRotation}deg)` }}
                      aria-hidden="true"
                    />
                  )}
                </div>
                <CalmCycleText text={displayDuration} hasCycled={hasCycledDuration} />
              </button>

              {(item.category || item.brand) && (
                <div className="flex items-center gap-4 text-xs bg-[#F6F7F8] border border-[#E6E8EC] rounded-lg p-2.5">
                  {item.category && (
                    <div>
                      <span className="text-[#6F7782] font-normal">{t('category')}: </span>
                      <span className="font-medium text-[#20242A]">{item.category}</span>
                    </div>
                  )}
                  {item.brand && (
                    <div>
                      <span className="text-[#6F7782] font-normal">{t('brand')}: </span>
                      <span className="font-medium text-[#20242A]">{item.brand}</span>
                    </div>
                  )}
                </div>
              )}

              {!isActive && item.endedAt && (
                <div className="rounded-lg bg-[#F6F7F8] border border-[#E6E8EC] p-3">
                  <div className="text-xs text-[#6F7782]">{t('ownershipEndDate')}</div>
                  <div className="font-medium text-[#20242A]">{formatDisplayDate(item.endedAt, i18n?.language)}</div>
                </div>
              )}

              {itemStatus === 'sold' && (
                <div className="grid gap-3 rounded-lg bg-[#F6F7F8] border border-[#E6E8EC] p-3 sm:grid-cols-3">
                  <div>
                    <div className="text-xs text-[#6F7782]">{t('salePrice')}</div>
                    <div className="font-medium text-[#20242A]">{formatCurrency(Number(item.salePrice || 0), currencyCode)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[#6F7782]">{t('netOwnershipCost')}</div>
                    <div className="font-medium text-[#20242A]">{formatCurrency(Number(item.netOwnershipCost || 0), currencyCode)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[#6F7782]">{t('netCostPerDay')}</div>
                    <div className="font-medium text-[#20242A]">
                      {formatCurrency(Number(item.netCostPerDay || 0), currencyCode)}{t('perDay')}
                    </div>
                  </div>
                </div>
              )}

              {item.targetType && item.targetType !== 'none' && (item.targetCostPerDay || item.targetDurationDays) && (
                <div className="rounded-lg bg-[#F6F7F8] border border-[#E6E8EC] p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#20242A]">{t('targetMilestone')}</span>
                    <span className="text-[#6F7782]">
                      {item.targetCostPerDay && `${formatCurrency(item.targetCostPerDay, currencyCode)}${t('perDay')}`}
                      {item.targetDurationDays && ` (~${item.targetDurationDays} ${t('unitDays')})`}
                    </span>
                  </div>

                  <div className="w-full bg-[#E6E8EC] rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        item.targetState === 'beyond_target'
                          ? 'bg-teal-700'
                          : item.targetState === 'target_reached'
                            ? 'bg-emerald-500'
                            : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, item.progressPercentage ?? item.targetProgressPercentage ?? 0))}%` }}
                    />
                  </div>

                  <div className="text-xs text-[#6F7782] flex justify-between items-center">
                    <span>
                      {item.targetState === 'in_progress' && t('remainingDaysToTarget', { days: item.remainingDays ?? item.remainingDaysToTarget ?? 0 })}
                      {item.targetState === 'beyond_target' && t('daysBeyondTarget', { days: item.daysBeyond ?? item.daysBeyondTarget ?? 0 })}
                      {item.targetState === 'target_reached' && t('targetStateReached')}
                      {item.targetState === 'new' && t('targetStateNew')}
                    </span>
                    <span className="font-medium text-[#20242A]">
                      {Math.round(item.progressPercentage ?? item.targetProgressPercentage ?? 0)}%
                    </span>
                  </div>
                </div>
              )}

              {!isActive && (
                <button
                  type="button"
                  tabIndex={isExpanded ? 0 : -1}
                  className="w-full mt-2 flex items-center justify-center gap-2 p-2 bg-teal-50 hover:bg-teal-100 rounded-lg text-sm font-medium text-teal-800 transition-colors border border-teal-200"
                  onClick={() => onBenchmark(item)}
                >
                  <IoScaleOutline className="text-base" /> {t('benchmarkReplacement')}
                </button>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  tabIndex={isExpanded ? 0 : -1}
                  className="flex-1 flex items-center justify-center gap-1.5 p-2 bg-[#F6F7F8] hover:bg-[#EEF0F3] border border-[#E6E8EC] rounded-lg text-sm font-medium text-[#20242A] transition-colors"
                  onClick={(event) => {
                    event.stopPropagation();
                    onEdit(item);
                  }}
                >
                  <IoPencilOutline className="text-base" /> {t('edit')}
                </button>
                <button
                  type="button"
                  tabIndex={isExpanded ? 0 : -1}
                  className="flex-1 flex items-center justify-center gap-1.5 p-2 bg-white hover:bg-red-50 border border-red-200 rounded-lg text-sm font-medium text-red-600 transition-colors"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDelete(item);
                  }}
                >
                  <IoTrashOutline className="text-base" /> {t('deleteItem')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ItemCard;
