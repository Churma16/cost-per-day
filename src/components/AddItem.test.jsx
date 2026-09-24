import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import AddItem from './AddItem';
import { useLanguage } from '../contexts/LanguageContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { addItem, updateItem, getAllItems } from '../services/api';
import { useReplacementBenchmark } from '../hooks/useBenchmark';

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
        benchmarkFromPriorItem: 'Based on past item',
        benchmarkSelectPrompt: 'Select a past item to see how long this new purchase needs to last to match its value.',
        selectCompletedItem: 'Select a past item...',
        replacementBenchmark: 'Past Item Baseline',
        candidatePrice: 'New item price',
        category: 'Category',
        categoryOptional: 'Category (Optional)',
        enterCategory: 'e.g. Audio, Footwear, Tech',
        brand: 'Brand',
        brandOptional: 'Brand (Optional)',
        enterBrand: 'e.g. Sony, Nike, Apple',
        useBenchmarkAsTarget: 'Set as Ownership Target',
        benchmarkResultDays: `~${options?.days} days`,
        benchmarkResultRequiredDuration: `To match your previous item's value (${options?.rate}/day):`,
        requiredSection: 'REQUIRED',
        optionalDetailsSection: 'OPTIONAL DETAILS',
        setManually: 'Set manually',
        fromCompletedItem: 'Based on past item',
        ownershipTargetSubheading: 'Choose one way to set a milestone for this item.',
        back: 'Back',
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

vi.mock('../hooks/useBenchmark', () => ({
  useReplacementBenchmark: vi.fn().mockReturnValue({
    data: null,
    isLoading: false,
    error: null,
  })
}));

