import React from 'react';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
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
      if (key === 'planCount') {
        return `${options?.count} plans`;
      }
      if (key === 'estimatedTargetPrefix') {
        return `Estimated target · ${options?.date}`;
      }
      if (key === 'needsPace') {
        return `Estimated contribution ≈ ${options?.daily}/day`;
      }
      if (key === 'targetDatePaceDetail') {
        return `${options?.daily}/day · ${options?.weekly}/week · ${options?.monthly}/month`;
      }
      const translations = {
        plannedPurchases: 'Planned Purchases',
        planningSubtitle: 'Understand price through time',
        yourPlans: 'Your Plans',
        addPlannedPurchase: 'Add Planned Purchase',
        editPlannedPurchase: 'Edit Planned Purchase',
        newPlan: 'New plan',
        noPlannedPurchases: 'No purchase plans yet',
        noPlannedPurchasesDescription: "Plan something you're considering to see how its price relates to time.",
        targetItemName: 'Target item name',
        enterTargetItemName: 'Enter name',
        itemPrice: 'Item price',
        enterItemPrice: 'Enter item price',
        targetPrice: 'Item price',
        enterTargetPrice: 'Enter item price',
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
        confirmDeletePlannedPurchaseAccount: "Delete this plan? Its saved timeline will be permanently removed from Worthwhile. This can't be undone.",
        confirmDeletePlannedPurchaseDevice: "Delete this plan? Its saved timeline will be permanently removed from this device. This can't be undone.",
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
        apply: 'Apply',
        applyChanges: 'Apply changes',
        previewUnsaved: 'Preview, unsaved',
        reachedAround: 'Estimated completion',
        saved: 'Saved',
        planningLoadErrorDescription: "Couldn't load your plans. Check your connection and try again.",
        refreshShowingSavedData: "Couldn't refresh right now. Showing your last saved data.",
        errorUpdatingPlannedPurchase: "We couldn't update this plan. Please try again.",
        tryAgain: 'Try again',
        stillLoadingPlans: 'Still loading your plans...',
        planDeleteErrorTitle: 'Not deleted yet.',
        planDeleteErrorBody: 'Your plan is still here.',
        keepIt: 'Keep it',
        delete: 'Delete',
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

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <PlannedPurchases />
        </QueryClientProvider>
      </MemoryRouter>
    );
  };

  it('uses blank, skeleton, then slow-load feedback for initial loading', () => {
    vi.useFakeTimers();
    plannedPurchaseService.fetchPlannedPurchases.mockReturnValue(new Promise(() => {}));
    const { container } = renderComponent();

    expect(screen.getByText('Your Plans')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(container.querySelector('.state-skeleton')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(200);
    });
    const planSkeletons = container.querySelectorAll('[data-skeleton-variant="planned-purchase"]');
    expect(planSkeletons).toHaveLength(3);
    expect(planSkeletons[0]).toHaveClass('rounded-2xl', 'border-[#E6E8EC]');
    expect(planSkeletons[0].firstElementChild).toHaveClass('min-h-[44px]', 'px-3', 'py-2.5');
    expect(planSkeletons[0].querySelector('[data-skeleton-row="identity"]')).toHaveClass('h-5', 'sm:h-6');
    expect(planSkeletons[0].querySelector('[data-skeleton-row="context"]')).toHaveClass('mt-0.5');
    expect(planSkeletons[0].querySelectorAll('.state-skeleton')).toHaveLength(5);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1800);
    });
    expect(screen.getByRole('status')).toHaveTextContent('Still loading your plans...');
  });

  it('renders empty state when no planned purchases exist', async () => {
    plannedPurchaseService.fetchPlannedPurchases.mockResolvedValue([]);
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('No purchase plans yet')).toBeInTheDocument();
    });
    expect(screen.getByText('Your Plans')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New plan' })).toBeInTheDocument();
  });

  it('offers retry after an initial planning load failure', async () => {
    plannedPurchaseService.fetchPlannedPurchases.mockRejectedValue(
      new Error('raw planning failure')
    );

    renderComponent();

    const errorState = await screen.findByRole('status', {}, { timeout: 3000 });
    expect(screen.getByText('Your Plans')).toBeInTheDocument();
    expect(errorState).toHaveTextContent("Couldn't load your plans. Check your connection and try again.");
    expect(errorState).not.toHaveTextContent('raw planning failure');

    plannedPurchaseService.fetchPlannedPurchases.mockResolvedValue([]);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => {
      expect(screen.getByText('No purchase plans yet')).toBeInTheDocument();
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

  it('surfaces retryable notice when cached-empty planned purchases background refresh fails', async () => {
    queryClient.setQueryData(queryKeys.plannedPurchases, [], { updatedAt: 1 });
    plannedPurchaseService.fetchPlannedPurchases.mockRejectedValue(new Error('Temporary network failure'));

    renderComponent();

    expect(screen.getByText('No purchase plans yet')).toBeInTheDocument();
    expect(await screen.findByText("Couldn't refresh right now. Showing your last saved data.", {}, { timeout: 3500 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('includes planning-page-content class to match shared shell', async () => {
    plannedPurchaseService.fetchPlannedPurchases.mockResolvedValue([]);
    const { container } = renderComponent();

    const planningContainer = container.querySelector('.planning-page-content');
    expect(planningContainer).toBeInTheDocument();
  });

  it('keeps Planning focused on reviewing existing plans', async () => {
    plannedPurchaseService.fetchPlannedPurchases.mockResolvedValue([]);
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('No purchase plans yet')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'New plan' })).toBeInTheDocument();
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

    const loadedPlans = document.querySelector('[data-plans-state="loaded"]');
    expect(loadedPlans).toHaveClass('state-content-enter');
    expect(loadedPlans).not.toContainElement(screen.getByText('Your Plans'));
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

    expect(screen.getAllByText('Rp 18.000.000')[0]).toBeInTheDocument();

    // Trigger delete confirmation modal
    const deleteButton = screen.getByLabelText('Delete Item');
    fireEvent.click(deleteButton);

    expect(screen.getByText(/This can't be undone/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep it' })).toHaveFocus();

    // Confirm deletion
    const confirmButton = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(plannedPurchaseService.deletePlannedPurchase).toHaveBeenCalledWith('purchase-1');
    });
  });

  it('maintains single-card accordion behavior when expanding different cards', async () => {
    const mockPurchases = [
      {
        id: 'purchase-1',
        name: 'Keyboard',
        targetPrice: 2000000,
        currencyCode: 'IDR',
        contributionAmount: 50000,
        contributionCadence: 'daily',
        estimatedPeriods: 40,
        estimatedDays: 40,
      },
      {
        id: 'purchase-2',
        name: 'Headphones',
        targetPrice: 3000000,
        currencyCode: 'IDR',
        contributionAmount: 100000,
        contributionCadence: 'daily',
        estimatedPeriods: 30,
        estimatedDays: 30,
      },
    ];

    plannedPurchaseService.fetchPlannedPurchases.mockResolvedValue(mockPurchases);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Keyboard')).toBeInTheDocument();
      expect(screen.getByText('Headphones')).toBeInTheDocument();
    });

    const keyboardTrigger = screen.getByRole('button', { name: /keyboard/i });
    const headphonesTrigger = screen.getByRole('button', { name: /headphones/i });

    // Initially both are collapsed
    expect(keyboardTrigger).toHaveAttribute('aria-expanded', 'false');
    expect(headphonesTrigger).toHaveAttribute('aria-expanded', 'false');

    // Click keyboard card -> expands keyboard card
    fireEvent.click(keyboardTrigger);
    expect(keyboardTrigger).toHaveAttribute('aria-expanded', 'true');
    expect(headphonesTrigger).toHaveAttribute('aria-expanded', 'false');

    // Click headphones card -> collapses keyboard card and expands headphones card
    fireEvent.click(headphonesTrigger);
    expect(keyboardTrigger).toHaveAttribute('aria-expanded', 'false');
    expect(headphonesTrigger).toHaveAttribute('aria-expanded', 'true');

    // Click headphones card again -> collapses headphones card
    fireEvent.click(headphonesTrigger);
    expect(keyboardTrigger).toHaveAttribute('aria-expanded', 'false');
    expect(headphonesTrigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('allows exploring and applying a new scenario which updates via PUT mutation', async () => {
    const mockPurchases = [
      {
        id: 'purchase-1',
        name: 'Laptop',
        targetPrice: 15000000,
        currencyCode: 'IDR',
        targetDate: '2027-06-30',
        requiredDailyContribution: 50000,
      },
    ];

    plannedPurchaseService.fetchPlannedPurchases.mockResolvedValue(mockPurchases);
    plannedPurchaseService.updatePlannedPurchase.mockResolvedValue({
      id: 'purchase-1',
      name: 'Laptop',
      targetPrice: 15000000,
      currencyCode: 'IDR',
      targetDate: null,
      contributionAmount: 200000,
      contributionCadence: 'weekly',
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Laptop')).toBeInTheDocument();
    });

    // Expand the card
    fireEvent.click(screen.getByRole('button', { name: /laptop/i }));

    // Open exploration accordion
    fireEvent.click(screen.getByRole('button', { name: /try a different pace/i }));

    // Change cadence to weekly and enter contribution
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'weekly' } });

    const input = screen.getByPlaceholderText('Enter amount');
    fireEvent.change(input, { target: { value: '200000' } });

    // Click Apply changes
    const applyButton = screen.getByRole('button', { name: /apply changes/i });
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(plannedPurchaseService.updatePlannedPurchase).toHaveBeenCalledWith(
        'purchase-1',
        expect.objectContaining({
          targetDate: null,
          contributionAmount: 200000,
          contributionCadence: 'weekly',
        })
      );
    });
  });

  it('opens edit drawer dialog and updates planned purchase', async () => {
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
    plannedPurchaseService.updatePlannedPurchase.mockResolvedValue({
      id: 'purchase-1',
      name: 'MacBook Pro',
      targetPrice: 24000000,
      currencyCode: 'IDR',
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('MacBook Air')).toBeInTheDocument();
    });

    // Expand the card
    const toggleButton = screen.getByRole('button', { name: /macbook air/i });
    fireEvent.click(toggleButton);

    // Click edit button
    const editButton = screen.getByRole('button', { name: 'Edit' });
    fireEvent.click(editButton);

    // Check dialog drawer is rendered
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Edit Planned Purchase')).toBeInTheDocument();

    // Change name in dialog
    const nameInput = screen.getByLabelText(/Target item name/);
    fireEvent.change(nameInput, { target: { value: 'MacBook Pro' } });

    // Submit dialog
    const saveButton = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(plannedPurchaseService.updatePlannedPurchase).toHaveBeenCalledWith(
        'purchase-1',
        expect.objectContaining({
          name: 'MacBook Pro',
        })
      );
    });
  });
});
