import { normalizeCurrencyCode, getCurrencyConfig } from './currencyConfig';

/**
 * Returns separator configuration based on currency code.
 * IDR uses dot '.' as group separator and has 0 standard fraction digits for item prices.
 * Currencies like USD/EUR/CNY use comma ',' as group separator and dot '.' as decimal separator.
 */
export const getCurrencyInputSeparators = (currencyIdentifier) => {
  const normalizedCode = normalizeCurrencyCode(currencyIdentifier);
  const currencyConfiguration = getCurrencyConfig(normalizedCode);

  if (normalizedCode === 'IDR') {
    return {
      groupSeparator: '.',
      decimalSeparator: ',',
      fractionDigits: 0,
      supportsDecimals: false
    };
  }

  return {
    groupSeparator: ',',
    decimalSeparator: '.',
    fractionDigits: currencyConfiguration.fractionDigits ?? 2,
    supportsDecimals: (currencyConfiguration.fractionDigits ?? 2) > 0
  };
};

/**
 * Strips formatting characters to produce a clean raw numeric string suitable for backend and mathematical operations.
 */
export const parseCurrencyInputValue = (formattedDisplayValue, currencyIdentifier) => {
  if (formattedDisplayValue === undefined || formattedDisplayValue === null) {
    return '';
  }

  const stringValue = String(formattedDisplayValue).trim();
  if (stringValue === '') {
    return '';
  }

  const normalizedCode = normalizeCurrencyCode(currencyIdentifier);

  if (normalizedCode === 'IDR') {
    const cleanedString = stringValue.replace(/[^\d.,]/g, '');
    if (cleanedString === '') {
      return '';
    }

    // Indonesian decimal separator ',' (comma) e.g. "1.500,50" or "1,5"
    if (cleanedString.includes(',')) {
      const parts = cleanedString.split(',');
      const integerPart = parts[0].replace(/\./g, '');
      const decimalPart = parts.slice(1).join('');
      const normalizedNumberString = `${integerPart}.${decimalPart}`.replace(/^0+(?=\d)/, '');
      return normalizedNumberString;
    }

    // Handle dots
    if (cleanedString.includes('.')) {
      const dotParts = cleanedString.split('.');
      // Multiple dots (e.g. "15.000.000") are thousand separators
      if (dotParts.length > 2) {
        return cleanedString.replace(/\./g, '').replace(/^0+(?=\d)/, '');
      }
      // Single dot: if followed by exactly 3 digits (e.g. "1.000"), it's a thousand separator
      if (dotParts[1].length === 3) {
        return cleanedString.replace(/\./g, '').replace(/^0+(?=\d)/, '');
      }
      // Single dot followed by 1 or 2 digits (e.g. "1.5" or "1.25") is a decimal
      const normalizedInteger = dotParts[0].replace(/^0+(?=\d)/, '') || '0';
      return `${normalizedInteger}.${dotParts[1]}`;
    }

    const digitsOnlyString = cleanedString.replace(/\D/g, '');
    return digitsOnlyString.replace(/^0+(?=\d)/, '');
  }

  // Currencies with decimal support (USD, EUR, CNY)
  let sanitizedString = stringValue.replace(/[^0-9.]/g, '');

  const dotSplitSegments = sanitizedString.split('.');
  if (dotSplitSegments.length > 2) {
    sanitizedString = `${dotSplitSegments[0]}.${dotSplitSegments.slice(1).join('')}`;
  }

  if (sanitizedString === '' || sanitizedString === '.') {
    return '';
  }

  return sanitizedString;
};

/**
 * Formats a raw numeric string or number into a user-friendly string with thousand separators.
 */
export const formatCurrencyInputValue = (rawNumericValue, currencyIdentifier) => {
  if (rawNumericValue === undefined || rawNumericValue === null || rawNumericValue === '') {
    return '';
  }

  const normalizedCode = normalizeCurrencyCode(currencyIdentifier);
  const rawString = String(rawNumericValue).trim();

  if (rawString === '') {
    return '';
  }

  if (normalizedCode === 'IDR') {
    // If rawString contains a decimal point (e.g. "1.5" or "100.5")
    if (rawString.includes('.')) {
      const [integerSegment = '', decimalSegment = ''] = rawString.split('.');
      const normalizedInteger = integerSegment.replace(/\D/g, '').replace(/^0+(?=\d)/, '') || '0';
      const formattedInteger = normalizedInteger.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      return decimalSegment !== undefined && decimalSegment !== ''
        ? `${formattedInteger}.${decimalSegment}`
        : `${formattedInteger}.`;
    }

    const digitsOnlyString = rawString.replace(/\D/g, '');
    if (digitsOnlyString === '') {
      return '';
    }

    const normalizedIntegerString = digitsOnlyString.replace(/^0+(?=\d)/, '');
    return normalizedIntegerString.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  // Currencies with decimals (USD, EUR, CNY)
  const containsTrailingDecimalPoint = rawString.endsWith('.');
  const sanitizedString = rawString.replace(/[^0-9.]/g, '');
  const [integerSegment = '', decimalSegment] = sanitizedString.split('.');

  const normalizedIntegerString = integerSegment.replace(/^0+(?=\d)/, '') || '0';
  const formattedIntegerString = normalizedIntegerString.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ','
  );

  if (decimalSegment !== undefined) {
    const separatorConfiguration = getCurrencyInputSeparators(currencyIdentifier);
    const truncatedDecimalSegment = decimalSegment.slice(0, separatorConfiguration.fractionDigits);
    return `${formattedIntegerString}.${truncatedDecimalSegment}`;
  }

  if (containsTrailingDecimalPoint) {
    return `${formattedIntegerString}.`;
  }

  return formattedIntegerString;
};

/**
 * Calculates new cursor position after formatting so the cursor remains stable during typing.
 */
export const calculateAdjustedCursorPosition = (
  rawDigitsCountBeforeCursor,
  newFormattedString,
  groupSeparator
) => {
  if (rawDigitsCountBeforeCursor <= 0) {
    return 0;
  }

  let matchedDigitsCount = 0;
  let targetCursorIndex = 0;

  for (let characterIndex = 0; characterIndex < newFormattedString.length; characterIndex += 1) {
    const currentCharacter = newFormattedString[characterIndex];
    if (currentCharacter !== groupSeparator) {
      matchedDigitsCount += 1;
    }
    if (matchedDigitsCount === rawDigitsCountBeforeCursor) {
      targetCursorIndex = characterIndex + 1;
      break;
    }
  }

  return Math.min(targetCursorIndex || newFormattedString.length, newFormattedString.length);
};