vi.mock('../hooks/useDurabilityAnalytics', () => ({
  useCategories: vi.fn().mockReturnValue({
    data: [{ id: 1, name: 'Audio' }, { id: 2, name: 'Footwear' }],
  }),
  useBrands: vi.fn().mockReturnValue({
    data: [{ id: 1, name: 'Sony' }, { id: 2, name: 'Nike' }],
  }),
  useInvalidateDurability: vi.fn().mockReturnValue(vi.fn().mockResolvedValue()),
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
      name: /\d{1,2}\s+[A-Za-z]+\s+\d{4}/i
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
      name: /\d{1,2}\s+[A-Za-z]+\s+\d{4}/i
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

  test('allows explicit selection of completed item to benchmark and applies result as duration target', async () => {
    useLanguage.mockReturnValue({ language: 'en' });
    const completedPhone = {
      id: 'old-phone-1',
      name: 'Old Phone',
      price: 200,
      purchaseDate: '2025-01-01T12:00:00Z',
      status: 'retired',
      grossCostPerDay: 2.0,
      netCostPerDay: 2.0,
      ownershipDays: 100
    };
    getAllItems.mockResolvedValueOnce([completedPhone]);
    useReplacementBenchmark.mockReturnValue({
      data: {
        itemId: 'old-phone-1',
        itemName: 'Old Phone',
        itemStatus: 'retired',
        previousPrice: 200,
        finalOwnershipDays: 100,
        finalCostPerDay: 2.0,
        candidatePrice: 300,
        daysToMatchPrevious: 150,
        daysToBeatPrevious: 151,
        hasTarget: false
      },
      isLoading: false,
      error: null
    });

    render(
      <MemoryRouter initialEntries={['/add']}>
        <AddItem />
      </MemoryRouter>
    );

    // Enter new item details
    fireEvent.change(screen.getByPlaceholderText('Enter item name'), {
      target: { value: 'New Phone' }
    });
    fireEvent.change(screen.getByPlaceholderText('Enter price'), {
      target: { value: '300' }
    });

    // Switch to benchmark tab
    fireEvent.click(screen.getByRole('button', { name: 'Based on past item' }));

    // The benchmark button should initially be disabled until a completed item is explicitly selected
    const benchmarkButton = await screen.findByRole('button', { name: /Past Item Baseline/i });
    expect(benchmarkButton).toBeDisabled();

    // Select the completed item from the dropdown
    const selectDropdown = screen.getByLabelText('Based on past item');
    fireEvent.change(selectDropdown, { target: { value: 'old-phone-1' } });

    expect(benchmarkButton).toBeEnabled();

    // Click to open modal
    fireEvent.click(benchmarkButton);

    // Modal opens, showing the calculation
    expect(screen.getByText('~150 days')).toBeInTheDocument();

    // Click Apply to Target
    const applyButton = screen.getByRole('button', { name: 'Set as Ownership Target' });
    fireEvent.click(applyButton);

    // Target type should now be 'duration' and value '150'
    const targetTypeSelect = screen.getByLabelText('Target type');
    expect(targetTypeSelect.value).toBe('duration');

    const targetValueInput = screen.getByPlaceholderText('Enter target duration in days');
    expect(targetValueInput.value).toBe('150');
  });

  test('synchronizes candidate price from modal and saves matching price and target duration', async () => {
    addItem.mockResolvedValue({ id: 'new-phone-2' });
    getAllItems.mockResolvedValue([
      {
        id: 'old-phone-2',
        name: 'Old Phone 2',
        price: 200,
        purchaseDate: '2025-01-01T12:00:00Z',
        status: 'retired',
        ownershipDays: 100,
        grossCostPerDay: 2.0,
        netCostPerDay: 2.0
      }
    ]);

    useReplacementBenchmark.mockReturnValue({
      data: {
        itemId: 'old-phone-2',
        itemName: 'Old Phone 2',
        itemStatus: 'retired',
        previousPrice: 200,
        finalOwnershipDays: 100,
        finalCostPerDay: 2.0,
        candidatePrice: 500,
        daysToMatchPrevious: 250,
        daysToBeatPrevious: 251,
        hasTarget: false
      },
      isLoading: false,
      error: null
    });

    render(
      <MemoryRouter initialEntries={['/add']}>
        <AddItem />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('Enter item name'), {
      target: { value: 'New Phone 2' }
    });
    const priceInput = screen.getByPlaceholderText('Enter price');
    fireEvent.change(priceInput, {
      target: { value: '300' }
    });

    // Switch to benchmark tab
    fireEvent.click(screen.getByRole('button', { name: 'Based on past item' }));

    const benchmarkButton = await screen.findByRole('button', { name: /Past Item Baseline/i });
    const selectDropdown = screen.getByLabelText('Based on past item');
    fireEvent.change(selectDropdown, { target: { value: 'old-phone-2' } });

    fireEvent.click(benchmarkButton);

    const modalPriceInput = screen.getByLabelText('New item price');
    fireEvent.change(modalPriceInput, { target: { value: '500' } });

    expect(priceInput.value).toBe('500');

    const applyButton = screen.getByRole('button', { name: 'Set as Ownership Target' });
    fireEvent.click(applyButton);

    expect(priceInput.value).toBe('500');
    expect(screen.getByLabelText('Target type').value).toBe('duration');
    expect(screen.getByPlaceholderText('Enter target duration in days').value).toBe('250');

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(addItem).toHaveBeenCalledWith(expect.objectContaining({
        name: 'New Phone 2',
        price: 500,
        targetType: 'duration',
        targetValue: 250
      }));
    });
  });

  test('submits optional category and brand when creating an item', async () => {
    useLanguage.mockReturnValue({ language: 'en' });
    render(
      <MemoryRouter initialEntries={['/add']}>
        <AddItem />
      </MemoryRouter>
    );

    const nameInput = screen.getByPlaceholderText('Enter item name');
    const priceInput = screen.getByPlaceholderText('Enter price');
    const categoryInput = screen.getByPlaceholderText('e.g. Audio, Footwear, Tech');
    const brandInput = screen.getByPlaceholderText('e.g. Sony, Nike, Apple');
    const saveButton = screen.getByRole('button', { name: 'Save' });

    fireEvent.change(nameInput, { target: { value: 'Sony WH-1000XM4' } });
    fireEvent.change(priceInput, { target: { value: '350' } });
    fireEvent.change(categoryInput, { target: { value: 'Audio' } });
    fireEvent.change(brandInput, { target: { value: 'Sony' } });

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(addItem).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Sony WH-1000XM4',
        price: 350,
        category: 'Audio',
        brand: 'Sony',
      }));
    });
  });

  test('renders clear back affordance and marks required fields with red asterisks', () => {
    useLanguage.mockReturnValue({ language: 'en' });
    render(
      <MemoryRouter initialEntries={['/add']}>
        <AddItem />
      </MemoryRouter>
    );

    // Back button
    const backButton = screen.getByRole('button', { name: 'Back' });
    expect(backButton).toBeInTheDocument();

    // Required fields: Item name, Price, Purchase date
    const requiredCard = screen.getByText('REQUIRED').closest('.bg-white');
    expect(requiredCard).toBeInTheDocument();

    const nameLabel = screen.getByText('Item Name');
    expect(nameLabel.parentElement).toHaveTextContent('*');

    const priceLabel = screen.getByText('Price');
    expect(priceLabel.parentElement).toHaveTextContent('*');

    const dateLabel = screen.getByText('Purchase Date');
    expect(dateLabel.parentElement).toHaveTextContent('*');
  });

  test('toggles between Set manually and From completed item in ownership target card', async () => {
    useLanguage.mockReturnValue({ language: 'en' });
    getAllItems.mockResolvedValue([
      {
        id: 'comp-1',
        name: 'Past Shoes',
        status: 'retired',
        grossCostPerDay: 1.0,
        ownershipDays: 100
      }
    ]);

    render(
      <MemoryRouter initialEntries={['/add']}>
        <AddItem />
      </MemoryRouter>
    );

    // Initial mode is manual
    const setManuallyButton = screen.getByRole('button', { name: 'Set manually' });
    const fromCompletedItemButton = screen.getByRole('button', { name: 'Based on past item' });
    expect(setManuallyButton).toHaveClass('border-teal-600');
    expect(screen.getByLabelText('Target type')).toBeInTheDocument();

    // Switch to benchmark tab
    fireEvent.click(fromCompletedItemButton);
    expect(fromCompletedItemButton).toHaveClass('border-teal-600');
    expect(await screen.findByLabelText('Based on past item')).toBeInTheDocument();

    // Switch back to manual tab
    fireEvent.click(setManuallyButton);
    expect(setManuallyButton).toHaveClass('border-teal-600');
    expect(screen.getByLabelText('Target type')).toBeInTheDocument();
  });
});

