import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { vi } from 'vitest';
import PlannedPurchaseCreateForm from '../../src/components/PlannedPurchaseCreateForm';
import * as plannedPurchaseService from '../../src/services/plannedPurchaseService';
import {
  getPlannedPurchaseDraftStorageKey,
  writePlannedPurchaseDraft,
} from '../../src/utils/plannedPurchaseDraft';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => ({
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
      targetDate: 'Target date',
      planningDisclaimer: 'Planning disclaimer',
      cancel: 'Cancel',
      save: 'Save',
      loading: 'Loading...',
      currency: 'Currency',
      usd: 'US Dollar (USD)',
      idr: 'Indonesian Rupiah (IDR)',
    })[key] || key,
  }),
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('../../src/contexts/CurrencyContext', () => ({
  useCurrency: () => ({ currencyCode: 'IDR', currencySymbol: 'Rp' }),
}));

vi.mock('../../src/services/plannedPurchaseService', () => ({
  fetchPlannedPurchases: vi.fn(),
  createPlannedPurchase: vi.fn(),
  updatePlannedPurchase: vi.fn(),
  deletePlannedPurchase: vi.fn(),
}));

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

const renderForm = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/add?type=planned']}>
        <Routes>
          <Route path="/add" element={<PlannedPurchaseCreateForm />} />
          <Route path="/planning" element={<div>Planning page</div>} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('PlannedPurchaseCreateForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('restores a planned draft, creates through the existing mutation, and returns to Planning', async () => {
    writePlannedPurchaseDraft('user-1', {
      name: 'Camera',
      targetPrice: '5000000',
      currencyCode: 'IDR',
      planningMode: 'contributionToTime',
      contributionCadence: 'daily',
      contributionAmount: '50000',
      targetDate: '',
    });
    plannedPurchaseService.createPlannedPurchase.mockResolvedValue({ id: 'plan-1' });

    renderForm();
    expect(screen.getByLabelText(/Target item name/)).toHaveValue('Camera');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(plannedPurchaseService.createPlannedPurchase).toHaveBeenCalledWith({
        name: 'Camera',
        targetPrice: 5000000,
        currencyCode: 'IDR',
        targetDate: null,
        contributionAmount: 50000,
        contributionCadence: 'daily',
      });
      expect(screen.getByTestId('location')).toHaveTextContent('/planning');
    });
    expect(window.localStorage.getItem(getPlannedPurchaseDraftStorageKey('user-1'))).toBeNull();
  });
});
