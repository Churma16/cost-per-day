import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CurrencyInput from '../../../src/components/common/CurrencyInput';

describe('CurrencyInput component', () => {
  it('formats initial raw value with IDR thousand separators', () => {
    render(
      <CurrencyInput
        value="15000000"
        currencyCode="IDR"
        placeholder="Enter price"
      />
    );

    const inputElement = screen.getByPlaceholderText('Enter price');
    expect(inputElement.value).toBe('15.000.000');
  });

  it('formats initial raw value with USD thousand separators', () => {
    render(
      <CurrencyInput
        value="1500"
        currencyCode="USD"
        placeholder="Enter price"
      />
    );

    const inputElement = screen.getByPlaceholderText('Enter price');
    expect(inputElement.value).toBe('1,500');
  });

  it('emits raw numeric value through onChange when user enters digits in IDR', () => {
    const handleChange = vi.fn();
    render(
      <CurrencyInput
        value=""
        onChange={handleChange}
        currencyCode="IDR"
        placeholder="Enter price"
      />
    );

    const inputElement = screen.getByPlaceholderText('Enter price');
    fireEvent.change(inputElement, { target: { value: '250000' } });

    expect(handleChange).toHaveBeenCalled();
    const [eventObject, rawValue] = handleChange.mock.calls[0];
    expect(eventObject.target.value).toBe('250000');
    expect(rawValue).toBe('250000');
    expect(inputElement.value).toBe('250.000');
  });

  it('allows pasting formatted strings and still extracts clean raw value', () => {
    const handleChange = vi.fn();
    render(
      <CurrencyInput
        value=""
        onChange={handleChange}
        currencyCode="IDR"
        placeholder="Enter price"
      />
    );

    const inputElement = screen.getByPlaceholderText('Enter price');
    fireEvent.change(inputElement, { target: { value: 'Rp 1.500.000' } });

    const [eventObject] = handleChange.mock.calls[0];
    expect(eventObject.target.value).toBe('1500000');
    expect(inputElement.value).toBe('1.500.000');
  });

  it('updates display value when external value prop changes', () => {
    function ControlledTestWrapper() {
      const [priceValue, setPriceValue] = useState('1000');
      return (
        <div>
          <CurrencyInput
            value={priceValue}
            onChange={(event) => setPriceValue(event.target.value)}
            currencyCode="IDR"
            placeholder="Enter price"
          />
          <button type="button" onClick={() => setPriceValue('5000000')}>
            Set High Price
          </button>
        </div>
      );
    }

    render(<ControlledTestWrapper />);
    const inputElement = screen.getByPlaceholderText('Enter price');
    expect(inputElement.value).toBe('1.000');

    fireEvent.click(screen.getByRole('button', { name: 'Set High Price' }));
    expect(inputElement.value).toBe('5.000.000');
  });

  it('supports onValueChange callback if provided', () => {
    const handleValueChange = vi.fn();
    render(
      <CurrencyInput
        value=""
        onValueChange={handleValueChange}
        currencyCode="IDR"
        placeholder="Enter price"
      />
    );

    const inputElement = screen.getByPlaceholderText('Enter price');
    fireEvent.change(inputElement, { target: { value: '75000' } });

    expect(handleValueChange).toHaveBeenCalledWith('75000');
  });

  it('handles sequential typing in IDR without corrupting numeric values when appending zeros', () => {
    function SequentialTypingWrapper() {
      const [amount, setAmount] = useState('1000');
      return (
        <CurrencyInput
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          currencyCode="IDR"
          placeholder="Enter price"
        />
      );
    }

    render(<SequentialTypingWrapper />);
    const inputElement = screen.getByPlaceholderText('Enter price');
    expect(inputElement.value).toBe('1.000');

    // User types '0' at the end of '1.000' -> native input value is '1.0000'
    fireEvent.change(inputElement, { target: { value: '1.0000' } });
    expect(inputElement.value).toBe('10.000');

    // User types another '0' at the end of '10.000' -> native input value is '10.0000'
    fireEvent.change(inputElement, { target: { value: '10.0000' } });
    expect(inputElement.value).toBe('100.000');
  });

  it('handles editing in the middle of a formatted IDR value', () => {
    function MiddleEditingWrapper() {
      const [amount, setAmount] = useState('100000');
      return (
        <CurrencyInput
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          currencyCode="IDR"
          placeholder="Enter price"
        />
      );
    }

    render(<MiddleEditingWrapper />);
    const inputElement = screen.getByPlaceholderText('Enter price');
    expect(inputElement.value).toBe('100.000');

    // User inserts '5' after '10' -> native input value is '1050.000'
    fireEvent.change(inputElement, { target: { value: '1050.000' } });
    expect(inputElement.value).toBe('1.050.000');
  });

  it('forwards min and max attributes to the underlying input element', () => {
    render(
      <CurrencyInput
        value=""
        currencyCode="USD"
        placeholder="Enter price"
        min="0.01"
        max="9999"
      />
    );

    const inputElement = screen.getByPlaceholderText('Enter price');
    expect(inputElement).toHaveAttribute('min', '0.01');
    expect(inputElement).toHaveAttribute('max', '9999');
  });

  it('rejects typing more than 10 integer digits in IDR', () => {
    const handleChange = vi.fn();
    function TenDigitWrapper() {
      const [amount, setAmount] = useState('9999999999');
      return (
        <CurrencyInput
          value={amount}
          onChange={(event) => {
            handleChange(event.target.value);
            setAmount(event.target.value);
          }}
          currencyCode="IDR"
          placeholder="Enter price"
        />
      );
    }

    render(<TenDigitWrapper />);
    const inputElement = screen.getByPlaceholderText('Enter price');
    expect(inputElement.value).toBe('9.999.999.999');

    // User attempts to type an 11th digit at the end: '9.999.999.9990'
    fireEvent.change(inputElement, { target: { value: '9.999.999.9990' } });

    // Keystroke should be rejected: input stays at 10 digits and onChange is not invoked with 11 digits
    expect(inputElement.value).toBe('9.999.999.999');
    expect(handleChange).not.toHaveBeenCalledWith('99999999990');
  });

  it('rejects inserting a digit in the middle when already at 10 digits in IDR', () => {
    const handleChange = vi.fn();
    function MiddleInsertOverflowWrapper() {
      const [amount, setAmount] = useState('1234567890');
      return (
        <CurrencyInput
          value={amount}
          onChange={(event) => {
            handleChange(event.target.value);
            setAmount(event.target.value);
          }}
          currencyCode="IDR"
          placeholder="Enter price"
        />
      );
    }

    render(<MiddleInsertOverflowWrapper />);
    const inputElement = screen.getByPlaceholderText('Enter price');
    expect(inputElement.value).toBe('1.234.567.890');

    // User attempts to insert '5' in the middle: '1.2534.567.890'
    fireEvent.change(inputElement, { target: { value: '1.2534.567.890' } });

    // Keystroke should be rejected
    expect(inputElement.value).toBe('1.234.567.890');
    expect(handleChange).not.toHaveBeenCalledWith('12534567890');
  });

  it('rejects pasted IDR values longer than 10 digits without emitting a truncated amount', () => {
    const handleChange = vi.fn();
    const handleValueChange = vi.fn();
    render(
      <CurrencyInput
        value="1000"
        onChange={handleChange}
        onValueChange={handleValueChange}
        currencyCode="IDR"
        placeholder="Enter price"
      />
    );

    const inputElement = screen.getByPlaceholderText('Enter price');
    expect(inputElement.value).toBe('1.000');

    fireEvent.change(inputElement, { target: { value: '123456789012345' } });

    expect(inputElement.value).toBe('1.000');
    expect(handleChange).not.toHaveBeenCalled();
    expect(handleValueChange).not.toHaveBeenCalled();
  });

  it('rejects USD input beyond 9 integer digits instead of truncating the amount', () => {
    const handleChange = vi.fn();
    render(
      <CurrencyInput
        value="1250.50"
        onChange={handleChange}
        currencyCode="USD"
        placeholder="Enter price"
      />
    );

    const inputElement = screen.getByPlaceholderText('Enter price');
    expect(inputElement.value).toBe('1,250.50');

    fireEvent.change(inputElement, { target: { value: '123456789012.50' } });

    expect(inputElement.value).toBe('1,250.50');
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('respects custom maxIntegerDigits by rejecting overflow without changing the value', () => {
    const handleChange = vi.fn();
    render(
      <CurrencyInput
        value="12345"
        onChange={handleChange}
        currencyCode="IDR"
        maxIntegerDigits={5}
        placeholder="Enter price"
      />
    );

    const inputElement = screen.getByPlaceholderText('Enter price');
    expect(inputElement.value).toBe('12.345');

    fireEvent.change(inputElement, { target: { value: '1234567' } });

    expect(inputElement.value).toBe('12.345');
    expect(handleChange).not.toHaveBeenCalled();
  });
});
