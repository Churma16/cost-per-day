import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AddItem from './AddItem';
import { useLanguage } from '../contexts/LanguageContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { addItem, updateItem, getAllItems } from '../services/api';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (translationKey) => {
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

jest.mock('../services/api', () => ({
  addItem: jest.fn(),
  updateItem: jest.fn(),
  getAllItems: jest.fn().mockResolvedValue([]),
  deleteItem: jest.fn()
}));

describe('AddItem component date localization', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
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
    getAllItems.mockResolvedValueOnce([{
      id: '42',
      name: 'Phone',
      price: 100,
      purchaseDate: '2026-09-01T12:00:00Z',
      status: 'active',
      grossCostPerDay: 5
    }]);
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

  test('does not expose delete when edit data fails to load', async () => {
    useLanguage.mockReturnValue({
      language: 'en'
    });
    getAllItems.mockRejectedValueOnce(new Error('Unable to load item.'));

    render(
      <MemoryRouter initialEntries={['/edit?id=42']}>
        <AddItem />
      </MemoryRouter>
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load item.');
    expect(screen.queryByRole('button', { name: 'Delete Item' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });
});
