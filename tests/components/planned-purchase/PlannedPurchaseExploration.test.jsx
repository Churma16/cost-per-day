import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
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
        enterContributionAmount: 'Enter contribution amount',
        unitDays: 'days',
        unitWeeks: 'weeks',
        unitMonths: 'months',
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

    const toggle = screen.getByRole('button', { name: 'Explore framing' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Reach in 3 days')).toBeInTheDocument();
    expect(screen.getByText('Try another pace')).toBeInTheDocument();
  });
});
