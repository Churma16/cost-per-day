import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PlannedPurchases from './PlannedPurchases';
import * as plannedPurchaseService from '../services/plannedPurchaseService';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => {
      if (key === 'reachTargetIn') {
        return `About ${options?.periods} ${options?.cadence} (~${options?.days} days)`;
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
        enterTargetItemName: 'Enter name',
        targetPrice: 'Target price',
        enterTargetPrice: 'Enter target price',
        planningMode: 'Planning Direction',
        modeContributionToTime: 'Contribution -> Time',
        modeTargetDateToContribution: 'Target Date -> Contribution',
        recurringContribution: 'Recurring contribution',
        enterContributionAmount: 'Enter amount',
        cadence: 'Cadence',
        cadenceDaily: 'Daily',
        cadenceWeekly: 'Weekly',
        cadenceMonthly: 'Monthly',
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
        exploreFraming: 'Explore Framing',
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
      expect(screen.getByText(/720/)).toBeInTheDocument();
    });
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
