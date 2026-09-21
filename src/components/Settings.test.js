import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Settings from './Settings';
import { useLanguage } from '../contexts/LanguageContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { getSupportedCurrencies } from '../utils/currencyConfig';

jest.mock('react-i18next', () => ({
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

jest.mock('../contexts/LanguageContext', () => ({
  useLanguage: jest.fn()
}));

jest.mock('../contexts/CurrencyContext', () => ({
  useCurrency: jest.fn()
}));

jest.mock('../services/db', () => ({
  getAllItems: jest.fn(),
  deleteAllItems: jest.fn(),
  addItem: jest.fn()
}));

describe('Settings component', () => {
  const mockChangeCurrency = jest.fn();
  const mockChangeLanguage = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
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
});
