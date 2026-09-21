import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale/zh-CN';
import { enUS } from 'date-fns/locale/en-US';
import { fr } from 'date-fns/locale/fr';
import { normalizeCurrencyCode } from './currencyConfig';

export const formatCurrency = (number, currencyCode = 'USD') => {
  const normalizedCurrencyCode = normalizeCurrencyCode(currencyCode);

  const isIndonesianRupiah = normalizedCurrencyCode === 'IDR';
  const currencyLocale = isIndonesianRupiah ? 'id-ID' : 'en-US';
  const fractionDigits = isIndonesianRupiah ? 0 : 2;

  const numericAmount = typeof number === 'number' && !isNaN(number)
    ? number
    : Number(number) || 0;

  const formattedCurrencyString = new Intl.NumberFormat(currencyLocale, {
    style: 'currency',
    currency: normalizedCurrencyCode,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(numericAmount);

  if (isIndonesianRupiah) {
    return formattedCurrencyString.replace(/Rp[\s\u00a0]+/g, 'Rp');
  }

  return formattedCurrencyString;
};

export const formatDate = (date, language = 'en') => {
  // Get appropriate locale based on language
  const locale = language === 'zh' ? zhCN : 
                language === 'fr' ? fr : enUS;
  
  return format(new Date(date), 'yyyy-MM-dd', { locale });
}; 