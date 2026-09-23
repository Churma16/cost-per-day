import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import AddItem from './AddItem';
import { useLanguage } from '../contexts/LanguageContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { addItem, updateItem, getAllItems } from '../services/api';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (translationKey, options) => {
      if (translationKey === 'targetEquivalentDuration') {
        return `Equivalent duration: ~${options?.days} days`;
      }
      if (translationKey === 'targetEquivalentCostPerDay') {
        return `Equivalent cost per day: ${options?.amount}/day`;
      }
      const translationDictionary = {
        addNewItem: 'Add New Item',
        editItem: 'Edit Item',
        itemName: 'Item Name',
        enterItemName: 'Enter item name',
        price: 'Price',
        enterPrice: 'Enter price',
        date: 'Purchase Date',
        save: 'Save',
        deleteItem: 'Delete Item',
        itemStatus: 'Item status',
        statusActive: 'Active',
        statusRetired: 'Retired',
        statusSold: 'Sold',
        statusLost: 'Lost',
        ownershipEndDate: 'Ownership end date',
        salePrice: 'Sale price',
        enterSalePrice: 'Enter sale price',
        ownershipTargetOptional: 'Ownership Target (Optional)',
        targetType: 'Target type',
        targetTypeNone: 'None',
        targetTypeCostPerDay: 'Target cost per day',
        targetTypeDuration: 'Target duration (days)',
        enterTargetCostPerDay: 'Enter target cost per day',
        enterTargetDuration: 'Enter target duration in days',
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
  addItem: vi.fn(),
  updateItem: vi.fn(),
  getAllItems: vi.fn().mockResolvedValue([]),
  deleteItem: vi.fn()
}));

