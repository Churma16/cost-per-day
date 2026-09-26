import React from 'react';
import { fireEvent, render as testingLibraryRender, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import ItemList, {
  getCategoryIconInfo,
  getStatusBadgeStyle,
  getLifecycleTranslationKey,
  getNextDurationUnit,
  formatOwnershipDuration,
  CalmCycleText
} from '../../src/components/ItemList';
import { getAllItems, deleteItem } from '../../src/services/api';
import { useCurrency } from '../../src/contexts/CurrencyContext';
import { useValueEquivalents } from '../../src/contexts/ValueEquivalentsContext';
import { queryKeys } from '../../src/query/queryConfig';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'en' },
    t: (key, options) => {
      if (key === 'equivalentPerDay') {
        return `${options?.count} ${options?.name}/day`;
      }
      if (key === 'equivalentEveryNDays') {
        return `1 ${options?.name} every ${options?.count} days`;
      }
      if (key === 'equivalentPerMonth') {
        return `${options?.count} ${options?.name}/month`;
      }
      if (key === 'targetStateInProgress') {
        return `In progress (${options?.percent}%)`;
      }
      if (key === 'targetStateBeyond') {
        return `Beyond target (+${options?.days}d)`;
      }
      if (key === 'remainingDaysToTarget') {
        return `${options?.days} days remaining`;
      }
      if (key === 'daysBeyondTarget') {
        return `${options?.days} days beyond target`;
      }
      return {
        loading: 'Loading...',
        noItems: 'No items yet',
        statusActiveEarly: 'Just Joined You',
        statusActive: 'Still With You',
        statusRetired: 'No Longer in Use',
        statusSold: 'Changed Hands',
        statusLost: 'Lost',
        currentCostPerDay: 'Current cost per day',
        finalGrossCostPerDay: 'Final gross cost per day',
        perDay: '/day',
        purchaseAmount: 'Purchase amount',
        purchaseDate: 'Purchase date',
        ownershipDays: 'ownership days',
        unitDays: 'days',
        unitMonths: 'months',
        unitYears: 'years',
        clickToCycleUnit: 'Click to switch between days, months, and years',
        ownershipEndDate: 'Ownership end date',
        salePrice: 'Sale price',
        netOwnershipCost: 'Cost after sale',
        netCostPerDay: 'Net cost per day',
        targetMilestone: 'Target milestone',
        targetStateNew: 'New',
        targetStateReached: 'Target reached',
        edit: 'Edit',
        yourItems: 'Your Items',
        sortedHighestCost: 'Sorted: highest cost',
        organizeItems: 'Sort & group',
        filterByOwnershipState: 'Filter by ownership state',
        allStates: 'All states',
        groupBy: 'Group by',
        groupOwnershipState: 'Ownership state',
        groupNone: 'None',
        sortBy: 'Sort',
        sortRecentlyAcquired: 'Recently acquired',
        sortOldestOwned: 'Oldest owned',
        sortNameAscending: 'Name: A to Z',
        sortNameDescending: 'Name: Z to A',
        sortCostDescending: 'Cost per day: high to low',
        sortCostAscending: 'Cost per day: low to high',
        sortPriceDescending: 'Price: high to low',
        sortPriceAscending: 'Price: low to high',
        uncategorized: 'Uncategorized',
        noItemsMatchFilter: 'No items match this filter',
        done: 'Done',
        close: 'Close',
        ownedFor: 'Owned for',
        deleteItem: 'Delete',
        confirmDelete: 'Confirm Delete',
        deleteConfirmation: 'Are you sure you want to delete this item? This action cannot be undone.',
        cancel: 'Cancel',
        confirm: 'Confirm'
      }[key] || key;
    }
  })
}));

vi.mock('../../src/services/api', () => ({
  getAllItems: vi.fn(),
  deleteItem: vi.fn()
}));

vi.mock('../../src/contexts/CurrencyContext', () => ({
  useCurrency: vi.fn()
}));

