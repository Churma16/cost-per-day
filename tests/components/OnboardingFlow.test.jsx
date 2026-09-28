import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import '../../src/i18n';
import OnboardingFlow from '../../src/components/OnboardingFlow';

const mocks = vi.hoisted(() => ({
  changeLanguage: vi.fn(),
  changeCurrency: vi.fn(),
  addEquivalent: vi.fn(),
  updateSetting: vi.fn(),
}));

vi.mock('../../src/contexts/LanguageContext', () => ({
  SUPPORTED_LANGUAGES: ['en', 'id'],
  useLanguage: () => ({ changeLanguage: mocks.changeLanguage }),
}));

vi.mock('../../src/contexts/CurrencyContext', () => ({
  useCurrency: () => ({ currencyCode: 'USD', changeCurrency: mocks.changeCurrency }),
  getSupportedCurrencies: () => [
    { code: 'USD', symbol: '$', nameKey: 'usd' },
    { code: 'IDR', symbol: 'Rp', nameKey: 'idr' },
  ],
}));

vi.mock('../../src/contexts/ValueEquivalentsContext', () => ({
  useValueEquivalents: () => ({ addEquivalent: mocks.addEquivalent }),
}));

vi.mock('../../src/hooks/useSettings', () => ({
  useSettings: () => ({ data: {} }),
  useUpdateSetting: () => ({ mutateAsync: mocks.updateSetting }),
}));

describe('first-run onboarding flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.changeLanguage.mockResolvedValue(undefined);
    mocks.changeCurrency.mockResolvedValue(undefined);
    mocks.addEquivalent.mockResolvedValue({ id: 'equivalent-1' });
    mocks.updateSetting.mockResolvedValue('true');
  });

  test('can finish without optional references and persists required preferences', async () => {
    const onComplete = vi.fn();
    render(<OnboardingFlow onComplete={onComplete} />);

    fireEvent.click(screen.getByRole('button', { name: 'Set up Worthwhile' }));
    expect(screen.getByTestId('language-options')).toHaveClass('flex', 'flex-wrap');
    expect(screen.getByRole('button', { name: 'English' })).toHaveClass(
      'min-w-[10rem]',
      'flex-1',
      'whitespace-nowrap',
    );
    expect(screen.getByRole('button', { name: 'Bahasa Indonesia' })).toHaveClass(
      'min-w-[10rem]',
      'flex-1',
      'whitespace-nowrap',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Bahasa Indonesia' }));
    fireEvent.change(screen.getByLabelText('Currency'), { target: { value: 'IDR' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }));

    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    expect(mocks.changeLanguage).toHaveBeenCalledWith('id');
    expect(mocks.changeCurrency).toHaveBeenCalledWith('IDR');
    expect(mocks.addEquivalent).not.toHaveBeenCalled();
    expect(mocks.updateSetting).toHaveBeenCalledWith({
      key: 'onboardingCompleted',
      value: 'true',
    });
  });

  test('saves a suggested everyday reference in the selected currency', async () => {
    render(<OnboardingFlow onComplete={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Set up Worthwhile' }));
    fireEvent.change(screen.getByLabelText('Currency'), { target: { value: 'IDR' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: '+ Coffee' }));
    fireEvent.change(screen.getByLabelText('Price'), { target: { value: '25000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enter Worthwhile' }));

    await waitFor(() => expect(mocks.addEquivalent).toHaveBeenCalledWith({
      name: 'Coffee',
      amount: 25000,
      currencyCode: 'IDR',
    }));
  });
});
