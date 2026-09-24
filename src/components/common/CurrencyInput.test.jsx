import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CurrencyInput from './CurrencyInput';

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
});
