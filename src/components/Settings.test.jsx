import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import Settings from './Settings';
import { useLanguage } from '../contexts/LanguageContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useValueEquivalents } from '../contexts/ValueEquivalentsContext';
import { useAuth } from '../contexts/AuthContext';
import { getSupportedCurrencies } from '../utils/currencyConfig';
import { replaceAllItems } from '../services/api';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (translationKey, options) => {
      const translationDictionary = {
        settings: 'Settings',
        general: 'General',
        loading: 'Loading...',
        language: 'Language',
        currency: 'Currency',
        selectLanguage: 'Select Language',
        selectCurrency: 'Select Currency',
        data: 'Data',
        dataManagement: 'Data Management',
        exportData: 'Export Data',
        exportDataSubtitle: 'Save as .json file',
        importData: 'Import Data',
        importDataSubtitle: 'Restore from backup file',
        account: 'Account',
        signOut: 'Sign out',
        signOutError: 'Sign out failed. Please try again.',
        version: 'Version',
        versionText: options?.version ? `Version ${options.version}` : 'Version 0.1.0',
        usd: 'US Dollar (USD)',
        eur: 'Euro (EUR)',
        cny: 'Chinese Yuan (CNY)',
        idr: 'Indonesian Rupiah (IDR)',
        valueEquivalents: 'Personalized Value Equivalents',
        valueEquivalentsDescription: 'Compare item cost per day to everyday goods',
        valueEquivalentsSubtitle: 'Translate daily costs into familiar everyday references.',
        add: 'Add',
        addEquivalent: 'Add Equivalent',
        editEquivalent: 'Edit Equivalent',
        deleteEquivalent: 'Delete Equivalent',
        equivalentName: 'Benchmark Name',
        enterEquivalentName: 'e.g. Gorengan, Coffee',
        equivalentAmount: 'Benchmark Cost',
        enterEquivalentAmount: 'e.g. 2500',
        noEquivalents: 'No personalized value equivalents added yet.',
        confirmDeleteEquivalent: 'Are you sure you want to delete this value equivalent?',
        errorLoadingEquivalents: 'Failed to load value equivalents',
        cancel: 'Cancel',
        save: 'Save',
        delete: 'Delete'
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

vi.mock('../contexts/ValueEquivalentsContext', () => ({
  useValueEquivalents: vi.fn()
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('../services/api', () => ({
  getAllItems: vi.fn(),
  replaceAllItems: vi.fn()
}));

describe('Settings component', () => {
  const mockChangeCurrency = vi.fn();
  const mockChangeLanguage = vi.fn();
  const mockAddEquivalent = vi.fn();
  const mockEditEquivalent = vi.fn();
  const mockRemoveEquivalent = vi.fn();
  const mockSignOut = vi.fn();

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
    useValueEquivalents.mockReturnValue({
      valueEquivalents: [],
      addEquivalent: mockAddEquivalent,
      editEquivalent: mockEditEquivalent,
      removeEquivalent: mockRemoveEquivalent,
      isLoading: false,
      error: null
    });
    useAuth.mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com' },
      signOut: mockSignOut,
      error: null
    });
  });

  test('renders grouped intent-based sections with consequence subtext', () => {
    render(<Settings />);

    // Section headers
    expect(screen.getByRole('heading', { name: 'General', level: 2 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Personalized Value Equivalents', level: 2 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Data', level: 2 })).toBeInTheDocument();

    // Consequence subtexts
    expect(screen.getByText('Translate daily costs into familiar everyday references.')).toBeInTheDocument();
    expect(screen.getByText('Save as .json file')).toBeInTheDocument();
    expect(screen.getByText('Restore from backup file')).toBeInTheDocument();

    // Relocated Sign out action
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();

    // Version text
    expect(screen.getByText('Version 0.1.0')).toBeInTheDocument();
  });

  test('renders currency selector with options dynamically generated from canonical config', () => {
    render(<Settings />);

    const supportedCurrenciesList = getSupportedCurrencies();
    expect(supportedCurrenciesList.length).toBeGreaterThan(0);

    // Open currency dropdown
    const currencyDropdownTriggerButton = screen.getByRole('button', {
      name: /currency.*us dollar/i
    });
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

  test('offers Bahasa Indonesia and selects it while excluding deprioritized languages (fr, zh)', async () => {
    render(<Settings />);

    const languageDropdownTriggerButton = screen.getByRole('button', {
      name: /language.*english/i
    });
    fireEvent.click(languageDropdownTriggerButton);

    // fr and zh must not be available for selection
    expect(screen.queryByRole('button', { name: /Français/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /中文/i })).not.toBeInTheDocument();

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

    const currencyDropdownTriggerButton = screen.getByRole('button', {
      name: /currency.*us dollar/i
    });
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
      fireEvent.click(screen.getByRole('button', { name: /currency.*us dollar/i }));
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

  test('calls signOut when the relocated sign out button is clicked', async () => {
    render(<Settings />);

    const signOutButton = screen.getByRole('button', { name: 'Sign out' });
    fireEvent.click(signOutButton);

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  test('displays sign out error message when sign out fails', async () => {
    mockSignOut.mockRejectedValueOnce(new Error('Network error signing out'));

    render(<Settings />);

    const signOutButton = screen.getByRole('button', { name: 'Sign out' });
    fireEvent.click(signOutButton);

    expect(await screen.findByRole('alert')).toHaveTextContent('Network error signing out');
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

  test('renders empty state message when no value equivalents are saved', () => {
    render(<Settings />);

    expect(screen.getByText('Personalized Value Equivalents')).toBeInTheDocument();
    expect(screen.getByText('No personalized value equivalents added yet.')).toBeInTheDocument();
  });

  test('renders list of value equivalents with their details', () => {
    useValueEquivalents.mockReturnValue({
      valueEquivalents: [
        { id: 'eq-1', name: 'Gorengan', amount: 2500, currencyCode: 'IDR' },
        { id: 'eq-2', name: 'Coffee', amount: 15000, currencyCode: 'IDR' }
      ],
      addEquivalent: mockAddEquivalent,
      editEquivalent: mockEditEquivalent,
      removeEquivalent: mockRemoveEquivalent,
      isLoading: false,
      error: null
    });

    render(<Settings />);

    expect(screen.getByText('Gorengan')).toBeInTheDocument();
    expect(screen.getByText('Coffee')).toBeInTheDocument();
    expect(screen.getByText(/2.500/)).toBeInTheDocument();
    expect(screen.getByText(/15.000/)).toBeInTheDocument();
  });

  test('opens add modal and calls addEquivalent with form data on submit', async () => {
    mockAddEquivalent.mockResolvedValueOnce({
      id: 'eq-new',
      name: 'Boba Tea',
      amount: 25000,
      currencyCode: 'IDR'
    });

    render(<Settings />);

    const openAddModalButton = screen.getByRole('button', { name: /Add Equivalent/i });
    fireEvent.click(openAddModalButton);

    expect(screen.getByPlaceholderText('e.g. Gorengan, Coffee')).toBeInTheDocument();

    const nameInputElement = screen.getByPlaceholderText('e.g. Gorengan, Coffee');
    const amountInputElement = screen.getByPlaceholderText('e.g. 2500');

    fireEvent.change(nameInputElement, { target: { value: 'Boba Tea' } });
    fireEvent.change(amountInputElement, { target: { value: '25000' } });

    const submitSaveButton = screen.getByRole('button', { name: /^Save$/i });
    fireEvent.click(submitSaveButton);

    await waitFor(() => {
      expect(mockAddEquivalent).toHaveBeenCalledWith({
        name: 'Boba Tea',
        amount: 25000,
        currencyCode: 'USD'
      });
    });
  });

  test('opens edit modal with existing values and calls editEquivalent on submit', async () => {
    useValueEquivalents.mockReturnValue({
      valueEquivalents: [
        { id: 'eq-1', name: 'Gorengan', amount: 2500, currencyCode: 'IDR' }
      ],
      addEquivalent: mockAddEquivalent,
      editEquivalent: mockEditEquivalent,
      removeEquivalent: mockRemoveEquivalent,
      isLoading: false,
      error: null
    });

    mockEditEquivalent.mockResolvedValueOnce({
      id: 'eq-1',
      name: 'Bakwan',
      amount: 3000,
      currencyCode: 'IDR'
    });

    render(<Settings />);

    const editButtonElement = screen.getByLabelText('Edit Equivalent Gorengan');
    fireEvent.click(editButtonElement);

    const nameInputElement = screen.getByPlaceholderText('e.g. Gorengan, Coffee');
    const amountInputElement = screen.getByPlaceholderText('e.g. 2500');

    expect(nameInputElement.value).toBe('Gorengan');
    expect(amountInputElement.value).toBe('2500');

    fireEvent.change(nameInputElement, { target: { value: 'Bakwan' } });
    fireEvent.change(amountInputElement, { target: { value: '3000' } });

    const submitSaveButton = screen.getByRole('button', { name: /^Save$/i });
    fireEvent.click(submitSaveButton);

    await waitFor(() => {
      expect(mockEditEquivalent).toHaveBeenCalledWith('eq-1', {
        name: 'Bakwan',
        amount: 3000,
        currencyCode: 'IDR'
      });
    });
  });

  test('opens delete confirmation dialog and calls removeEquivalent on confirmation', async () => {
    useValueEquivalents.mockReturnValue({
      valueEquivalents: [
        { id: 'eq-1', name: 'Gorengan', amount: 2500, currencyCode: 'IDR' }
      ],
      addEquivalent: mockAddEquivalent,
      editEquivalent: mockEditEquivalent,
      removeEquivalent: mockRemoveEquivalent,
      isLoading: false,
      error: null
    });

    mockRemoveEquivalent.mockResolvedValueOnce();

    render(<Settings />);

    const deleteButtonElement = screen.getByLabelText('Delete Equivalent Gorengan');
    fireEvent.click(deleteButtonElement);

    expect(screen.getByText('Are you sure you want to delete this value equivalent?')).toBeInTheDocument();

    const confirmDeleteButton = screen.getByRole('button', { name: /^Delete$/i });
    fireEvent.click(confirmDeleteButton);

    await waitFor(() => {
      expect(mockRemoveEquivalent).toHaveBeenCalledWith('eq-1');
    });
  });

  test('renders error alert when loading value equivalents fails instead of empty state', () => {
    useValueEquivalents.mockReturnValue({
      valueEquivalents: [],
      isLoading: false,
      error: new Error('Network error loading equivalents'),
      addEquivalent: mockAddEquivalent,
      editEquivalent: mockEditEquivalent,
      removeEquivalent: mockRemoveEquivalent
    });

    render(<Settings />);

    expect(screen.getByRole('alert')).toHaveTextContent('Network error loading equivalents');
    expect(screen.queryByText('No personalized value equivalents added yet.')).not.toBeInTheDocument();
  });

  test('renders loading indicator while value equivalents are loading instead of empty state', () => {
    useValueEquivalents.mockReturnValue({
      valueEquivalents: [],
      isLoading: true,
      error: null,
      addEquivalent: mockAddEquivalent,
      editEquivalent: mockEditEquivalent,
      removeEquivalent: mockRemoveEquivalent
    });

    render(<Settings />);

    expect(screen.getAllByText('Loading...').length).toBeGreaterThan(0);
    expect(screen.queryByText('No personalized value equivalents added yet.')).not.toBeInTheDocument();
  });
});
