import React, { useState, useEffect, useRef } from 'react';
import { useCurrency } from '../../contexts/CurrencyContext';
import {
  formatCurrencyInputValue,
  parseCurrencyInputValue,
  getCurrencyInputSeparators,
  calculateAdjustedCursorPosition
} from '../../utils/currencyInput';

/**
 * CurrencyInput provides a user-friendly input with real-time thousand separators.
 * For IDR, it uses dot '.' as thousand separator without decimals.
 * Emits raw numeric value through onChange for full compatibility with existing form logic.
 */
function CurrencyInput({
  value = '',
  onChange,
  onValueChange,
  currencyCode: propCurrencyCode,
  maxIntegerDigits: propMaxIntegerDigits,
  className = '',
  placeholder = '',
  required = false,
  id,
  name,
  disabled = false,
  autoFocus = false,
  min,
  max,
  ...otherProps
}) {
  let contextCurrencyCode = 'USD';
  try {
    const currencyContext = useCurrency();
    if (currencyContext?.currencyCode) {
      contextCurrencyCode = currencyContext.currencyCode;
    }
  } catch {
    // If used outside CurrencyProvider in isolated tests
    contextCurrencyCode = 'USD';
  }

  const activeCurrencyCode = propCurrencyCode || contextCurrencyCode || 'USD';
  const separatorConfiguration = getCurrencyInputSeparators(activeCurrencyCode);
  const effectiveMaxIntegerDigits =
    propMaxIntegerDigits ?? separatorConfiguration.maxIntegerDigits ?? 10;

  const inputElementRef = useRef(null);
  const [displayValue, setDisplayValue] = useState(() =>
    formatCurrencyInputValue(value, activeCurrencyCode)
  );

  // Sync internal display value when external value or currency changes
  useEffect(() => {
    const parsedCurrentValue = parseCurrencyInputValue(displayValue, activeCurrencyCode);
    const parsedIncomingValue = parseCurrencyInputValue(value, activeCurrencyCode);

    if (parsedCurrentValue !== parsedIncomingValue) {
      setDisplayValue(formatCurrencyInputValue(value, activeCurrencyCode));
    }
  }, [value, activeCurrencyCode]);

  const handleInputChange = (event) => {
    const rawInputValue = event.target.value;
    const currentCursorPosition = event.target.selectionStart ?? rawInputValue.length;

    // Count non-separator characters before cursor to accurately preserve caret position
    const textBeforeCursor = rawInputValue.slice(0, currentCursorPosition);
    const rawDigitsCountBeforeCursor = textBeforeCursor
      .split('')
      .filter((character) => character !== separatorConfiguration.groupSeparator).length;

    const parsedRawValue = parseCurrencyInputValue(rawInputValue, activeCurrencyCode);
    const [integerSegment = '', decimalSegment] = parsedRawValue.split('.');

    let finalRawNumericString = parsedRawValue;

    if (integerSegment.length > effectiveMaxIntegerDigits) {
      const isSingleCharacterAddition = rawInputValue.length === displayValue.length + 1;

      if (isSingleCharacterAddition) {
        // Reject single character typing that exceeds maximum allowed integer digits
        if (inputElementRef.current) {
          inputElementRef.current.value = displayValue;
          const restoredCursorPosition = Math.min(
            Math.max(0, currentCursorPosition - 1),
            displayValue.length
          );
          inputElementRef.current.setSelectionRange(restoredCursorPosition, restoredCursorPosition);
          requestAnimationFrame(() => {
            if (inputElementRef.current) {
              inputElementRef.current.setSelectionRange(
                restoredCursorPosition,
                restoredCursorPosition
              );
            }
          });
        }
        return;
      }

      // Pasted or multi-character insertion: clamp integer digits to maximum limit
      const truncatedIntegerSegment = integerSegment.slice(0, effectiveMaxIntegerDigits);
      finalRawNumericString =
        decimalSegment !== undefined
          ? `${truncatedIntegerSegment}.${decimalSegment}`
          : truncatedIntegerSegment;
    }

    const formattedDisplayString = formatCurrencyInputValue(
      finalRawNumericString,
      activeCurrencyCode
    );

    setDisplayValue(formattedDisplayString);

    if (inputElementRef.current) {
      const adjustedCursorPosition = calculateAdjustedCursorPosition(
        rawDigitsCountBeforeCursor,
        formattedDisplayString,
        separatorConfiguration.groupSeparator
      );

      requestAnimationFrame(() => {
        if (inputElementRef.current) {
          inputElementRef.current.setSelectionRange(adjustedCursorPosition, adjustedCursorPosition);
        }
      });
    }

    if (onChange) {
      const syntheticChangeEvent = {
        ...event,
        target: {
          ...event.target,
          name: name || event.target.name,
          value: finalRawNumericString
        }
      };
      onChange(syntheticChangeEvent, finalRawNumericString);
    }

    if (onValueChange) {
      onValueChange(finalRawNumericString);
    }
  };

  return (
    <input
      ref={inputElementRef}
      type="text"
      inputMode={separatorConfiguration.supportsDecimals ? 'decimal' : 'numeric'}
      autoComplete="off"
      id={id}
      name={name}
      value={displayValue}
      onChange={handleInputChange}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      autoFocus={autoFocus}
      min={min}
      max={max}
      className={className}
      {...otherProps}
    />
  );
}

export default CurrencyInput;
