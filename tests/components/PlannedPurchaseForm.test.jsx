import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import PlannedPurchaseForm from '../../src/components/PlannedPurchaseForm';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => ({
      targetItemName: 'Target item name',
      requiredSection: 'REQUIRED',
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
      usd: 'US Dollar (USD)',
      idr: 'Indonesian Rupiah (IDR)',
    })[key] || key,
  }),
}));

vi.mock('../../src/contexts/CurrencyContext', () => ({
  useCurrency: () => ({ currencyCode: 'IDR', currencySymbol: 'Rp' }),
}));

const renderForm = (props = {}) => {
  const onSubmit = vi.fn();
  render(
    <PlannedPurchaseForm
      onSubmit={onSubmit}
      onCancel={vi.fn()}
      {...props}
    />
  );
  return onSubmit;
};

describe('PlannedPurchaseForm', () => {
  it('preserves existing contribution-mode validation and payload behavior', () => {
    const onSubmit = renderForm();
    expect(screen.getByRole('heading', { name: 'REQUIRED' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Target item name/)).toHaveClass('rounded-xl');
    expect(screen.getByRole('button', { name: 'Save' })).toHaveClass('w-full');
    fireEvent.change(screen.getByLabelText(/Target item name/), { target: { value: 'Camera' } });
    fireEvent.change(screen.getByLabelText(/Target price/), { target: { value: '5000000' } });
    fireEvent.change(screen.getByLabelText('Recurring contribution'), { target: { value: '50000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Camera',
      targetPrice: 5000000,
      currencyCode: 'IDR',
      targetDate: null,
      contributionAmount: 50000,
      contributionCadence: 'daily',
    });
  });

  it('clears contribution fields when switching to target-date mode', () => {
    const onSubmit = renderForm();
    fireEvent.change(screen.getByLabelText(/Target item name/), { target: { value: 'Winter Coat' } });
    fireEvent.change(screen.getByLabelText(/Target price/), { target: { value: '1200000' } });
    fireEvent.change(screen.getByLabelText('Recurring contribution'), { target: { value: '14000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Choose a target date' }));
    fireEvent.change(screen.getByLabelText('Target date'), { target: { value: '2028-12-31' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Winter Coat',
      targetPrice: 1200000,
      currencyCode: 'IDR',
      targetDate: '2028-12-31',
      contributionAmount: null,
      contributionCadence: null,
    });
  });

  it('restores the selected planning mode from a creation draft', () => {
    renderForm({
      initialData: {
        name: 'Laptop',
        targetPrice: '18000000',
        currencyCode: 'IDR',
        planningMode: 'targetDateToContribution',
        contributionCadence: 'daily',
        contributionAmount: '',
        targetDate: '',
      },
    });

    expect(screen.getByLabelText('Target date')).toBeInTheDocument();
    expect(screen.queryByLabelText('Recurring contribution')).not.toBeInTheDocument();
  });
});
