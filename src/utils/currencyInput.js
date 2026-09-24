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
 * For IDR, dots '.' are grouping separators and are always stripped so digits-only are emitted.
 */
export const parseCurrencyInputValue = (formattedDisplayValue, currencyIdentifier) => {
  if (formattedDisplayValue === undefined || formattedDisplayValue === null) {
    return '';
  }

  const stringValue = String(formattedDisplayValue).trim();
  if (stringValue === '') {
    return '';
  }

  const separatorConfiguration = getCurrencyInputSeparators(currencyIdentifier);

  if (!separatorConfiguration.supportsDecimals) {
    // For currencies without decimals (IDR), all non-digits (including dots) are strictly grouping/non-numeric.
    // Never infer decimal semantics from a single dot.
    const digitsOnlyString = stringValue.replace(/\D/g, '');
    if (digitsOnlyString === '') {
      return '';
    }
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

  const separatorConfiguration = getCurrencyInputSeparators(currencyIdentifier);
  const rawString = String(rawNumericValue).trim();

  if (rawString === '') {
    return '';
  }

  if (!separatorConfiguration.supportsDecimals) {
    const digitsOnlyString = rawString.replace(/\D/g, '');
    if (digitsOnlyString === '') {
      return '';
    }

    const normalizedIntegerString = digitsOnlyString.replace(/^0+(?=\d)/, '');
    return normalizedIntegerString.replace(
      /\B(?=(\d{3})+(?!\d))/g,
      separatorConfiguration.groupSeparator
    );
  }

  // Currencies with decimals (USD, EUR, CNY)
  const containsTrailingDecimalPoint = rawString.endsWith('.');
  const sanitizedString = rawString.replace(/[^0-9.]/g, '');
  const [integerSegment = '', decimalSegment] = sanitizedString.split('.');

  const normalizedIntegerString = integerSegment.replace(/^0+(?=\d)/, '') || '0';
  const formattedIntegerString = normalizedIntegerString.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    separatorConfiguration.groupSeparator
  );

  if (decimalSegment !== undefined) {
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
