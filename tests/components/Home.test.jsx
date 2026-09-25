import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { HomeHeader } from '../../src/components/Home';
import { useCurrency } from '../../src/contexts/CurrencyContext';
import { useTotalCost } from '../../src/contexts/TotalCostContext';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => ({
      totalDailyCost: 'Daily Ownership Cost',
      perDay: '/day',
    }[key] || key),
  }),
}));

vi.mock('../../src/components/HeroCarousel', () => ({
  default: () => <div>Insight carousel</div>,
}));

vi.mock('../../src/contexts/CurrencyContext', () => ({
  useCurrency: vi.fn(),
}));

vi.mock('../../src/contexts/TotalCostContext', () => ({
  useTotalCost: vi.fn(),
}));

describe('HomeHeader', () => {
  test('keeps a large IDR daily cost inside a wrapping summary row', () => {
    useCurrency.mockReturnValue({ currencyCode: 'IDR' });
    useTotalCost.mockReturnValue({ totalDailyCost: 987654321012 });

    render(<HomeHeader />);

    const label = screen.getByText('Daily Ownership Cost');
    const summaryRow = label.parentElement;
    const value = label.nextElementSibling;
    const header = screen.getByRole('banner');
    const headerContent = header.firstElementChild;

    expect(header).toHaveClass('w-full', 'min-w-0');
    expect(headerContent).toHaveClass('w-full', 'min-w-0', 'max-w-lg');
    expect(summaryRow).toHaveClass(
      'w-full',
      'min-w-0',
      'grid-cols-[minmax(0,1fr)_auto]'
    );
    expect(value).toHaveClass('max-w-full', 'whitespace-nowrap', 'text-right');
    expect(value).toHaveTextContent(/Rp/);
    expect(value).toHaveTextContent('/day');
  });
});
