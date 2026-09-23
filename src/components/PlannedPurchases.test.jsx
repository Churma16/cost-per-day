import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PlannedPurchases from './PlannedPurchases';
import * as plannedPurchaseService from '../services/plannedPurchaseService';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => {
      if (key === 'reachTargetInDays') {
        return `About ${options?.days} days`;
      }
      if (key === 'reachTargetIn') {
        return `About ${options?.periods} ${options?.periodUnit || options?.cadence} (~${options?.days} days)`;
      }
      const translations = {
        plannedPurchases: 'Planned Purchases',
        planningSubtitle: 'Understand price through time',
        addPlannedPurchase: 'Add Planned Purchase',
        editPlannedPurchase: 'Edit Planned Purchase',
        newPlan: 'New Plan',
        noPlannedPurchases: 'No planned purchases yet',
        noPlannedPurchasesDescription: 'Frame large prospective purchases',
        targetItemName: 'Target item name',
        itemName: 'Item Name',
        currency: 'Currency',
        purchaseDate: 'Purchase date',
        enterTargetItemName: 'Enter name',
        targetPrice: 'Target price',
        enterTargetPrice: 'Enter target price',
        planningMode: 'How do you want to plan?',
        modeContributionToTime: 'Choose an amount',
        modeTargetDateToContribution: 'Choose a target date',
        recurringContribution: 'Recurring contribution',
        enterContributionAmount: 'Enter amount',
        cadence: 'Frequency',
        cadenceDaily: 'Every day',
        cadenceWeekly: 'Every week',
        cadenceMonthly: 'Every month',
        cadencePerDaily: 'per day',
        cadencePerWeekly: 'per week',
        cadencePerMonthly: 'per month',
        targetDate: 'Target date',
        timeToReachTarget: 'Estimated time to reach target',
        requiredContribution: 'Required contribution',
        statusPlanned: 'Planned Status',
        confirmDelete: 'Confirm Delete',
        confirmDeletePlannedPurchase: 'Are you sure you want to delete this planned purchase?',
        cancel: 'Cancel',
        confirm: 'Confirm',
        save: 'Save',
        loading: 'Loading...',
        edit: 'Edit',
        deleteItem: 'Delete Item',
        exploreFraming: 'Try a different pace',
        explorePaceDescription: 'Adjust the contribution amount or frequency to see how your timeline changes.',
        markAsPurchased: 'Mark as Purchased',
        markAsPurchasedDescription: 'Review the actual purchase details before moving this plan into ownership.',
        actualPurchasePrice: 'Actual purchase price',
        plannedPriceReference: 'Planned price',
        createOwnedItem: 'Create Owned Item',
        conversionFailed: 'Failed to convert the planned purchase. Please try again.',
        unitDays: 'days',
        unitWeeks: 'weeks',
        unitMonths: 'months',
        usd: 'US Dollar (USD)',
        idr: 'Indonesian Rupiah (IDR)',
      };
      return translations[key] || key;
    },
  }),
}));

vi.mock('../contexts/CurrencyContext', () => ({
  useCurrency: () => ({
    currencyCode: 'IDR',
    currencySymbol: 'Rp',
  }),
}));

vi.mock('../services/plannedPurchaseService', () => ({
  fetchPlannedPurchases: vi.fn(),
  createPlannedPurchase: vi.fn(),
  updatePlannedPurchase: vi.fn(),
  deletePlannedPurchase: vi.fn(),
  convertPlannedPurchase: vi.fn(),
}));

