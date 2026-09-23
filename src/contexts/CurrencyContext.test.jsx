import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { vi } from 'vitest';
import {
  CurrencyProvider,
  useCurrency,
  normalizeCurrencyCode,
  getCurrencySymbol,
  getCurrencyConfig,
  getSupportedCurrencies
} from './CurrencyContext';
import { getSetting, updateSetting } from '../services/api';

vi.mock('../services/api', () => ({
  getSetting: vi.fn(),
  updateSetting: vi.fn(),
}));

const TestCurrencyConsumer = () => {
  const { currencyCode, currencySymbol, changeCurrency, isLoading } = useCurrency();
  if (isLoading) {
    return <div>Loading Currency</div>;
  }
  return (
    <div>
      <span data-testid="currency-code">{currencyCode}</span>
      <span data-testid="currency-symbol">{currencySymbol}</span>
      <button onClick={() => changeCurrency('IDR')}>Set IDR</button>
      <button onClick={() => changeCurrency('$')}>Set Legacy Dollar</button>
    </div>
  );
};

describe('CurrencyContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Legacy symbol migration', () => {
    test('migrates legacy $ symbol to USD and persists it', async () => {
      getSetting.mockResolvedValue('$');
      updateSetting.mockResolvedValue(undefined);

      render(
        <CurrencyProvider>
          <TestCurrencyConsumer />
        </CurrencyProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('currency-code')).toHaveTextContent('USD');
      });

      expect(screen.getByTestId('currency-symbol')).toHaveTextContent('$');
      expect(updateSetting).toHaveBeenCalledWith('currency', 'USD');
    });

    test('migrates legacy € symbol to EUR and persists it', async () => {
      getSetting.mockResolvedValue('€');
      updateSetting.mockResolvedValue(undefined);

      render(
        <CurrencyProvider>
          <TestCurrencyConsumer />
        </CurrencyProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('currency-code')).toHaveTextContent('EUR');
      });

      expect(screen.getByTestId('currency-symbol')).toHaveTextContent('€');
      expect(updateSetting).toHaveBeenCalledWith('currency', 'EUR');
    });

    test('migrates legacy ¥ symbol to CNY and persists it', async () => {
      getSetting.mockResolvedValue('¥');
      updateSetting.mockResolvedValue(undefined);

      render(
        <CurrencyProvider>
          <TestCurrencyConsumer />
        </CurrencyProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('currency-code')).toHaveTextContent('CNY');
      });

      expect(screen.getByTestId('currency-symbol')).toHaveTextContent('¥');
      expect(updateSetting).toHaveBeenCalledWith('currency', 'CNY');
    });
  });

  describe('Standard currency loading and changing', () => {
    test('loads existing IDR code without re-persisting', async () => {
      getSetting.mockResolvedValue('IDR');

      render(
        <CurrencyProvider>
          <TestCurrencyConsumer />
        </CurrencyProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('currency-code')).toHaveTextContent('IDR');
      });

      expect(screen.getByTestId('currency-symbol')).toHaveTextContent('Rp');
      expect(updateSetting).not.toHaveBeenCalled();
    });

    test('defaults to USD when no currency is saved', async () => {
      getSetting.mockResolvedValue(null);

      render(
        <CurrencyProvider>
          <TestCurrencyConsumer />
        </CurrencyProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('currency-code')).toHaveTextContent('USD');
      });

      expect(screen.getByTestId('currency-symbol')).toHaveTextContent('$');
    });

    test('updates currency and persists to storage when changeCurrency is called', async () => {
      getSetting.mockResolvedValue('USD');
      updateSetting.mockResolvedValue(undefined);

      render(
        <CurrencyProvider>
          <TestCurrencyConsumer />
        </CurrencyProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('currency-code')).toHaveTextContent('USD');
      });

      await act(async () => {
        screen.getByText('Set IDR').click();
      });

      expect(screen.getByTestId('currency-code')).toHaveTextContent('IDR');
      expect(screen.getByTestId('currency-symbol')).toHaveTextContent('Rp');
      expect(updateSetting).toHaveBeenCalledWith('currency', 'IDR');
    });

    test('normalizes legacy symbol when passed to changeCurrency', async () => {
      getSetting.mockResolvedValue('IDR');
      updateSetting.mockResolvedValue(undefined);

      render(
        <CurrencyProvider>
          <TestCurrencyConsumer />
        </CurrencyProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('currency-code')).toHaveTextContent('IDR');
      });

      await act(async () => {
        screen.getByText('Set Legacy Dollar').click();
      });

      expect(screen.getByTestId('currency-code')).toHaveTextContent('USD');
      expect(screen.getByTestId('currency-symbol')).toHaveTextContent('$');
      expect(updateSetting).toHaveBeenCalledWith('currency', 'USD');
    });
  });

  describe('Helper functions', () => {
    test('normalizeCurrencyCode handles codes, symbols, and fallbacks', () => {
      expect(normalizeCurrencyCode('IDR')).toBe('IDR');
      expect(normalizeCurrencyCode('idr')).toBe('IDR');
      expect(normalizeCurrencyCode('USD')).toBe('USD');
      expect(normalizeCurrencyCode('$')).toBe('USD');
      expect(normalizeCurrencyCode('€')).toBe('EUR');
      expect(normalizeCurrencyCode('¥')).toBe('CNY');
      expect(normalizeCurrencyCode('Rp')).toBe('IDR');
      expect(normalizeCurrencyCode('')).toBe('USD');
      expect(normalizeCurrencyCode(null)).toBe('USD');
      expect(normalizeCurrencyCode('UNKNOWN')).toBe('USD');
    });

    test('getCurrencySymbol returns proper symbols for all supported currencies', () => {
      expect(getCurrencySymbol('IDR')).toBe('Rp');
      expect(getCurrencySymbol('USD')).toBe('$');
      expect(getCurrencySymbol('EUR')).toBe('€');
      expect(getCurrencySymbol('CNY')).toBe('¥');
    });

    test('getCurrencyConfig returns full configuration', () => {
      expect(getCurrencyConfig('IDR')).toEqual(expect.objectContaining({
        code: 'IDR',
        symbol: 'Rp',
        locale: 'id-ID',
        fractionDigits: 0,
        nameKey: 'idr'
      }));
    });

    test('getSupportedCurrencies returns all 4 supported currencies', () => {
      const supportedCurrenciesList = getSupportedCurrencies();
      expect(supportedCurrenciesList).toHaveLength(4);
    });
  });
});
