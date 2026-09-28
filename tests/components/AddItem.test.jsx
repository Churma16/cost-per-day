import React from 'react';
import { render as testingLibraryRender, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import AddItem from '../../src/components/AddItem';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { useCurrency } from '../../src/contexts/CurrencyContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { addItem, updateItem, getAllItems } from '../../src/services/api';
import { useReplacementBenchmark } from '../../src/hooks/useBenchmark';
import { queryKeys } from '../../src/query/queryConfig';
import {
  ADD_ITEM_DRAFT_WRITE_DELAY_MS,
  getAddItemDraftStorageKey,
  writeAddItemDraft,
} from '../../src/utils/addItemDraft';

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
        itemStatus: 'Ownership Journey',
        statusActive: 'Still With You',
        statusRetired: 'No Longer in Use',
        statusSold: 'Changed Hands',
        statusLost: 'Lost',
        ownershipEndDate: 'Ownership end date',
        salePrice: 'Sale price',
        enterSalePrice: 'Enter sale price',
        ownershipTargetOptional: 'Ownership Target (Optional)',
        ownershipGoalOptional: 'Ownership Goal (Optional)',
        ownershipGoalBy: 'Set this ownership goal by',
        targetType: 'Target type',
        targetTypeNone: 'None',
        targetTypeCostPerDayShort: 'Daily cost',
        targetTypeDurationShort: 'Duration',
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
        enterCategory: 'e.g. Audio',
        brand: 'Brand',
        brandOptional: 'Brand (Optional)',
        enterBrand: 'e.g. Sony',
        useBenchmarkAsTarget: 'Set as Ownership Target',
        benchmarkResultDays: `~${options?.days} days`,
        benchmarkResultRequiredDuration: `To match your previous item's value (${options?.rate}/day):`,
        requiredSection: 'REQUIRED',
        optionalDetailsSection: 'OPTIONAL DETAILS',
        setManually: 'Set manually',
        fromCompletedItem: 'Based on past item',
        ownershipTargetSubheading: 'Choose one way to set a milestone for this item.',
        back: 'Back',
        discardDraft: 'Discard draft',
        guestItemLimitReached: 'You\'ve reached the ' + options?.limit + '-item limit without an account.',
        itemSaveErrorTitle: 'Not saved yet.',
        itemSaveErrorBody: "Your entries are still here. Try again when you're ready.",
        itemDeleteErrorTitle: 'Not deleted yet.',
        itemDeleteErrorBody: 'This item and its history are still here.',
        editItemLoadErrorDescription: "Couldn't load this item. Check your connection and try again.",
        itemNotFoundTitle: 'This item is no longer here',
        itemNotFound: 'Item not found. It may have been deleted.',
        backToWorthwhile: 'Back to Worthwhile',
        tryAgain: 'Try again',
        refreshShowingSavedData: "Couldn't refresh just now. Showing your saved data.",
        stillLoadingItem: 'Still loading this item...',
        enterItemNameToContinue: 'Enter an item name to continue.',
        enterPriceToContinue: 'Enter a price to continue.',
        checkItemDetails: 'Check these details.',
        itemValidationErrorBody: 'Review the ownership details before saving.',
        notSavedYet: 'Not saved yet.',
        saving: 'Saving...',
        deleteThisItem: 'Delete this item?',
        deleteItemIrreversibleAccount: `${options?.name} and its ownership history will be permanently removed from Worthwhile. This can't be undone.`,
        deleteItemIrreversibleDevice: `${options?.name} and its ownership history will be permanently removed from this device. This can't be undone.`,
        keepIt: 'Keep it',
        delete: 'Delete',
      };
      return translationDictionary[translationKey] || translationKey;
    }
  })
}));

vi.mock('../../src/contexts/LanguageContext', () => ({
  useLanguage: vi.fn()
}));

