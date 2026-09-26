import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ItemOwnershipTargetCard from '../../src/components/item-form/ItemOwnershipTargetCard';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
  }),
}));

describe('ItemOwnershipTargetCard', () => {
  it('renders benchmark mode with completed items', () => {
    const { container } = render(
      <ItemOwnershipTargetCard
        targetMode="benchmark"
        onTargetModeChange={vi.fn()}
        targetType="none"
        onTargetTypeChange={vi.fn()}
        targetValue=""
        onTargetValueChange={vi.fn()}
        currencySymbol="Rp"
        currencyCode="IDR"
        equivalentTargetNote={null}
        completedItems={[{ id: 'item-1', name: 'Demo Item', grossCostPerDay: 20000 }]}
        selectedBenchmarkItemId="item-1"
        onSelectBenchmarkItemId={vi.fn()}
        onOpenBenchmarkModal={vi.fn()}
      />
    );

    const benchmarkPanel = screen.getByTestId('benchmark-ownership-target-panel');
    expect(benchmarkPanel).toHaveAttribute('aria-hidden', 'false');
    expect(benchmarkPanel).not.toHaveClass('h-0');
    const manualPanel = screen.getByTestId('manual-ownership-target-panel');
    expect(manualPanel).toHaveAttribute('aria-hidden', 'true');
    expect(manualPanel).toHaveClass('h-0');
    expect(manualPanel).toHaveClass('overflow-hidden');
  });

  it('collapses benchmark panel when initialized in manual mode', () => {
    render(
      <ItemOwnershipTargetCard
        targetMode="manual"
        onTargetModeChange={vi.fn()}
        targetType="cost_per_day"
        onTargetTypeChange={vi.fn()}
        targetValue="15000"
        onTargetValueChange={vi.fn()}
        currencySymbol="Rp"
        currencyCode="IDR"
        equivalentTargetNote={null}
        completedItems={[]}
        selectedBenchmarkItemId=""
        onSelectBenchmarkItemId={vi.fn()}
        onOpenBenchmarkModal={vi.fn()}
      />
    );

    const manualPanel = screen.getByTestId('manual-ownership-target-panel');
    expect(manualPanel).toHaveAttribute('aria-hidden', 'false');
    expect(manualPanel).not.toHaveClass('h-0');
    const benchmarkPanel = screen.getByTestId('benchmark-ownership-target-panel');
    expect(benchmarkPanel).toHaveAttribute('aria-hidden', 'true');
    expect(benchmarkPanel).toHaveClass('h-0');
    expect(benchmarkPanel).toHaveClass('overflow-hidden');
  });
});
