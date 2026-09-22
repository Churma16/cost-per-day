import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ItemList from './ItemList';
import { getAllItems } from '../services/api';
import { useTotalCost } from '../contexts/TotalCostContext';
import { useCurrency } from '../contexts/CurrencyContext';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => ({
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
    }[key] || key)
  })
}));

jest.mock('../services/api', () => ({
  getAllItems: jest.fn()
}));

jest.mock('../contexts/TotalCostContext', () => ({
  useTotalCost: jest.fn()
}));

jest.mock('../contexts/CurrencyContext', () => ({
  useCurrency: jest.fn()
}));

describe('ItemList lifecycle display', () => {
  const setTotalDailyCost = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useTotalCost.mockReturnValue({ setTotalDailyCost });
    useCurrency.mockReturnValue({ currencyCode: 'USD' });
  });

  test('uses backend-derived final and net costs for sold history', async () => {
    getAllItems.mockResolvedValueOnce([{
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
    }]);

    render(
      <MemoryRouter>
        <ItemList />
      </MemoryRouter>
    );

    expect(await screen.findByText('Phone')).toBeInTheDocument();
    expect(screen.getByText('Sold')).toBeInTheDocument();
    expect(screen.getByText('Final gross cost per day')).toBeInTheDocument();
    expect(screen.getByText('$10.00/day')).toBeInTheDocument();

    await waitFor(() => {
      expect(setTotalDailyCost).toHaveBeenCalledWith(10);
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
});
