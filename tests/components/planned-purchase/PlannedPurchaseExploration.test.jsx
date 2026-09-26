import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import PlannedPurchaseExploration from '../../../src/components/planned-purchase/PlannedPurchaseExploration';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => {
      if (key === 'reachTargetInDays') {
        return `Reach in ${options?.days} days`;
      }
      if (key === 'reachTargetIn') {
        return `Reach in ${options?.periods} ${options?.periodUnit} (${options?.days} days)`;
      }
      return {
        exploreFraming: 'Explore framing',
        explorePaceDescription: 'Try another pace',
        cadence: 'Cadence',
        cadenceDaily: 'Daily',
        cadenceWeekly: 'Weekly',
        cadenceMonthly: 'Monthly',
        recurringContribution: 'Recurring contribution',
        recurringContributionAdjustForCadence: 'Recurring contribution (adjust for new cadence)',
        enterContributionAmount: 'Enter contribution amount',
        unitDays: 'days',
        unitWeeks: 'weeks',
        unitMonths: 'months',
        previewUnsaved: 'Preview, unsaved',
        apply: 'Apply',
        applyChanges: 'Apply changes',
        cancel: 'Cancel',
        saving: 'Saving...',
        operationFailed: 'Operation failed',
      }[key] || key;
    },
  }),
}));

describe('PlannedPurchaseExploration', () => {
  test('owns what-if state locally and renders the shared projection result when expanded', () => {
    render(
      <PlannedPurchaseExploration
        targetPrice={300}
        currencyCode="USD"
        initialContributionAmount={100}
        initialCadence="daily"
      />
    );

    const toggle = screen.getByRole('button', { name: /explore framing/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Reach in 3 days')).toBeInTheDocument();
    expect(screen.getByText('Try another pace')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /apply/i })).toBeDisabled();
    expect(screen.queryByText('Preview, unsaved')).not.toBeInTheDocument();
  });

  test('detects dirty state when contribution amount is changed, displays preview badge, and can cancel reset', () => {
    render(
      <PlannedPurchaseExploration
        targetPrice={300}
        currencyCode="USD"
        initialContributionAmount={100}
        initialCadence="daily"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /explore framing/i }));

    const input = screen.getByPlaceholderText('Enter contribution amount');
    fireEvent.change(input, { target: { value: '150' } });

    expect(screen.getByText('Preview, unsaved')).toBeInTheDocument();
    expect(screen.getByText('Reach in 2 days')).toBeInTheDocument();

    const applyButton = screen.getByRole('button', { name: /apply changes/i });
    expect(applyButton).toBeEnabled();

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(screen.queryByText('Preview, unsaved')).not.toBeInTheDocument();
    expect(screen.getByText('Reach in 3 days')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /apply/i })).toBeDisabled();
  });

  test('calls onApplyScenario with updated parameters and closes accordion on success', async () => {
    const handleApplyScenario = vi.fn().mockResolvedValue();

    render(
      <PlannedPurchaseExploration
        targetPrice={1000}
        currencyCode="USD"
        initialContributionAmount={50}
        initialCadence="weekly"
        onApplyScenario={handleApplyScenario}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /explore framing/i }));

    const input = screen.getByPlaceholderText('Enter contribution amount');
    fireEvent.change(input, { target: { value: '100' } });

    const applyButton = screen.getByRole('button', { name: /apply changes/i });
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(handleApplyScenario).toHaveBeenCalledWith({
        contributionAmount: 100,
        contributionCadence: 'weekly',
      });
    });

    // Accordion automatically closes on successful save
    expect(screen.getByRole('button', { name: /explore framing/i })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });

  test('preserves user draft input and displays inline error if apply fails', async () => {
    const handleApplyScenario = vi.fn().mockRejectedValue(new Error('Network error on save'));

    render(
      <PlannedPurchaseExploration
        targetPrice={1000}
        currencyCode="USD"
        initialContributionAmount={50}
        initialCadence="weekly"
        onApplyScenario={handleApplyScenario}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /explore framing/i }));

    const input = screen.getByPlaceholderText('Enter contribution amount');
    fireEvent.change(input, { target: { value: '200' } });

    const applyButton = screen.getByRole('button', { name: /apply changes/i });
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(screen.getByText('Network error on save')).toBeInTheDocument();
    });

    // Draft input is preserved, accordion remains open
    expect(screen.getByPlaceholderText('Enter contribution amount')).toHaveValue('200');
    expect(screen.getByRole('button', { name: /explore framing/i })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });
});
