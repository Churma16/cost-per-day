import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import Settings from './Settings';
import { useLanguage } from '../contexts/LanguageContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { getSupportedCurrencies } from '../utils/currencyConfig';
import { replaceAllItems } from '../services/api';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (translationKey) => {
      const translationDictionary = {
        settings: 'Settings',
        language: 'Language',
        currency: 'Currency',
        selectLanguage: 'Select Language',
        selectCurrency: 'Select Currency',
        dataManagement: 'Data Management',
        exportData: 'Export Data',
        importData: 'Import Data',
        version: 'Version',
        usd: 'US Dollar (USD)',
        eur: 'Euro (EUR)',
        cny: 'Chinese Yuan (CNY)',
        idr: 'Indonesian Rupiah (IDR)',
      };
      return translationDictionary[translationKey] || translationKey;
    }
  })
}));

vi.mock('../contexts/LanguageContext', () => ({
  useLanguage: vi.fn()
}));

vi.mock('../contexts/CurrencyContext', () => ({
  useCurrency: vi.fn()
}));

vi.mock('../services/api', () => ({
  getAllItems: vi.fn(),
  replaceAllItems: vi.fn()
}));

describe('Settings component', () => {
  const mockChangeCurrency = vi.fn();
  const mockChangeLanguage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    replaceAllItems.mockReset();
    replaceAllItems.mockResolvedValue([]);
    useLanguage.mockReturnValue({
      language: 'en',
      changeLanguage: mockChangeLanguage
    });
    useCurrency.mockReturnValue({
      currencyCode: 'USD',
      changeCurrency: mockChangeCurrency
    });
  });

  test('renders currency selector with options dynamically generated from canonical config', () => {
    render(<Settings />);

    const supportedCurrenciesList = getSupportedCurrencies();
    expect(supportedCurrenciesList.length).toBeGreaterThan(0);

    // Open currency dropdown
    const currencyDropdownTriggerButton = screen.getByText(/\$ US Dollar \(USD\)/i);
    expect(currencyDropdownTriggerButton).toBeInTheDocument();

    fireEvent.click(currencyDropdownTriggerButton);

    // Verify all canonical currency options are rendered in the dropdown
    supportedCurrenciesList.forEach((currencyConfiguration) => {
      const currencyOptionElements = screen.getAllByRole('button', {
        name: new RegExp(`${currencyConfiguration.symbol}`, 'i')
      });
      expect(currencyOptionElements.length).toBeGreaterThan(0);
    });
  });

  test('offers Bahasa Indonesia and selects it', async () => {
    render(<Settings />);

    const languageDropdownTriggerButton = screen.getByRole('button', {
      name: /English/i
    });
    fireEvent.click(languageDropdownTriggerButton);

    const indonesianLanguageOptionButton = screen.getByRole('button', {
      name: /Bahasa Indonesia/i
    });
    fireEvent.click(indonesianLanguageOptionButton);

    await waitFor(() => {
      expect(mockChangeLanguage).toHaveBeenCalledWith('id');
    });
  });

  test('calls changeCurrency when a currency option is clicked', () => {
    render(<Settings />);

    const currencyDropdownTriggerButton = screen.getByText(/\$ US Dollar \(USD\)/i);
    fireEvent.click(currencyDropdownTriggerButton);

    const indonesianRupiahOptionButton = screen.getByRole('button', {
      name: /Rp Indonesian Rupiah \(IDR\)/i
    });
    fireEvent.click(indonesianRupiahOptionButton);

    expect(mockChangeCurrency).toHaveBeenCalledWith('IDR');
  });

  test('clears a previous settings error after a successful retry', async () => {
    mockChangeCurrency
      .mockRejectedValueOnce(new Error('Failed to save currency.'))
      .mockResolvedValueOnce();

    render(<Settings />);

    const openCurrencyDropdown = () => {
      fireEvent.click(screen.getByText(/\$ US Dollar \(USD\)/i));
    };

    openCurrencyDropdown();
    fireEvent.click(screen.getByRole('button', {
      name: /Rp Indonesian Rupiah \(IDR\)/i
    }));

    expect(await screen.findByText('Failed to save currency.')).toBeInTheDocument();

    openCurrencyDropdown();
    fireEvent.click(screen.getByRole('button', {
      name: /Rp Indonesian Rupiah \(IDR\)/i
    }));

    await waitFor(() => {
      expect(screen.queryByText('Failed to save currency.')).not.toBeInTheDocument();
    });
  });

  test('surfaces the backend import error message', async () => {
    replaceAllItems.mockRejectedValueOnce(
      new Error('Import failed atomically. Existing server data is unchanged.')
    );

    const { container } = render(<Settings />);
    const fileInput = container.querySelector('input[type="file"]');
    const importFile = new File([
      JSON.stringify([{
        name: 'Imported',
        price: 200,
        purchaseDate: '2026-09-21T12:00:00Z'
      }])
    ], 'backup.json', { type: 'application/json' });

    fireEvent.change(fileInput, { target: { files: [importFile] } });

    const confirmButton = await screen.findByRole('button', { name: /confirm/i });
    fireEvent.click(confirmButton);

    expect(await screen.findByText(
      'Import failed atomically. Existing server data is unchanged.'
    )).toBeInTheDocument();
  });
});
