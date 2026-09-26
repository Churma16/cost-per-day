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