describe('AddItem component date localization', () => {
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useCurrency.mockReturnValue({
      currencySymbol: 'Rp',
      currencyCode: 'IDR'
    });
  });

  test('renders Indonesian month names in desktop date picker when language is set to id', () => {
    useLanguage.mockReturnValue({
      language: 'id'
    });

    render(
      <MemoryRouter initialEntries={['/add']}>
        <AddItem />
      </MemoryRouter>
    );

    // Desktop view by default in JSDOM (window.innerWidth > 768)
    // Find the date picker trigger button
    const datePickerTriggerButton = screen.getByRole('button', {
      name: /\d{4}-\d{2}-\d{2}/i
    });
    expect(datePickerTriggerButton).toBeInTheDocument();

    // Open desktop custom date picker
    fireEvent.click(datePickerTriggerButton);

    // Month dropdown should contain Indonesian month names such as 'Agustus' and 'Maret'
    const augustMonthOption = screen.getByRole('option', { name: 'Agustus' });
    const marchMonthOption = screen.getByRole('option', { name: 'Maret' });
    const januaryMonthOption = screen.getByRole('option', { name: 'Januari' });

    expect(augustMonthOption).toBeInTheDocument();
    expect(marchMonthOption).toBeInTheDocument();
    expect(januaryMonthOption).toBeInTheDocument();
  });

  test('shows a user-facing API error when saving fails', async () => {
    useLanguage.mockReturnValue({
      language: 'en'
    });
    addItem.mockRejectedValueOnce(new Error('Unable to reach the server. Check the backend connection and try again.'));

    render(
      <MemoryRouter initialEntries={['/add']}>
        <AddItem />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('Enter item name'), {
      target: { value: 'Laptop' }
    });
    fireEvent.change(screen.getByPlaceholderText('Enter price'), {
      target: { value: '1200' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Unable to reach the server. Check the backend connection and try again.'
      );
    });
  });

  test('renders English month names in desktop date picker when language is set to en', () => {
    useLanguage.mockReturnValue({
      language: 'en'
    });

    render(
      <MemoryRouter initialEntries={['/add']}>
        <AddItem />
      </MemoryRouter>
    );

    const datePickerTriggerButton = screen.getByRole('button', {
      name: /\d{4}-\d{2}-\d{2}/i
    });
    fireEvent.click(datePickerTriggerButton);

    const augustMonthOption = screen.getByRole('option', { name: 'August' });
    const marchMonthOption = screen.getByRole('option', { name: 'March' });
    const januaryMonthOption = screen.getByRole('option', { name: 'January' });

    expect(augustMonthOption).toBeInTheDocument();
    expect(marchMonthOption).toBeInTheDocument();
    expect(januaryMonthOption).toBeInTheDocument();
  });

  test('saves sold lifecycle facts from edit mode', async () => {
    useLanguage.mockReturnValue({
      language: 'en'
    });
    const phoneItem = {
      id: '42',
      name: 'Phone',
      price: 100,
      purchaseDate: '2026-09-01T12:00:00Z',
      status: 'active',
      grossCostPerDay: 5
    };
    // First call: completedItems loader effect; second call: loadItem edit-mode effect
    getAllItems.mockResolvedValueOnce([phoneItem]).mockResolvedValueOnce([phoneItem]);
    updateItem.mockResolvedValueOnce({});

    render(
      <MemoryRouter initialEntries={['/edit?id=42']}>
        <AddItem />
      </MemoryRouter>
    );

    expect(await screen.findByDisplayValue('Phone')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Item status'), {
      target: { value: 'sold' }
    });
    fireEvent.change(screen.getByLabelText('Ownership end date'), {
      target: { value: '2026-09-11' }
    });
    fireEvent.change(screen.getByPlaceholderText('Enter sale price'), {
      target: { value: '40' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(updateItem).toHaveBeenCalledWith('42', expect.objectContaining({
        status: 'sold',
        endedAt: '2026-09-11T12:00:00.000Z',
        salePrice: 40
      }));
    });
  });

  test('prevents future ownership end dates in edit mode', async () => {
    useLanguage.mockReturnValue({
      language: 'en'
    });
    const phoneItem = {
      id: '42',
      name: 'Phone',
      price: 100,
      purchaseDate: '2026-09-01T12:00:00Z',
      status: 'active',
      grossCostPerDay: 5
    };
    // First call: completedItems loader; second call: loadItem edit-mode effect
    getAllItems.mockResolvedValueOnce([phoneItem]).mockResolvedValueOnce([phoneItem]);

    render(
      <MemoryRouter initialEntries={['/edit?id=42']}>
        <AddItem />
      </MemoryRouter>
    );

    expect(await screen.findByDisplayValue('Phone')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Item status'), {
      target: { value: 'retired' }
    });

    const endDateInput = screen.getByLabelText('Ownership end date');
    expect(endDateInput).toHaveAttribute('max', new Date().toISOString().split('T')[0]);

    fireEvent.change(endDateInput, {
      target: { value: '2999-01-01' }
    });

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  test('does not expose delete when edit data fails to load', async () => {
    useLanguage.mockReturnValue({
      language: 'en'
    });
    // Use persistent rejection so both getAllItems calls (completedItems + loadItem) fail/reject
    getAllItems.mockRejectedValue(new Error('Unable to load item.'));

    render(
      <MemoryRouter initialEntries={['/edit?id=42']}>
        <AddItem />
      </MemoryRouter>
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load item.');
    expect(screen.queryByRole('button', { name: 'Delete Item' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  test('creates a new item with ownership target configured', async () => {
    useLanguage.mockReturnValue({ language: 'en' });
    addItem.mockResolvedValueOnce({ id: '100' });

    render(
      <MemoryRouter initialEntries={['/add']}>
        <AddItem />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('Enter item name'), {
      target: { value: 'Keyboard' }
    });
    fireEvent.change(screen.getByPlaceholderText('Enter price'), {
      target: { value: '150' }
    });

    const targetTypeSelect = screen.getByLabelText('Target type');
    fireEvent.change(targetTypeSelect, { target: { value: 'cost_per_day' } });

    const targetValueInput = screen.getByPlaceholderText('Enter target cost per day');
    fireEvent.change(targetValueInput, { target: { value: '1.5' } });

    expect(screen.getByText('Equivalent duration: ~100 days')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(addItem).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Keyboard',
        price: 150,
        targetType: 'cost_per_day',
        targetValue: 1.5
      }));
    });
  });

  test('populates and updates existing ownership target in edit mode', async () => {
    useLanguage.mockReturnValue({ language: 'en' });
    const monitorItem = {
      id: '50',
      name: 'Monitor',
      price: 365,
      purchaseDate: '2026-01-01T12:00:00Z',
      status: 'active',
      targetType: 'duration',
      targetValue: 365
    };
    // First call: completedItems loader; second call: loadItem edit-mode effect
    getAllItems.mockResolvedValueOnce([monitorItem]).mockResolvedValueOnce([monitorItem]);
    updateItem.mockResolvedValueOnce({});

    render(
      <MemoryRouter initialEntries={['/edit?id=50']}>
        <AddItem />
      </MemoryRouter>
    );

    expect(await screen.findByDisplayValue('Monitor')).toBeInTheDocument();

    const targetTypeSelect = screen.getByLabelText('Target type');
    expect(targetTypeSelect.value).toBe('duration');

    const targetValueInput = screen.getByPlaceholderText('Enter target duration in days');
    expect(targetValueInput.value).toBe('365');

    fireEvent.change(targetValueInput, { target: { value: '400' } });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(updateItem).toHaveBeenCalledWith('50', expect.objectContaining({
        targetType: 'duration',
        targetValue: 400
      }));
    });
  });
});

