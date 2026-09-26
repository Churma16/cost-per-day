import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PlannedPurchases from '../../src/components/PlannedPurchases';
import * as plannedPurchaseService from '../../src/services/plannedPurchaseService';
import { queryKeys } from '../../src/query/queryConfig';

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
        requiredContribution: 'Estimated contribution',
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

vi.mock('../../src/contexts/CurrencyContext', () => ({
  useCurrency: () => ({
    currencyCode: 'IDR',
    currencySymbol: 'Rp',
  }),
}));

vi.mock('../../src/services/plannedPurchaseService', () => ({
  fetchPlannedPurchases: vi.fn(),
  createPlannedPurchase: vi.fn(),
  updatePlannedPurchase: vi.fn(),
  deletePlannedPurchase: vi.fn(),
}));

describe('PlannedPurchases Component', () => {
  let queryClient;

  beforeEach(() => {
    vi.clearAllMocks();
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

  it('keeps cached plans visible when a background refresh fails', () => {
    const cachedPlans = [{
      id: 'cached-plan-1',
      name: 'Cached Camera',
      targetPrice: 5000000,
      currencyCode: 'IDR',
      contributionAmount: 50000,
      contributionCadence: 'daily',
      estimatedPeriods: 100,
      estimatedDays: 100,
    }];
    queryClient.setQueryData(queryKeys.plannedPurchases, cachedPlans, { updatedAt: 1 });
    plannedPurchaseService.fetchPlannedPurchases.mockRejectedValue(new Error('Temporary network failure'));

    renderComponent();

    expect(screen.getByText('Cached Camera')).toBeInTheDocument();
    expect(screen.queryByText('Temporary network failure')).not.toBeInTheDocument();
  });

  it('includes planning-page-content class and pt-4 top spacing to match shared shell', async () => {
    plannedPurchaseService.fetchPlannedPurchases.mockResolvedValue([]);
    const { container } = renderComponent();

    const planningContainer = container.querySelector('.planning-page-content');
    expect(planningContainer).toBeInTheDocument();
    expect(planningContainer).toHaveClass('pt-4');
  });

  it('keeps Planning focused on reviewing existing plans', async () => {
    plannedPurchaseService.fetchPlannedPurchases.mockResolvedValue([]);
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('No planned purchases yet')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /new plan/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/target item name/i)).not.toBeInTheDocument();
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
