import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PlannedPurchaseCard from '../../src/components/PlannedPurchaseCard';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'en' },
    t: (key, options) => {
      if (key === 'reachTargetInDays') {
        return `About ${options?.days} days`;
      }
      if (key === 'reachTargetIn') {
        return `About ${options?.periods} ${options?.periodUnit} (~${options?.days} days)`;
      }
      if (key === 'targetDatePrefix') {
        return `Target ${options?.date}`;
      }
      if (key === 'estimatedTargetPrefix') {
        return `Estimated target · ${options?.date}`;
      }
      if (key === 'needsPace') {
        return `Needs ≈ ${options?.daily} · ${options?.monthly}`;
      }
      if (key === 'timeRemainingWeeks') {
        return `~${options?.weeks} weeks remaining`;
      }
      if (key === 'approxDurationWeeks') {
        return `~${options?.weeks} weeks`;
      }
      const translations = {
        itemPrice: 'Item price',
        targetPrice: 'Item price',
        contributionPace: 'Contribution pace',
        statusPlanned: 'Planned',
        edit: 'Edit',
        deleteItem: 'Delete Item',
        targetDate: 'Target date',
        reachedAround: 'Estimated completion',
        saved: 'Saved',
        cadencePerDaily: 'per day',
        cadencePerWeekly: 'per week',
        cadencePerMonthly: 'per month',
        unitDays: 'days',
        unitWeeks: 'weeks',
        unitMonths: 'months',
        noScenarioConfigured: 'No pace configured',
        configurePacePrompt: 'Set a contribution pace to see an estimated completion date.',
        exploreFraming: 'Try a different pace',
      };
      return translations[key] || key;
    },
  }),
}));

describe('PlannedPurchaseCard Component', () => {
  const mockContributionPurchase = {
    id: 'plan-1',
    name: 'Flagship Smartphone',
    targetPrice: 16000000,
    currencyCode: 'IDR',
    contributionAmount: 500000,
    contributionCadence: 'weekly',
    estimatedPeriods: 32,
    estimatedDays: 224,
  };

  const mockTargetDatePurchase = {
    id: 'plan-2',
    name: 'Stranger Than Heaven',
    targetPrice: 849000,
    currencyCode: 'IDR',
    targetDate: '2027-01-15',
    requiredDailyContribution: 7447,
    requiredMonthlyContribution: 226524,
  };

  it('renders contribution-based plan in collapsed state with constraint pace and derived expected date', () => {
    const handleToggle = vi.fn();

    render(
      <PlannedPurchaseCard
        plannedPurchase={mockContributionPurchase}
        isExpanded={false}
        onToggle={handleToggle}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    const toggleButton = screen.getByRole('button', { name: /flagship smartphone/i });
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
    expect(toggleButton).toHaveAttribute(
      'aria-controls',
      'planned-purchase-details-plan-1'
    );

    expect(screen.getByText('Flagship Smartphone')).toBeInTheDocument();
    expect(screen.getAllByText('Rp 16.000.000')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Rp 500.000 per week')[0]).toBeInTheDocument();
    expect(screen.getByText(/Estimated target ·/i)).toBeInTheDocument();

    fireEvent.click(toggleButton);
    expect(handleToggle).toHaveBeenCalledTimes(1);
  });

  it('renders target-date plan in collapsed state with date constraint and derived daily/monthly pace', () => {
    render(
      <PlannedPurchaseCard
        plannedPurchase={mockTargetDatePurchase}
        isExpanded={false}
        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText('Stranger Than Heaven')).toBeInTheDocument();
    expect(screen.getAllByText('Rp 849.000')[0]).toBeInTheDocument();
    expect(screen.getByText('Target 15 Jan 2027')).toBeInTheDocument();
    expect(screen.getByText(/Needs ≈ Rp 7.447 per day · Rp 226.524 per month/i)).toBeInTheDocument();
  });

  it('renders expanded state with action buttons and primary planning hero panel', () => {
    const handleEdit = vi.fn();
    const handleDelete = vi.fn();

    render(
      <PlannedPurchaseCard
        plannedPurchase={mockContributionPurchase}
        isExpanded={true}
        onToggle={vi.fn()}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    );

    const region = document.getElementById('planned-purchase-details-plan-1');
    expect(region).toHaveAttribute('aria-hidden', 'false');

    // Standard action buttons at bottom matching Home (Option A)
    const editButton = screen.getByRole('button', { name: 'Edit' });
    const deleteButton = screen.getByRole('button', { name: 'Delete Item' });

    expect(editButton).toBeInTheDocument();
    expect(deleteButton).toBeInTheDocument();

    fireEvent.click(editButton);
    expect(handleEdit).toHaveBeenCalledWith(mockContributionPurchase);

    fireEvent.click(deleteButton);
    expect(handleDelete).toHaveBeenCalledWith('plan-1');

    // InfoTiles
    expect(screen.getByText('Item price')).toBeInTheDocument();
    expect(screen.getByText('Contribution pace')).toBeInTheDocument();

    // Hero section
    expect(screen.getByText('Estimated completion')).toBeInTheDocument();
    expect(screen.getByText('Saved')).toBeInTheDocument();
    expect(screen.getByText(/About 32 weeks/i)).toBeInTheDocument();
  });
});
