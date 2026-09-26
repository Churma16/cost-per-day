import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PlannedPurchaseEditDialog from '../../../src/components/planned-purchase/PlannedPurchaseEditDialog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => ({
      editPlannedPurchase: 'Edit Planned Purchase',
      close: 'Close',
      itemPrice: 'Item price',
      targetPrice: 'Item price',
      enterItemPrice: 'Enter item price',
      targetItemName: 'Target item name',
      enterTargetItemName: 'e.g. Laptop',
      planningMode: 'What do you want to start with?',
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
      save: 'Save',
      cancel: 'Cancel',
      loading: 'Loading...',
      currency: 'Currency',
      usd: 'US Dollar (USD)',
      idr: 'Indonesian Rupiah (IDR)',
    })[key] || key,
  }),
}));

vi.mock('../../../src/contexts/CurrencyContext', () => ({
  useCurrency: () => ({ currencyCode: 'USD', currencySymbol: '$' }),
}));

describe('PlannedPurchaseEditDialog', () => {
  const mockPlan = {
    id: 'plan-1',
    name: 'Mechanical Keyboard',
    targetPrice: 200,
    currencyCode: 'USD',
    contributionAmount: 20,
    contributionCadence: 'weekly',
  };

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <PlannedPurchaseEditDialog
        isOpen={false}
        item={mockPlan}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders as a dialog modal drawer with item data when isOpen is true', () => {
    render(
      <PlannedPurchaseEditDialog
        isOpen={true}
        item={mockPlan}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-labelledby', 'planned-purchase-edit-title');
    expect(screen.getByText('Edit Planned Purchase')).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/Target item name/);
    expect(nameInput).toHaveValue('Mechanical Keyboard');
  });

  it('calls onClose when close icon button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <PlannedPurchaseEditDialog
        isOpen={true}
        item={mockPlan}
        onClose={handleClose}
        onSubmit={vi.fn()}
      />
    );

    const closeButton = screen.getByRole('button', { name: 'Close' });
    fireEvent.click(closeButton);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    const handleClose = vi.fn();
    render(
      <PlannedPurchaseEditDialog
        isOpen={true}
        item={mockPlan}
        onClose={handleClose}
        onSubmit={vi.fn()}
      />
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onSubmit when form is saved', () => {
    const handleSubmit = vi.fn();
    render(
      <PlannedPurchaseEditDialog
        isOpen={true}
        item={mockPlan}
        onClose={vi.fn()}
        onSubmit={handleSubmit}
      />
    );

    const saveButton = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(saveButton);

    expect(handleSubmit).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Mechanical Keyboard',
      targetPrice: 200,
      currencyCode: 'USD',
    }));
  });
});
