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

    const rawNumericString = parseCurrencyInputValue(rawInputValue, activeCurrencyCode);
    const formattedDisplayString = formatCurrencyInputValue(rawNumericString, activeCurrencyCode);

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
          value: rawNumericString
        }
      };
      onChange(syntheticChangeEvent, rawNumericString);
    }

    if (onValueChange) {
      onValueChange(rawNumericString);
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
