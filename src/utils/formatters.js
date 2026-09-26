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

export const parseSafeDate = (date) => {
  if (!date) return null;
  if (date instanceof Date) {
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof date === 'string') {
    const trimmedDate = date.trim();
    const dateOnlyMatch = trimmedDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnlyMatch) {
      const year = Number(dateOnlyMatch[1]);
      const monthIndex = Number(dateOnlyMatch[2]) - 1;
      const day = Number(dateOnlyMatch[3]);
      const localDate = new Date(year, monthIndex, day);
      return Number.isNaN(localDate.getTime()) ? null : localDate;
    }
  }
  const parsedDate = new Date(date);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

export const formatDate = (date, language = 'en') => {
  if (!date) return '';
  const parsedDate = parseSafeDate(date);
  if (!parsedDate) return '';
  return format(parsedDate, 'yyyy-MM-dd', { locale: getDateLocale(language) });
};

export const formatDisplayDate = (date, language = 'en') => {
  if (!date) return '';
  const parsedDate = parseSafeDate(date);
  if (!parsedDate) return '';
  return format(parsedDate, 'dd MMM yyyy', { locale: getDateLocale(language) });
}; 