vi.mock('../../src/contexts/ValueEquivalentsContext', () => ({
  useValueEquivalents: vi.fn()
}));

const mockInvalidateDashboard = vi.fn().mockResolvedValue(undefined);
const mockInvalidateDurability = vi.fn().mockResolvedValue(undefined);

vi.mock('../../src/hooks/useDashboard', () => ({
  useInvalidateDashboard: () => mockInvalidateDashboard,
  invalidateDashboardQuery: (...args) => mockInvalidateDashboard(...args)
}));

vi.mock('../../src/hooks/useDurabilityAnalytics', () => ({
  useInvalidateDurability: () => mockInvalidateDurability,
  invalidateDurabilityQuery: (...args) => mockInvalidateDurability(...args)
}));

const render = (ui) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return testingLibraryRender(ui, {
    wrapper: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  });
};

const createMemoryStorage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    clear: () => values.clear(),
  };
};

describe('ItemList lifecycle display', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('localStorage', createMemoryStorage());
    useCurrency.mockReturnValue({ currencyCode: 'USD' });
    useValueEquivalents.mockReturnValue({ valueEquivalents: [] });
  });

  test('uses backend-derived final and net costs for sold history', async () => {
    getAllItems.mockResolvedValue([
      {
        id: '1',
        name: 'Phone',
        price: 100,
        purchaseDate: '2026-09-01T12:00:00Z',
        status: 'sold',
        endedAt: '2026-09-11T12:00:00Z',
        salePrice: 40,
        ownershipDays: 10,
        grossCostPerDay: 10,
        netOwnershipCost: 60,
        netCostPerDay: 6
      },
      {
        id: '2',
        name: 'Laptop',
        price: 200,
        purchaseDate: '2026-09-01T12:00:00Z',
        status: 'active',
        ownershipDays: 50,
        grossCostPerDay: 4
      }
    ]);

    render(
      <MemoryRouter>
        <ItemList />
      </MemoryRouter>
    );

    expect(await screen.findByText('Phone')).toBeInTheDocument();
    const phoneTrigger = screen.getByRole('button', { name: /Phone/i });
    expect(within(phoneTrigger).queryByText('Changed Hands')).not.toBeInTheDocument();
    expect(screen.queryByText('Final gross cost per day')).not.toBeInTheDocument();
    expect(screen.getByText('$10.00')).toBeInTheDocument();

    expect(screen.getByText('Laptop')).toBeInTheDocument();
    const laptopTrigger = screen.getByRole('button', { name: /Laptop/i });
    expect(within(laptopTrigger).queryByText('Still With You')).not.toBeInTheDocument();
    expect(screen.getByText('$4.00')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Phone'));

    const phoneDetails = document.getElementById('item-details-1');
    expect(within(phoneDetails).getByText('Changed Hands')).toBeInTheDocument();
    expect(screen.getByText('Ownership end date')).toBeInTheDocument();
    expect(screen.getByText('Sale price')).toBeInTheDocument();
    expect(screen.getByText('$40.00')).toBeInTheDocument();
    expect(screen.getByText('Cost after sale')).toBeInTheDocument();
    expect(screen.getByText('$60.00')).toBeInTheDocument();
    expect(screen.getByText('Net cost per day')).toBeInTheDocument();
    expect(screen.getByText('$6.00/day')).toBeInTheDocument();
  });

  test('keeps active lifecycle quiet while showing age-aware human copy when expanded', async () => {
    getAllItems.mockResolvedValueOnce([
      {
        id: 'early-active-copy',
        name: 'New Camera',
        price: 300,
        purchaseDate: '2026-09-17T12:00:00Z',
        status: 'active',
        ownershipDays: 8,
        grossCostPerDay: 37.5
      },
      {
        id: 'active-copy',
        name: 'Active Camera',
        price: 300,
        purchaseDate: '2026-08-19T12:00:00Z',
        status: 'active',
        ownershipDays: 37,
        grossCostPerDay: 8.11
      },
      {
        id: 'retired-copy',
        name: 'Retired Camera',
        price: 300,
        purchaseDate: '2025-01-01T12:00:00Z',
        status: 'retired',
        ownershipDays: 365,
        grossCostPerDay: 0.82
      },
      {
        id: 'lost-copy',
        name: 'Lost Camera',
        price: 300,
        purchaseDate: '2025-01-01T12:00:00Z',
        status: 'lost',
        ownershipDays: 200,
        grossCostPerDay: 1.5
      }
    ]);

    render(
      <MemoryRouter>
        <ItemList />
      </MemoryRouter>
    );

    const earlyActiveTrigger = await screen.findByRole('button', { name: /New Camera/i });
    expect(within(earlyActiveTrigger).queryByText('Just Joined You')).not.toBeInTheDocument();

    const activeTrigger = screen.getByRole('button', { name: /Active Camera/i });
    expect(within(activeTrigger).queryByText('Still With You')).not.toBeInTheDocument();

    const retiredTrigger = screen.getByRole('button', { name: /Retired Camera/i });
    expect(within(retiredTrigger).queryByText('No Longer in Use')).not.toBeInTheDocument();

    const lostTrigger = screen.getByRole('button', { name: /Lost Camera/i });
    expect(within(lostTrigger).queryByText('Lost')).not.toBeInTheDocument();

    fireEvent.click(earlyActiveTrigger);
    const earlyActiveDetails = document.getElementById('item-details-early-active-copy');
    expect(within(earlyActiveDetails).getByText('Just Joined You')).toBeInTheDocument();
    fireEvent.click(earlyActiveTrigger);

    fireEvent.click(activeTrigger);
    const activeDetails = document.getElementById('item-details-active-copy');
    expect(within(activeDetails).getByText('Still With You')).toBeInTheDocument();
  });

  test('derives the early active presentation without changing lifecycle domain state', () => {
    expect(getLifecycleTranslationKey('active', 1)).toBe('statusActiveEarly');
    expect(getLifecycleTranslationKey('active', 8)).toBe('statusActiveEarly');
    expect(getLifecycleTranslationKey('active', 14)).toBe('statusActiveEarly');
    expect(getLifecycleTranslationKey('active', 15)).toBe('statusActive');
    expect(getLifecycleTranslationKey('active', 37)).toBe('statusActive');
    expect(getLifecycleTranslationKey('retired', 8)).toBe('statusRetired');
    expect(getLifecycleTranslationKey('sold', 8)).toBe('statusSold');
    expect(getLifecycleTranslationKey('lost', 8)).toBe('statusLost');
  });

  test('keeps cached items visible when a background refresh fails', () => {
    const cachedItems = [{
      id: 'cached-1',
      name: 'Cached Phone',
      price: 100,
      purchaseDate: '2026-09-01T12:00:00Z',
      status: 'active',
      ownershipDays: 10,
      grossCostPerDay: 10,
    }];
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(queryKeys.items, cachedItems, { updatedAt: 1 });
    getAllItems.mockRejectedValue(new Error('Temporary network failure'));

    testingLibraryRender(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter><ItemList /></MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText('Cached Phone')).toBeInTheDocument();
    expect(screen.queryByText('Temporary network failure')).not.toBeInTheDocument();
  });

  test('supports keyboard expansion with aria-expanded and aria-controls attributes', async () => {
    getAllItems.mockResolvedValueOnce([
      {
        id: 'kbd-1',
        name: 'Mechanical Keyboard',
        price: 150,
        purchaseDate: '2026-09-01T12:00:00Z',
        status: 'active',
        grossCostPerDay: 5
      }
    ]);

    render(
      <MemoryRouter>
        <ItemList />
      </MemoryRouter>
    );

    expect(await screen.findByText('Mechanical Keyboard')).toBeInTheDocument();

    const triggerButton = screen.getByRole('button', { name: /Mechanical Keyboard/i });
    expect(triggerButton).toHaveAttribute('aria-expanded', 'false');
    expect(triggerButton).toHaveAttribute('aria-controls', 'item-details-kbd-1');

    // Expand via trigger activation
    fireEvent.click(triggerButton);
    expect(triggerButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Purchase amount')).toBeInTheDocument();

    // Collapse via trigger activation
    fireEvent.click(triggerButton);
    expect(triggerButton).toHaveAttribute('aria-expanded', 'false');
  });

  test('removes collapsed-card actions from accessibility tree and keyboard reach until expanded', async () => {
    getAllItems.mockResolvedValueOnce([
      {
        id: 'kbd-2',
        name: 'Wireless Mouse',
        price: 80,
        purchaseDate: '2026-09-01T12:00:00Z',
        status: 'active',
        grossCostPerDay: 2,
        ownershipDays: 60
      }
    ]);

    render(
      <MemoryRouter>
        <ItemList />
      </MemoryRouter>
    );

    expect(await screen.findByText('Wireless Mouse')).toBeInTheDocument();

    const detailsRegion = document.getElementById('item-details-kbd-2');
    expect(detailsRegion).toHaveAttribute('inert');
    expect(detailsRegion).toHaveAttribute('aria-hidden', 'true');
    expect(detailsRegion).toHaveClass('invisible');

    // Inner action buttons are not reachable in accessibility tree when collapsed
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();

    // Verify all buttons inside the collapsed region have tabIndex="-1"
    const innerButtons = detailsRegion.querySelectorAll('button');
    innerButtons.forEach((btn) => {
      expect(btn).toHaveAttribute('tabindex', '-1');
    });

    // Expand the card
    const triggerButton = screen.getByRole('button', { name: /Wireless Mouse/i });
    fireEvent.click(triggerButton);

    // Once expanded, details are visible, not inert, and action buttons are accessible and focusable
    expect(detailsRegion).not.toHaveAttribute('inert');
    expect(detailsRegion).toHaveAttribute('aria-hidden', 'false');
    expect(detailsRegion).toHaveClass('visible');
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveAttribute('tabindex', '0');

    // Collapse the card again
    fireEvent.click(triggerButton);
    expect(detailsRegion).toHaveAttribute('inert');
    expect(detailsRegion).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  test('displays personalized value equivalent on active item card when currency matches', async () => {
    useValueEquivalents.mockReturnValue({
      valueEquivalents: [
        { id: 'eq-1', name: 'Coffee', amount: 2, currencyCode: 'USD' }
      ]
    });

    getAllItems.mockResolvedValueOnce([
      {
        id: '1',
        name: 'Headphones',
        price: 120,
        purchaseDate: '2026-09-01T12:00:00Z',
        status: 'active',
        grossCostPerDay: 4
      }
    ]);

    render(
      <MemoryRouter>
        <ItemList />
      </MemoryRouter>
    );

    expect(await screen.findByText('Headphones')).toBeInTheDocument();
    // With costPerDay=4 and Coffee=2, unitsPerDay=2, display: "≈ 2 Coffee/day"
    expect(screen.getByText('≈ 2 Coffee/day')).toBeInTheDocument();
  });

  test('displays value equivalent on sold item card using final gross cost per day', async () => {
    useValueEquivalents.mockReturnValue({
      valueEquivalents: [
        { id: 'eq-1', name: 'Coffee', amount: 5, currencyCode: 'USD' }
      ]
    });

    getAllItems.mockResolvedValueOnce([
      {
        id: '1',
        name: 'Smartwatch',
        price: 150,
        purchaseDate: '2026-08-01T12:00:00Z',
        status: 'sold',
        endedAt: '2026-09-01T12:00:00Z',
        salePrice: 50,
        ownershipDays: 31,
        grossCostPerDay: 5,
        netOwnershipCost: 100,
        netCostPerDay: 3.23
      }
    ]);

    render(
      <MemoryRouter>
        <ItemList />
      </MemoryRouter>
    );

    expect(await screen.findByText('Smartwatch')).toBeInTheDocument();
    // With grossCostPerDay=5 and Coffee=5, unitsPerDay=1, display: "≈ 1 Coffee/day"
    expect(screen.getByText('≈ 1 Coffee/day')).toBeInTheDocument();
  });

  test('does not display equivalent when benchmark currency does not match current currency', async () => {
    // Current currency is USD, benchmark is IDR
    useValueEquivalents.mockReturnValue({
      valueEquivalents: [
        { id: 'eq-1', name: 'Gorengan', amount: 2500, currencyCode: 'IDR' }
      ]
    });

    getAllItems.mockResolvedValueOnce([
      {
        id: '1',
        name: 'Tablet',
        price: 300,
        purchaseDate: '2026-09-01T12:00:00Z',
        status: 'active',
        grossCostPerDay: 5
      }
    ]);

    render(
      <MemoryRouter>
        <ItemList />
      </MemoryRouter>
    );

    expect(await screen.findByText('Tablet')).toBeInTheDocument();
    expect(screen.queryByText(/≈/)).not.toBeInTheDocument();
  });

  test('renders target progress percentage and remaining days using canonical backend field names', async () => {
    getAllItems.mockResolvedValueOnce([
      {
        id: 'item-target-1',
        name: 'Standing Desk',
        price: 300,
        purchaseDate: '2026-06-01T12:00:00Z',
        status: 'active',
        grossCostPerDay: 3.0,
        targetType: 'cost_per_day',
        targetValue: 2.0,
        targetCostPerDay: 2.0,
        targetDurationDays: 150,
        progressPercentage: 65.5,
        remainingDays: 35,
        daysBeyond: 0,
        targetState: 'in_progress'
      }
    ]);

    render(
      <MemoryRouter>
        <ItemList />
      </MemoryRouter>
    );

    // Collapsed card renders clean title without milestone badge clutter
    expect(await screen.findByText('Standing Desk')).toBeInTheDocument();
    expect(screen.queryByText('In progress (66%)')).not.toBeInTheDocument();

    // Expand item to view milestone details
    fireEvent.click(screen.getByText('Standing Desk'));

    expect(screen.getByText('Target milestone')).toBeInTheDocument();
    expect(screen.getByText(/\$2\.00\/day/)).toBeInTheDocument();
    expect(screen.getByText(/~150 days/)).toBeInTheDocument();
    expect(screen.getByText('35 days remaining')).toBeInTheDocument();
    expect(screen.getByText('66%')).toBeInTheDocument();
  });

  test('renders beyond target milestone with daysBeyond from canonical backend response', async () => {
    getAllItems.mockResolvedValueOnce([
      {
        id: 'item-target-2',
        name: 'Mechanical Keyboard',
        price: 150,
        purchaseDate: '2026-01-01T12:00:00Z',
        status: 'active',
        grossCostPerDay: 1.0,
        targetType: 'duration',
        targetValue: 100,
        targetDurationDays: 100,
        progressPercentage: 114,
        remainingDays: 0,
        daysBeyond: 14,
        targetState: 'beyond_target'
      }
    ]);

    render(
      <MemoryRouter>
        <ItemList />
      </MemoryRouter>
    );

    // Collapsed card renders cleanly without badge clutter
    expect(await screen.findByText('Mechanical Keyboard')).toBeInTheDocument();
    expect(screen.queryByText('Beyond target (+14d)')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Mechanical Keyboard'));

    expect(screen.getByText('14 days beyond target')).toBeInTheDocument();
    expect(screen.getByText('114%')).toBeInTheDocument();
  });

  test('renders the compact organization entry point without redundant active-item cost copy', async () => {
    getAllItems.mockResolvedValueOnce([
      {
        id: '1',
        name: 'Jabra Elite 4',
        price: 100,
        purchaseDate: '2026-09-01T12:00:00Z',
        status: 'active',
        grossCostPerDay: 5
      }
    ]);

    render(
      <MemoryRouter>
        <ItemList />
      </MemoryRouter>
    );

    expect(await screen.findByText('Your Items')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sort & group' })).toBeInTheDocument();
    expect(screen.getByText('Jabra Elite 4')).toBeInTheDocument();
    expect(screen.queryByText('Current cost per day')).not.toBeInTheDocument();
  });

  test('renders separate backdrop and sliding dialog layers for organization motion', async () => {
    getAllItems.mockResolvedValueOnce([
      {
        id: 'animated-item',
        name: 'Camera',
        price: 300,
        purchaseDate: '2026-09-01T12:00:00Z',
        status: 'active',
        ownershipDays: 25,
        grossCostPerDay: 12,
      },
    ]);

    render(<MemoryRouter><ItemList /></MemoryRouter>);
    await screen.findByText('Camera');
    fireEvent.click(screen.getByRole('button', { name: 'Sort & group' }));

    const dialog = screen.getByRole('dialog', { name: 'Sort & group' });
    expect(dialog).toBeInTheDocument();
    expect(dialog.previousElementSibling).toHaveClass('bg-black/40');
  });

  test('contains keyboard focus in the organization dialog and restores it to the trigger', async () => {
    getAllItems.mockResolvedValueOnce([
      {
        id: 'focus-item',
        name: 'Camera',
        price: 300,
        purchaseDate: '2026-09-01T12:00:00Z',
        status: 'active',
        ownershipDays: 25,
        grossCostPerDay: 12,
      },
    ]);

    render(<MemoryRouter><ItemList /></MemoryRouter>);
    await screen.findByText('Camera');

    const trigger = screen.getByRole('button', { name: 'Sort & group' });
    trigger.focus();
    fireEvent.click(trigger);

    const closeButton = screen.getByRole('button', { name: 'Close' });
    const doneButton = screen.getByRole('button', { name: 'Done' });
    expect(closeButton).toHaveFocus();

    doneButton.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(closeButton).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(doneButton).toHaveFocus();

    fireEvent.click(doneButton);
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  test('keeps the organization window mounted for its calm closing animation', async () => {
    getAllItems.mockResolvedValueOnce([
      {
        id: 'closing-animation-item',
        name: 'Headphones',
        price: 150,
        purchaseDate: '2026-09-01T12:00:00Z',
        status: 'active',
        ownershipDays: 25,
        grossCostPerDay: 6,
      },
    ]);

    render(<MemoryRouter><ItemList /></MemoryRouter>);
    await screen.findByText('Headphones');
    fireEvent.click(screen.getByRole('button', { name: 'Sort & group' }));
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));

    expect(screen.getByRole('dialog', { name: 'Sort & group' })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Sort & group' })).not.toBeInTheDocument();
    }, { timeout: 1000 });
  });

  test('filters multiple lifecycle presentation states and persists organization choices', async () => {
    getAllItems.mockResolvedValue([
      { id: 'new', name: 'New Camera', price: 300, purchaseDate: '2026-09-20T12:00:00Z', status: 'active', ownershipDays: 6, grossCostPerDay: 50 },
      { id: 'active', name: 'Old Camera', price: 300, purchaseDate: '2026-01-01T12:00:00Z', status: 'active', ownershipDays: 200, grossCostPerDay: 1.5 },
      { id: 'sold', name: 'Sold Camera', price: 200, purchaseDate: '2025-01-01T12:00:00Z', status: 'sold', ownershipDays: 100, grossCostPerDay: 2 },
    ]);

    const firstRender = render(<MemoryRouter><ItemList /></MemoryRouter>);
    expect(await screen.findByText('New Camera')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sort & group' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Just Joined You' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Changed Hands' }));
    expect(screen.queryByText('Old Camera')).not.toBeInTheDocument();
    expect(screen.getByText('New Camera')).toBeInTheDocument();
    expect(screen.getByText('Sold Camera')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'None' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Name: Z to A' }));
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));

    firstRender.unmount();
    render(<MemoryRouter><ItemList /></MemoryRouter>);
    expect(await screen.findByText('Sold Camera')).toBeInTheDocument();
    expect(screen.getByText('New Camera')).toBeInTheDocument();
    expect(screen.queryByText('Old Camera')).not.toBeInTheDocument();
  });

  test('normalizes deselecting the final state back to All states', async () => {
    getAllItems.mockResolvedValue([
      { id: 'active', name: 'Active Item', price: 10, purchaseDate: '2026-01-01T12:00:00Z', status: 'active', ownershipDays: 100, grossCostPerDay: 1 },
      { id: 'lost', name: 'Lost Item', price: 20, purchaseDate: '2025-01-01T12:00:00Z', status: 'lost', ownershipDays: 100, grossCostPerDay: 2 },
    ]);

    render(<MemoryRouter><ItemList /></MemoryRouter>);
    await screen.findByText('Active Item');
    fireEvent.click(screen.getByRole('button', { name: 'Sort & group' }));
    const lostCheckbox = screen.getByRole('checkbox', { name: 'Lost' });
    fireEvent.click(lostCheckbox);
    expect(screen.queryByText('Active Item')).not.toBeInTheDocument();
    fireEvent.click(lostCheckbox);
    expect(screen.getByRole('checkbox', { name: 'All states' })).toBeChecked();
    expect(screen.getByText('Active Item')).toBeInTheDocument();
    expect(screen.getByText('Lost Item')).toBeInTheDocument();
  });

  test('renders owned for duration and handles item deletion with confirmation dialog', async () => {
    deleteItem.mockResolvedValueOnce(null);
    getAllItems.mockResolvedValue([
      {
        id: 'item-del-1',
        name: 'Desk Lamp',
        price: 50,
        purchaseDate: '2026-01-01T12:00:00Z',
        status: 'active',
        ownershipDays: 200,
        grossCostPerDay: 0.25
      }
    ]);

    render(
      <MemoryRouter>
        <ItemList />
      </MemoryRouter>
    );

    expect(await screen.findByText('Desk Lamp')).toBeInTheDocument();

    // Expand card
    fireEvent.click(screen.getByText('Desk Lamp'));

    const detailsRegion = document.getElementById('item-details-item-del-1');
    expect(within(detailsRegion).getByText('Still With You')).toBeInTheDocument();
    expect(screen.getByText('200 days')).toBeInTheDocument();

    // Click to cycle duration unit from days to months
    fireEvent.click(screen.getByText('200 days'));
    const monthsElement = screen.getByText('~6.6 months');
    expect(monthsElement).toBeInTheDocument();
    expect(monthsElement).toHaveClass('animate-calm-cycle');

    // Click again to cycle back to days (since 200 < 365)
    fireEvent.click(screen.getByText('~6.6 months'));
    const cycledDaysElement = screen.getByText('200 days');
    expect(cycledDaysElement).toBeInTheDocument();
    expect(cycledDaysElement).toHaveClass('animate-calm-cycle');

    // Click Delete to open confirmation
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete this item\?/i)).toBeInTheDocument();

    // Confirm deletion
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => {
      expect(deleteItem).toHaveBeenCalledWith('item-del-1');
      expect(mockInvalidateDashboard).toHaveBeenCalled();
      expect(mockInvalidateDurability).toHaveBeenCalled();
    });
  });

  test('getCategoryIconInfo maps categories correctly from category field only', () => {
    const audioInfo = getCategoryIconInfo('Audio');
    expect(audioInfo.containerClass).toContain('text-blue-600');

    const monitorInfo = getCategoryIconInfo('Display');
    expect(monitorInfo.containerClass).toContain('text-indigo-600');

    const laptopInfo = getCategoryIconInfo('Computer');
    expect(laptopInfo.containerClass).toContain('text-amber-600');

    const genericInfo = getCategoryIconInfo(null);
    expect(genericInfo.containerClass).toContain('text-slate-500');

    // Regression test: Uncategorized item must not infer category from item name
    const uncategorizedLaptop = getCategoryIconInfo(null);
    expect(uncategorizedLaptop.containerClass).toContain('text-slate-500');
  });

  test('getStatusBadgeStyle returns restrained semantic classes', () => {
    expect(getStatusBadgeStyle('active')).toContain('text-emerald-600 font-semibold');
    expect(getStatusBadgeStyle('sold')).toContain('text-slate-500 font-medium');
    expect(getStatusBadgeStyle('retired')).toContain('text-stone-500 font-medium');
    expect(getStatusBadgeStyle('lost')).toContain('text-rose-600 font-medium');
  });

  test('getNextDurationUnit cycles based on ownership duration thresholds', () => {
    // Under 30 days: stays in days
    expect(getNextDurationUnit('days', 14)).toBe('days');
    expect(getNextDurationUnit('months', 14)).toBe('days');

    // 30 to 364 days: cycles days <-> months
    expect(getNextDurationUnit('days', 100)).toBe('months');
    expect(getNextDurationUnit('months', 100)).toBe('days');

    // 365+ days: cycles days -> months -> years -> days
    expect(getNextDurationUnit('days', 400)).toBe('months');
    expect(getNextDurationUnit('months', 400)).toBe('years');
    expect(getNextDurationUnit('years', 400)).toBe('days');
  });

  test('formatOwnershipDuration formats days, months, and years without ownership prefix', () => {
    const mockT = (key) => ({ unitDays: 'days', unitMonths: 'months', unitYears: 'years' }[key] || key);

    expect(formatOwnershipDuration(1, 'days', mockT, 'en')).toBe('1 day');
    expect(formatOwnershipDuration(200, 'days', mockT, 'en')).toBe('200 days');
    expect(formatOwnershipDuration(200, 'months', mockT, 'en')).toBe('~6.6 months');
    expect(formatOwnershipDuration(730, 'years', mockT, 'en')).toBe('~2 years');
    expect(formatOwnershipDuration(998, 'years', mockT, 'en')).toBe('~2.7 years');

    // Indonesian localization with decimal comma
    const mockTId = (key) => ({ unitDays: 'hari', unitMonths: 'bulan', unitYears: 'tahun' }[key] || key);
    expect(formatOwnershipDuration(200, 'months', mockTId, 'id')).toBe('~6,6 bulan');
    expect(formatOwnershipDuration(998, 'years', mockTId, 'id')).toBe('~2,7 tahun');
  });

  test('CalmCycleText renders dual layers on transition', () => {
    const { rerender } = render(<CalmCycleText text="200 days" hasCycled={false} />);
    expect(screen.getByText('200 days')).toBeInTheDocument();
    expect(screen.getByText('200 days')).not.toHaveClass('animate-calm-cycle-enter');

    rerender(<CalmCycleText text="~6.6 months" hasCycled={true} />);
    expect(screen.getByText('~6.6 months')).toHaveClass('animate-calm-cycle-enter');
    expect(screen.getByText('200 days')).toHaveClass('animate-calm-cycle-exit');
  });

  test('strengthens card border and highlights chevron with teal interaction accent when expanded', async () => {
    getAllItems.mockResolvedValue([
      {
        id: 'item-card-1',
        name: 'Smart Watch',
        price: 300,
        purchaseDate: '2026-01-01T12:00:00Z',
        status: 'active',
        grossCostPerDay: 1.5,
        netCostPerDay: 1.5,
        ownershipDays: 200
      }
    ]);

    render(
      <MemoryRouter>
        <ItemList />
      </MemoryRouter>
    );

    const itemName = await screen.findByText('Smart Watch');
    const cardContainer = itemName.closest('.rounded-2xl');
    expect(cardContainer).toHaveClass('border-[#E6E8EC]');

    // Find the collapsed row and click to expand
    fireEvent.click(screen.getByText('Smart Watch'));

    // When expanded, the card border is strengthened with teal-200 and shadow
    expect(cardContainer).toHaveClass('border-teal-200');

    // The chevron receives the teal-600 interaction accent
    const chevronIcon = cardContainer.querySelector('.rotate-180');
    expect(chevronIcon).toHaveClass('text-teal-600');
  });
});
