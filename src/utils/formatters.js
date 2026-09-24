import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale/zh-CN';
import { enUS } from 'date-fns/locale/en-US';
import { fr } from 'date-fns/locale/fr';
import { id } from 'date-fns/locale/id';
import { normalizeCurrencyCode, getCurrencyConfig } from './currencyConfig';

export const formatCurrency = (number, currencyCode = 'USD') => {
  const normalizedCurrencyCode = normalizeCurrencyCode(currencyCode);
  const currencyConfiguration = getCurrencyConfig(normalizedCurrencyCode);

  const numericAmount = typeof number === 'number' && !isNaN(number)
    ? number
    : Number(number) || 0;

  const formattedCurrencyString = new Intl.NumberFormat(currencyConfiguration.locale, {
    style: 'currency',
    currency: normalizedCurrencyCode,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: currencyConfiguration.fractionDigits,
    maximumFractionDigits: currencyConfiguration.fractionDigits,
  }).format(numericAmount);

  if (normalizedCurrencyCode === 'IDR') {
    return formattedCurrencyString.replace(/Rp[\s\u00a0]*/g, 'Rp ');
  }

  return formattedCurrencyString;
};

const DATE_LOCALES = {
  en: enUS,
  fr,
  zh: zhCN,
  id
};

export const getDateLocale = (language = 'en') => DATE_LOCALES[language] || enUS;

export const formatDate = (date, language = 'en') => {
  return format(new Date(date), 'yyyy-MM-dd', { locale: getDateLocale(language) });
};

export const formatDisplayDate = (date, language = 'en') => {
  if (!date) return '';
  return format(new Date(date), 'dd MMM yyyy', { locale: getDateLocale(language) });
}; 