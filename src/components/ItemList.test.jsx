import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import ItemList from './ItemList';
import { getAllItems } from '../services/api';
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
        ownershipEndDate: 'Ownership end date',
        salePrice: 'Sale price',
        netOwnershipCost: 'Net ownership cost',
        netCostPerDay: 'Net cost per day',
        edit: 'Edit'
      }[key] || key;
    }
  })
}));

vi.mock('../services/api', () => ({
  getAllItems: vi.fn()
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
    expect(screen.getByText('$10.00/day')).toBeInTheDocument();

    expect(screen.getByText('Laptop')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('$4.00/day')).toBeInTheDocument();

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
});