vi.mock('../../src/contexts/CurrencyContext', () => ({
  useCurrency: vi.fn()
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('../../src/hooks/useBenchmark', () => ({
  useReplacementBenchmark: vi.fn().mockReturnValue({
    data: null,
    isLoading: false,
    error: null,
  })
}));

vi.mock('../../src/hooks/useDurabilityAnalytics', () => ({
  useCategories: vi.fn().mockReturnValue({
    data: [{ id: 1, name: 'Audio' }, { id: 2, name: 'Footwear' }],
  }),
  useBrands: vi.fn().mockReturnValue({
    data: [{ id: 1, name: 'Sony' }, { id: 2, name: 'Nike' }],
  }),
  useInvalidateDurability: vi.fn().mockReturnValue(vi.fn().mockResolvedValue()),
  invalidateDurabilityQuery: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/services/api', () => ({
  addItem: vi.fn(),
  updateItem: vi.fn(),
  getAllItems: vi.fn().mockResolvedValue([]),
  deleteItem: vi.fn()
}));

const render = (ui) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return testingLibraryRender(ui, {
    wrapper: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  });
};

const createDraftData = (overrides = {}) => ({
  name: 'Laptop',
  price: '1200',
  category: 'Tech',
  brand: 'Example',
  purchaseDate: '2026-09-20',
  targetType: 'none',
  targetValue: '',
  targetMode: 'manual',
  selectedBenchmarkItemId: '',
  ...overrides,
});

describe('AddItem component date localization', () => {
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    getAllItems.mockReset();
    getAllItems.mockResolvedValue([]);
    useCurrency.mockReturnValue({
      currencySymbol: 'Rp',
      currencyCode: 'IDR'
    });
    useAuth.mockReturnValue({
      user: {
        id: 'user-1',
        email: 'user@example.com'
      }
    });
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
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

  test('validates required name and price on submit without clearing user input', () => {
    useLanguage.mockReturnValue({ language: 'en' });

    render(
      <MemoryRouter initialEntries={['/add']}>
        <AddItem />
      </MemoryRouter>
    );

    const nameInput = screen.getByPlaceholderText('Enter item name');
    const priceInput = screen.getByPlaceholderText('Enter price');
    fireEvent.change(nameInput, { target: { value: 'Keep this draft' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(priceInput).toHaveAttribute('aria-invalid', 'true');
    expect(priceInput).toHaveAttribute('aria-describedby', 'owned-item-price-error');
    expect(screen.getByText('Enter a price to continue.')).toBeInTheDocument();
    expect(nameInput).toHaveValue('Keep this draft');
    expect(priceInput).toHaveFocus();
    expect(addItem).not.toHaveBeenCalled();
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
        "Your entries are still here. Try again when you're ready."
      );
    });
    expect(screen.queryByText(/Unable to reach the server/i)).not.toBeInTheDocument();
  });

  test('renders the localized guest item limit prompt from structured error metadata', async () => {
    useLanguage.mockReturnValue({
      language: 'en'
    });
    const limitError = Object.assign(new Error('Guest item limit reached'), {
      code: 'guest_item_limit',
      limit: 10,
    });
    addItem.mockRejectedValueOnce(limitError);

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
        "You've reached the 10-item limit without an account."
      );
    });
  });

  test('debounces temporary draft writes for user-entered add-item values', () => {
    vi.useFakeTimers();
    useLanguage.mockReturnValue({ language: 'en' });
    const storageKey = getAddItemDraftStorageKey('user-1');

    render(
      <MemoryRouter initialEntries={['/add']}>
        <AddItem />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('Enter item name'), {
      target: { value: 'Draft Laptop' }
    });

    expect(window.localStorage.getItem(storageKey)).toBeNull();

    act(() => {
      vi.advanceTimersByTime(ADD_ITEM_DRAFT_WRITE_DELAY_MS - 1);
    });
    expect(window.localStorage.getItem(storageKey)).toBeNull();

    act(() => {
      vi.advanceTimersByTime(1);
    });

    const storedDraft = JSON.parse(window.localStorage.getItem(storageKey));
    expect(storedDraft.data.name).toBe('Draft Laptop');
  });

  test('flushes the latest dirty draft when Add Item unmounts before the debounce finishes', () => {
    vi.useFakeTimers();
    useLanguage.mockReturnValue({ language: 'en' });
    const storageKey = getAddItemDraftStorageKey('user-1');

    const view = render(
      <MemoryRouter initialEntries={['/add']}>
        <AddItem />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('Enter item name'), {
      target: { value: 'Navigate-safe draft' }
    });
    expect(window.localStorage.getItem(storageKey)).toBeNull();

    view.unmount();

    const storedDraft = JSON.parse(window.localStorage.getItem(storageKey));
    expect(storedDraft.data.name).toBe('Navigate-safe draft');
  });

  test('restores a fresh draft after remount without refreshing its TTL', () => {
    useLanguage.mockReturnValue({ language: 'en' });
    const storageKey = getAddItemDraftStorageKey('user-1');
    const savedAt = Date.now() - 60_000;
    writeAddItemDraft(
      'user-1',
      createDraftData({
        name: 'Restored Laptop',
        price: '1500',
        category: 'Computers',
        brand: 'Framework',
        targetType: 'duration',
        targetValue: '730',
      }),
      savedAt
    );

    const firstRender = render(
      <MemoryRouter initialEntries={['/add']}>
        <AddItem />
      </MemoryRouter>
    );

    expect(screen.getByDisplayValue('Restored Laptop')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter price')).toHaveValue('1.500');
    expect(screen.getByDisplayValue('Computers')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Framework')).toBeInTheDocument();
    expect(screen.getByDisplayValue('730')).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(storageKey)).savedAt).toBe(savedAt);

    firstRender.unmount();

    render(
      <MemoryRouter initialEntries={['/add']}>
        <AddItem />
      </MemoryRouter>
    );

    expect(screen.getByDisplayValue('Restored Laptop')).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(storageKey)).savedAt).toBe(savedAt);
  });

  test('does not restore another authenticated user draft', () => {
    useLanguage.mockReturnValue({ language: 'en' });
    writeAddItemDraft('user-1', createDraftData({ name: 'Private draft' }));
    useAuth.mockReturnValue({
      user: {
        id: 'user-2',
        email: 'other@example.com'
      }
    });

    render(
      <MemoryRouter initialEntries={['/add']}>
        <AddItem />
      </MemoryRouter>
    );

    expect(screen.getByPlaceholderText('Enter item name')).toHaveValue('');
    expect(screen.queryByDisplayValue('Private draft')).not.toBeInTheDocument();
  });

  test('clears the draft after successful item creation', async () => {
    useLanguage.mockReturnValue({ language: 'en' });
    const storageKey = getAddItemDraftStorageKey('user-1');
    writeAddItemDraft('user-1', createDraftData());
    addItem.mockResolvedValueOnce({
      id: 'created-item',
      name: 'Laptop',
      price: 1200,
      purchaseDate: '2026-09-20T12:00:00.000Z',
    });

    render(
      <MemoryRouter initialEntries={['/add']}>
        <AddItem />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(addItem).toHaveBeenCalled();
      expect(window.localStorage.getItem(storageKey)).toBeNull();
    });
  });

  test('preserves the draft when item creation fails', async () => {
    useLanguage.mockReturnValue({ language: 'en' });
    const storageKey = getAddItemDraftStorageKey('user-1');
    writeAddItemDraft('user-1', createDraftData());
    addItem.mockRejectedValueOnce(new Error('Temporary save failure'));

    render(
      <MemoryRouter initialEntries={['/add']}>
        <AddItem />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent("Your entries are still here. Try again when you're ready.");
    });
    expect(window.localStorage.getItem(storageKey)).not.toBeNull();
  });

  test('explicitly discarding the add-item draft clears storage and resets the form', () => {
    useLanguage.mockReturnValue({ language: 'en' });
    const storageKey = getAddItemDraftStorageKey('user-1');
    writeAddItemDraft(
      'user-1',
      createDraftData({
        name: 'Discard me',
        price: '450',
        category: 'Audio',
        brand: 'Sony',
      })
    );

    render(
      <MemoryRouter initialEntries={['/add']}>
        <AddItem />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Discard draft' }));

    expect(window.localStorage.getItem(storageKey)).toBeNull();
    expect(screen.getByPlaceholderText('Enter item name')).toHaveValue('');
    expect(screen.getByPlaceholderText('Enter price')).toHaveValue('');
    expect(screen.getByPlaceholderText('e.g. Audio')).toHaveValue('');
    expect(screen.getByPlaceholderText('e.g. Sony')).toHaveValue('');
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

    const lifecycleSelect = screen.getByLabelText('Ownership Journey');
    expect(within(lifecycleSelect).getByRole('option', { name: 'Still With You' })).toHaveValue('active');
    expect(within(lifecycleSelect).getByRole('option', { name: 'No Longer in Use' })).toHaveValue('retired');
    expect(within(lifecycleSelect).getByRole('option', { name: 'Changed Hands' })).toHaveValue('sold');
    expect(within(lifecycleSelect).getByRole('option', { name: 'Lost' })).toHaveValue('lost');

    fireEvent.change(lifecycleSelect, {
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

    fireEvent.change(screen.getByLabelText('Ownership Journey'), {
      target: { value: 'retired' }
    });

    const endDateInput = screen.getByLabelText('Ownership end date');
    expect(endDateInput).toHaveAttribute('max', new Date().toISOString().split('T')[0]);

    fireEvent.change(endDateInput, {
      target: { value: '2999-01-01' }
    });

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  test('delays edit loading feedback, then shows skeleton and slow-load status', () => {
    vi.useFakeTimers();
    useLanguage.mockReturnValue({ language: 'en' });
    getAllItems.mockReturnValue(new Promise(() => {}));

    const { container } = render(
      <MemoryRouter initialEntries={['/edit?id=42']}>
        <AddItem />
      </MemoryRouter>
    );

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(container.querySelector('.state-skeleton')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(container.querySelectorAll('.state-skeleton').length).toBeGreaterThan(0);

    act(() => {
      vi.advanceTimersByTime(1800);
    });
    expect(screen.getByRole('status')).toHaveTextContent('Still loading this item...');
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  test('shows a dedicated item-not-found state instead of an empty edit form', async () => {
    useLanguage.mockReturnValue({ language: 'en' });
    getAllItems.mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={['/edit?id=missing']}>
        <AddItem />
      </MemoryRouter>
    );

    expect(await screen.findByText('This item is no longer here')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
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

    const errorState = await screen.findByRole('status', {}, { timeout: 3000 });
    expect(errorState).toHaveTextContent("Couldn't load this item. Check your connection and try again.");
    expect(errorState).not.toHaveTextContent('Unable to load item.');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete Item' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
  });

  test('populates edit form from cached items when a background refresh fails', async () => {
    useLanguage.mockReturnValue({ language: 'en' });
    const cachedItem = {
      id: 'cached-edit-1',
      name: 'Cached Laptop',
      price: 1200,
      purchaseDate: '2026-09-01T12:00:00.000Z',
      status: 'active',
      category: 'Tech',
      brand: 'Example',
    };
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(queryKeys.items, [cachedItem], { updatedAt: 1 });
    getAllItems.mockRejectedValue(new Error('Temporary network failure'));

    testingLibraryRender(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/edit?id=cached-edit-1']}>
          <AddItem />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByDisplayValue('Cached Laptop')).toBeInTheDocument();
    expect(await screen.findByText("Couldn't refresh just now. Showing your saved data.", {}, { timeout: 3500 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    expect(screen.queryByText('Temporary network failure')).not.toBeInTheDocument();
  });

  test('creates a new item with ownership target configured', async () => {
    useLanguage.mockReturnValue({ language: 'en' });
    useCurrency.mockReturnValue({
      currencySymbol: '$',
      currencyCode: 'USD'
    });
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

    fireEvent.click(screen.getByRole('button', { name: 'Daily cost' }));

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

  test('preserves ownership-goal drafts in both directions and submits only the active strategy', async () => {
    addItem.mockResolvedValueOnce({ id: 'goal-drafts' });
    render(
      <MemoryRouter initialEntries={['/add']}>
        <AddItem />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('Enter item name'), { target: { value: 'Office Chair' } });
    fireEvent.change(screen.getByPlaceholderText('Enter price'), { target: { value: '300' } });

    fireEvent.click(screen.getByRole('button', { name: 'Daily cost' }));
    fireEvent.change(screen.getByPlaceholderText('Enter target cost per day'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Duration' }));
    fireEvent.change(screen.getByPlaceholderText('Enter target duration in days'), { target: { value: '365' } });
    fireEvent.click(screen.getByRole('button', { name: 'Daily cost' }));
    expect(screen.getByPlaceholderText('Enter target cost per day')).toHaveValue('2');
    fireEvent.click(screen.getByRole('button', { name: 'Duration' }));
    expect(screen.getByPlaceholderText('Enter target duration in days')).toHaveValue(365);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(addItem).toHaveBeenCalledWith(expect.objectContaining({
        targetType: 'duration',
        targetValue: 365,
      }));
    });
  });

  test('disables Save while a create is pending to prevent duplicate submissions', async () => {
    useLanguage.mockReturnValue({ language: 'en' });
    let resolveCreate;
    addItem.mockImplementationOnce(() => new Promise((resolve) => {
      resolveCreate = resolve;
    }));

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

    const saveButton = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(saveButton);

    await waitFor(() => expect(saveButton).toBeDisabled());
    fireEvent.click(saveButton);
    expect(addItem).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveCreate({ id: 'pending-item' });
    });
  });

  test('does not expose or initialize the API-only replacement benchmark for guests', async () => {
    useLanguage.mockReturnValue({ language: 'en' });
    useAuth.mockReturnValue({ user: null, isGuest: true });
    getAllItems.mockResolvedValueOnce([{
      id: 'guest-item-completed',
      name: 'Completed guest phone',
      price: 500,
      purchaseDate: '2025-01-01T00:00:00Z',
      status: 'retired',
      grossCostPerDay: 1.37,
      ownershipDays: 365,
    }]);

    render(
      <MemoryRouter initialEntries={['/add']}>
        <AddItem />
      </MemoryRouter>
    );

    await waitFor(() => expect(getAllItems).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: 'Based on past item' }))
      .not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Target type' })).toBeInTheDocument();
    expect(useReplacementBenchmark).not.toHaveBeenCalled();
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

    expect(screen.getByRole('button', { name: 'Duration' })).toHaveAttribute('aria-pressed', 'true');

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
    expect(screen.getByRole('button', { name: 'Duration' })).toHaveAttribute('aria-pressed', 'true');

    const targetValueInput = screen.getByPlaceholderText('Enter target duration in days');
    expect(targetValueInput.value).toBe('150');
  });

  test('uses the main form price for the benchmark and does not duplicate its input in the modal', async () => {
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

    expect(screen.queryByLabelText('New item price')).not.toBeInTheDocument();
    expect(priceInput.value).toBe('300');

    const applyButton = screen.getByRole('button', { name: 'Set as Ownership Target' });
    fireEvent.click(applyButton);

    expect(priceInput.value).toBe('300');
    expect(screen.getByRole('button', { name: 'Duration' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByPlaceholderText('Enter target duration in days').value).toBe('150');

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(addItem).toHaveBeenCalledWith(expect.objectContaining({
        name: 'New Phone 2',
        price: 300,
        targetType: 'duration',
        targetValue: 150
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
    const categoryInput = screen.getByPlaceholderText('e.g. Audio');
    const brandInput = screen.getByPlaceholderText('e.g. Sony');
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
    const manualPanel = screen.getByTestId('manual-ownership-target-panel');
    const benchmarkPanel = screen.getByTestId('benchmark-ownership-target-panel');
    expect(setManuallyButton).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('group', { name: 'Target type' })).toBeInTheDocument();
    expect(screen.getByTestId('ownership-target-panels')).toHaveClass('overflow-hidden');
    expect(manualPanel).toHaveAttribute('aria-hidden', 'false');
    expect(benchmarkPanel).toHaveAttribute('aria-hidden', 'true');

    // Switch to benchmark tab
    fireEvent.click(fromCompletedItemButton);
    expect(fromCompletedItemButton).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByLabelText('Based on past item')).toBeInTheDocument();
    expect(manualPanel).toHaveAttribute('aria-hidden', 'true');
    expect(benchmarkPanel).toHaveAttribute('aria-hidden', 'false');

    // Switch back to manual tab
    fireEvent.click(setManuallyButton);
    expect(setManuallyButton).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('group', { name: 'Target type' })).toBeInTheDocument();
  });

  test('allows saving when manual target is incomplete but user switches to benchmark tab without applying', async () => {
    useLanguage.mockReturnValue({ language: 'en' });
    getAllItems.mockResolvedValue([]);
    addItem.mockResolvedValueOnce({ id: 'item-new' });

    render(
      <MemoryRouter initialEntries={['/add']}>
        <AddItem />
      </MemoryRouter>
    );

    // Fill valid required fields
    fireEvent.change(screen.getByPlaceholderText('Enter item name'), {
      target: { value: 'Bluetooth Speaker' }
    });
    fireEvent.change(screen.getByPlaceholderText('Enter price'), {
      target: { value: '80' }
    });

    // In manual mode, select Duration target but leave value empty
    fireEvent.click(screen.getByRole('button', { name: 'Duration' }));

    // Save should now be disabled because manual target value is required
    const saveButton = screen.getByRole('button', { name: 'Save' });
    expect(saveButton).toBeDisabled();

    // Switch to benchmark tab without applying any benchmark
    const fromCompletedItemButton = screen.getByRole('button', { name: 'Based on past item' });
    fireEvent.click(fromCompletedItemButton);

    // Save should now be enabled because hidden/unapplied target does not block form completion
    expect(saveButton).toBeEnabled();

    // Clicking Save submits item with targetType and targetValue null
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(addItem).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Bluetooth Speaker',
        price: 80,
        targetType: null,
        targetValue: null
      }));
    });
  });

  test('preserves existing ownership target on edit when user switches to benchmark mode without applying', async () => {
    useLanguage.mockReturnValue({ language: 'en' });
    const existingItemWithTarget = {
      id: 'item-edit-target',
      name: 'Mechanical Keyboard',
      price: 150,
      purchaseDate: '2026-09-01T12:00:00Z',
      status: 'active',
      targetType: 'duration',
      targetValue: 365,
      grossCostPerDay: 5
    };
    getAllItems
      .mockResolvedValueOnce([existingItemWithTarget])
      .mockResolvedValueOnce([existingItemWithTarget]);
    updateItem.mockResolvedValueOnce({ ...existingItemWithTarget });

    render(
      <MemoryRouter initialEntries={['/edit?id=item-edit-target']}>
        <AddItem />
      </MemoryRouter>
    );

    expect(await screen.findByDisplayValue('Mechanical Keyboard')).toBeInTheDocument();
    expect(screen.getByDisplayValue('365')).toBeInTheDocument();

    // Switch to benchmark tab to browse benchmarks
    const fromCompletedItemButton = screen.getByRole('button', { name: 'Based on past item' });
    fireEvent.click(fromCompletedItemButton);

    // Save should remain enabled
    const saveButton = screen.getByRole('button', { name: 'Save' });
    expect(saveButton).toBeEnabled();

    // Click Save without applying a benchmark
    fireEvent.click(saveButton);

    // Verify existing target is preserved rather than silently deleted
    await waitFor(() => {
      expect(updateItem).toHaveBeenCalledWith(
        'item-edit-target',
        expect.objectContaining({
          name: 'Mechanical Keyboard',
          price: 150,
          purchaseDate: '2026-09-01T12:00:00.000Z',
          targetType: 'duration',
          targetValue: 365
        })
      );
    });
  });
});


