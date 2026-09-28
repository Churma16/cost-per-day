import { SUPPORTED_LANGUAGES } from '../constants/preferences';
import { CURRENCY_CONFIGURATIONS } from './currencyConfig';

export const ONBOARDING_COMPLETED_SETTING = 'onboardingCompleted';

const EURO_REGIONS = new Set([
  'AT', 'BE', 'CY', 'DE', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'IE', 'IT',
  'LT', 'LU', 'LV', 'MT', 'NL', 'PT', 'SI', 'SK',
]);

const normalizeLocales = (locales = []) => (Array.isArray(locales) ? locales : [locales])
  .filter(Boolean)
  .map((locale) => String(locale).trim())
  .filter(Boolean);

export const suggestLanguage = (locales = globalThis.navigator?.languages || []) => {
  const suggested = normalizeLocales(locales)
    .map((locale) => locale.split('-')[0].toLowerCase())
    .find((language) => SUPPORTED_LANGUAGES.includes(language));
  return suggested || 'en';
};

export const suggestCurrency = (locales = globalThis.navigator?.languages || []) => {
  for (const locale of normalizeLocales(locales)) {
    const parts = locale.replace('_', '-').split('-');
    const language = parts[0]?.toLowerCase();
    const region = parts.find((part, index) => index > 0 && part.length === 2)?.toUpperCase();

    if (region === 'ID' || language === 'id') return 'IDR';
    if (region === 'CN' || language === 'zh') return 'CNY';
    if (EURO_REGIONS.has(region)) return 'EUR';
    if (region === 'US') return 'USD';
  }
  return 'USD';
};

export const hasCompletedOnboarding = (settings) => (
  String(settings?.[ONBOARDING_COMPLETED_SETTING]).toLowerCase() === 'true'
);

export const sanitizeOnboardingSettings = (settings = {}) => {
  const language = SUPPORTED_LANGUAGES.includes(settings.language) ? settings.language : null;
  const currency = CURRENCY_CONFIGURATIONS[settings.currency] ? settings.currency : null;
  return {
    ...(language ? { language } : {}),
    ...(currency ? { currency } : {}),
    ...(hasCompletedOnboarding(settings) ? { [ONBOARDING_COMPLETED_SETTING]: 'true' } : {}),
  };
};
