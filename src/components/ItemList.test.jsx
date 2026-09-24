import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import ItemList, {
  getCategoryIconInfo,
  getStatusBadgeStyle,
  getNextDurationUnit,
  formatOwnershipDuration,
  CalmCycleText
} from './ItemList';
import { getAllItems, deleteItem } from '../services/api';
import { useTotalCost } from '../contexts/TotalCostContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useValueEquivalents } from '../contexts/ValueEquivalentsContext';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
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
        statusActive: 'Active',
        statusRetired: 'Retired',
        statusSold: 'Sold',
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
        netOwnershipCost: 'Net ownership cost',
        netCostPerDay: 'Net cost per day',
        targetMilestone: 'Target milestone',
        targetStateNew: 'New',
        targetStateReached: 'Target reached',
        edit: 'Edit',
        yourItems: 'Your Items',
        sortedHighestCost: 'Sorted: highest cost',
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

vi.mock('../services/api', () => ({
  getAllItems: vi.fn(),
  deleteItem: vi.fn()
}));

vi.mock('../contexts/TotalCostContext', () => ({
  useTotalCost: vi.fn()
}));

vi.mock('../contexts/CurrencyContext', () => ({
  useCurrency: vi.fn()
}));

vi.mock('../contexts/ValueEquivalentsContext', () => ({
  useValueEquivalents: vi.fn()
}));

describe('ItemList lifecycle display', () => {
  const setTotalDailyCost = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useTotalCost.mockReturnValue({ setTotalDailyCost });
    useCurrency.mockReturnValue({ currencyCode: 'USD' });
    useValueEquivalents.mockReturnValue({ valueEquivalents: [] });
  });

  test('uses backend-derived final and net costs for sold history', async () => {
    getAllItems.mockResolvedValueOnce([
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
    expect(screen.getByText('Sold')).toBeInTheDocument();
    expect(screen.getByText('Final gross cost per day')).toBeInTheDocument();
    expect(screen.getByText('$10.00')).toBeInTheDocument();

    expect(screen.getByText('Laptop')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('$4.00')).toBeInTheDocument();

    await waitFor(() => {
      expect(setTotalDailyCost).toHaveBeenCalledWith(4);
    });

    fireEvent.click(screen.getByText('Phone'));

    expect(screen.getByText('Ownership end date')).toBeInTheDocument();
    expect(screen.getByText('Sale price')).toBeInTheDocument();
    expect(screen.getByText('$40.00')).toBeInTheDocument();
    expect(screen.getByText('Net ownership cost')).toBeInTheDocument();
    expect(screen.getByText('$60.00')).toBeInTheDocument();
    expect(screen.getByText('Net cost per day')).toBeInTheDocument();
    expect(screen.getByText('$6.00/day')).toBeInTheDocument();
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

    // Header badge should display rounded percentage
    expect(await screen.findByText('In progress (66%)')).toBeInTheDocument();

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

    expect(await screen.findByText('Beyond target (+14d)')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Mechanical Keyboard'));

    expect(screen.getByText('14 days beyond target')).toBeInTheDocument();
    expect(screen.getByText('114%')).toBeInTheDocument();
  });

  test('renders section header and does not render redundant currentCostPerDay for active items', async () => {
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
    expect(screen.getByText('Sorted: highest cost')).toBeInTheDocument();
    expect(screen.getByText('Jabra Elite 4')).toBeInTheDocument();
    expect(screen.queryByText('Current cost per day')).not.toBeInTheDocument();
  });

  test('renders owned for duration and handles item deletion with confirmation dialog', async () => {
    deleteItem.mockResolvedValueOnce(null);
    getAllItems.mockResolvedValueOnce([
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

    expect(screen.getByText('Owned for')).toBeInTheDocument();
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
    });
  });

  test('getCategoryIconInfo maps categories correctly', () => {
    const audioInfo = getCategoryIconInfo('Audio', 'Headphones');
    expect(audioInfo.containerClass).toContain('text-blue-600');

    const monitorInfo = getCategoryIconInfo('Display', 'LG Monitor 24');
    expect(monitorInfo.containerClass).toContain('text-indigo-600');

    const laptopInfo = getCategoryIconInfo('Computer', 'Asus TUF Laptop');
    expect(laptopInfo.containerClass).toContain('text-amber-600');

    const genericInfo = getCategoryIconInfo(null, 'Backpack');
    expect(genericInfo.containerClass).toContain('text-slate-500');
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
});