describe('PlannedPurchases Component', () => {
  let queryClient;

  beforeEach(() => {
    vi.restoreAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <PlannedPurchases />
      </QueryClientProvider>
    );
  };

  it('renders loading state initially', () => {
    plannedPurchaseService.fetchPlannedPurchases.mockReturnValue(new Promise(() => {}));
    renderComponent();

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders empty state when no planned purchases exist', async () => {
    plannedPurchaseService.fetchPlannedPurchases.mockResolvedValue([]);
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('No planned purchases yet')).toBeInTheDocument();
    });
  });

  it('includes planning-page-content class to avoid mobile header overlap', async () => {
    plannedPurchaseService.fetchPlannedPurchases.mockResolvedValue([]);
    const { container } = renderComponent();

    expect(container.querySelector('.planning-page-content')).toBeInTheDocument();
  });

  it('opens create form when clicking New Plan', async () => {
    plannedPurchaseService.fetchPlannedPurchases.mockResolvedValue([]);
    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /new plan/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /new plan/i }));

    expect(screen.getByLabelText(/target item name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/target price/i)).toBeInTheDocument();
  });

  it('clears inactive mode fields and sets them to null when switching from contribution to target date', async () => {
    plannedPurchaseService.fetchPlannedPurchases.mockResolvedValue([]);
    plannedPurchaseService.createPlannedPurchase.mockResolvedValue({ id: 'new-1' });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /new plan/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /new plan/i }));

    // 1. Fill contribution fields
    fireEvent.change(screen.getByLabelText(/target item name/i), { target: { value: 'Winter Coat' } });
    fireEvent.change(screen.getByLabelText(/target price/i), { target: { value: '1200000' } });
    fireEvent.change(screen.getByLabelText(/recurring contribution/i), { target: { value: '14000' } });

    // 2. Switch to Target Date mode
    fireEvent.click(screen.getByRole('button', { name: /choose a target date/i }));

    // 3. Fill target date
    fireEvent.change(screen.getByLabelText(/target date/i), { target: { value: '2028-12-31' } });

    // 4. Submit form
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(plannedPurchaseService.createPlannedPurchase).toHaveBeenCalledWith({
        name: 'Winter Coat',
        targetPrice: 1200000,
        currencyCode: 'IDR',
        targetDate: '2028-12-31',
        contributionAmount: null,
        contributionCadence: null,
      });
    });
  });

  it('clears inactive mode fields and sets them to null when switching from target date to contribution', async () => {
    plannedPurchaseService.fetchPlannedPurchases.mockResolvedValue([]);
    plannedPurchaseService.createPlannedPurchase.mockResolvedValue({ id: 'new-2' });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /new plan/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /new plan/i }));

    // 1. Switch to Target Date mode first and fill
    fireEvent.change(screen.getByLabelText(/target item name/i), { target: { value: 'Camera' } });
    fireEvent.change(screen.getByLabelText(/target price/i), { target: { value: '5000000' } });
    fireEvent.click(screen.getByRole('button', { name: /choose a target date/i }));
    fireEvent.change(screen.getByLabelText(/target date/i), { target: { value: '2028-12-31' } });

    // 2. Switch back to Contribution mode and fill
    fireEvent.click(screen.getByRole('button', { name: /choose an amount/i }));
    fireEvent.change(screen.getByLabelText(/recurring contribution/i), { target: { value: '50000' } });

    // 3. Submit form
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(plannedPurchaseService.createPlannedPurchase).toHaveBeenCalledWith({
        name: 'Camera',
        targetPrice: 5000000,
        currencyCode: 'IDR',
        targetDate: null,
        contributionAmount: 50000,
        contributionCadence: 'daily',
      });
    });
  });

  it('shows live time projection calculation when entering price and contribution', async () => {
    plannedPurchaseService.fetchPlannedPurchases.mockResolvedValue([]);
    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /new plan/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /new plan/i }));

    const nameInput = screen.getByLabelText(/target item name/i);
    const priceInput = screen.getByLabelText(/target price/i);
    const contributionInput = screen.getByLabelText(/recurring contribution/i);

    fireEvent.change(nameInput, { target: { value: 'MacBook Air' } });
    fireEvent.change(priceInput, { target: { value: '18000000' } });
    fireEvent.change(contributionInput, { target: { value: '25000' } });

    // 18,000,000 / 25,000 = 720 days
    await waitFor(() => {
      expect(screen.getByText(/720 days/i)).toBeInTheDocument();
    });
  });

  it('renders planned purchase cards with clean rounded periods and no long decimals', async () => {
    const mockPurchases = [
      {
        id: 'purchase-1',
        name: 'Winter Jacket',
        targetPrice: 1200000,
        currencyCode: 'IDR',
        contributionAmount: 14000,
        contributionCadence: 'daily',
        estimatedPeriods: 86,
        estimatedDays: 86,
      },
    ];

    plannedPurchaseService.fetchPlannedPurchases.mockResolvedValue(mockPurchases);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Winter Jacket')).toBeInTheDocument();
    });

    // Displays clean integer days without decimal leakage like 85.71428571428571
    expect(screen.getByText(/About 86 days/i)).toBeInTheDocument();
    expect(screen.queryByText(/85\.71/)).not.toBeInTheDocument();
  });

  it('opens conversion with prefilled values, allows edits, and confirms explicitly', async () => {
    const mockPurchase = {
      id: 'purchase-1',
      name: 'MacBook Air',
      targetPrice: 18000000,
      currencyCode: 'IDR',
      contributionAmount: 25000,
      contributionCadence: 'daily',
      estimatedPeriods: 720,
      estimatedDays: 720,
    };

    plannedPurchaseService.fetchPlannedPurchases.mockResolvedValue([mockPurchase]);
    plannedPurchaseService.convertPlannedPurchase.mockResolvedValue({
      id: 'owned-1',
      name: 'MacBook Air',
      price: 17500000,
      status: 'active',
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('MacBook Air')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Mark as Purchased' }));

    expect(screen.getByLabelText('Item Name')).toHaveValue('MacBook Air');
    expect(screen.getByLabelText('Actual purchase price')).toHaveValue(18000000);
    expect(screen.getByLabelText('Currency')).toHaveValue('IDR');
    expect(screen.getByLabelText('Purchase date').value).not.toBe('');

    fireEvent.change(screen.getByLabelText('Actual purchase price'), {
      target: { value: '17500000' },
    });
    fireEvent.change(screen.getByLabelText('Purchase date'), {
      target: { value: '2026-09-23' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create Owned Item' }));

    await waitFor(() => {
      expect(plannedPurchaseService.convertPlannedPurchase).toHaveBeenCalledWith(
        'purchase-1',
        {
          purchasePrice: 17500000,
          currencyCode: 'IDR',
          purchaseDate: '2026-09-23',
        }
      );
    });
  });

  it('keeps conversion form open and displays backend errors', async () => {
    plannedPurchaseService.fetchPlannedPurchases.mockResolvedValue([
      {
        id: 'purchase-2',
        name: 'Camera',
        targetPrice: 5000000,
        currencyCode: 'IDR',
      },
    ]);
    plannedPurchaseService.convertPlannedPurchase.mockRejectedValue(
      new Error('failed to convert planned purchase')
    );

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Camera')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Mark as Purchased' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create Owned Item' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('failed to convert planned purchase');
    });
    expect(screen.getByLabelText('Actual purchase price')).toBeInTheDocument();
  });

  it('renders planned purchase cards with contribution framing and allows deletion', async () => {
    const mockPurchases = [
      {
        id: 'purchase-1',
        name: 'MacBook Air',
        targetPrice: 18000000,
        currencyCode: 'IDR',
        contributionAmount: 25000,
        contributionCadence: 'daily',
        estimatedPeriods: 720,
        estimatedDays: 720,
      },
    ];

    plannedPurchaseService.fetchPlannedPurchases.mockResolvedValue(mockPurchases);
    plannedPurchaseService.deletePlannedPurchase.mockResolvedValue({ meta: { code: 200 } });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('MacBook Air')).toBeInTheDocument();
    });

    expect(screen.getByText('Planned Status')).toBeInTheDocument();

    // Trigger delete confirmation modal
    const deleteButton = screen.getByLabelText('Delete Item');
    fireEvent.click(deleteButton);

    expect(screen.getByText('Are you sure you want to delete this planned purchase?')).toBeInTheDocument();

    // Confirm deletion
    const confirmButton = screen.getByRole('button', { name: 'Confirm' });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(plannedPurchaseService.deletePlannedPurchase).toHaveBeenCalledWith('purchase-1');
    });
  });
});
