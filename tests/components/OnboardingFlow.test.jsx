import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import i18n from '../../src/i18n';
import OnboardingFlow, { OnboardingGate } from '../../src/components/OnboardingFlow';

let deviceLanguages = ['en-US'];

const LocationProbe = () => {
  const location = useLocation();
  return <div>Current route: {location.pathname}</div>;
};

const mocks = vi.hoisted(() => ({
  changeLanguage: vi.fn(),
  changeCurrency: vi.fn(),
  addEquivalent: vi.fn(),
  updateSetting: vi.fn(),
  settings: {},
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
  useSettings: () => ({ data: mocks.settings }),
  useUpdateSetting: () => ({ mutateAsync: mocks.updateSetting }),
}));

describe('first-run onboarding flow', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    deviceLanguages = ['en-US'];
    vi.spyOn(window.navigator, 'languages', 'get')
      .mockImplementation(() => deviceLanguages);
    mocks.settings = {};
    mocks.changeLanguage.mockResolvedValue(undefined);
    mocks.changeCurrency.mockResolvedValue(undefined);
    mocks.addEquivalent.mockResolvedValue({ id: 'equivalent-1' });
    mocks.updateSetting.mockResolvedValue('true');
    await i18n.changeLanguage('en');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('can finish without optional references and persists required preferences', async () => {
    const onComplete = vi.fn();
    render(<OnboardingFlow onComplete={onComplete} />);

    expect(screen.getByTestId('onboarding-shell')).toBeInTheDocument();
    expect(screen.getByTestId('onboarding-step-1')).toBeInTheDocument();
    expect(screen.getByTestId('onboarding-step-viewport')).toHaveClass('overflow-hidden');
    expect(screen.getByTestId('onboarding-progress-1')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('onboarding-progress-2')).toHaveAttribute('data-active', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Set up Worthwhile' }));
    await screen.findByTestId('onboarding-step-2');
    expect(screen.getByTestId('onboarding-progress-2')).toHaveAttribute('data-active', 'true');
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
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Bahasa Indonesia' })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Bahasa Indonesia' }));
    await screen.findByText('Buat Worthwhile terasa familiar');
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Bahasa Indonesia' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.change(screen.getByLabelText('Mata Uang'), { target: { value: 'IDR' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lanjut' }));
    await screen.findByTestId('onboarding-step-3');
    expect(screen.getByTestId('onboarding-progress-3')).toHaveAttribute('data-active', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Lewati dulu' }));

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
    await screen.findByTestId('onboarding-step-2');
    fireEvent.change(screen.getByLabelText('Currency'), { target: { value: 'IDR' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await screen.findByTestId('onboarding-step-3');
    fireEvent.click(screen.getByRole('button', { name: '+ Coffee' }));
    fireEvent.change(screen.getByLabelText('Price'), { target: { value: '25000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enter Worthwhile' }));

    await waitFor(() => expect(mocks.addEquivalent).toHaveBeenCalledWith({
      name: 'Coffee',
      amount: 25000,
      currencyCode: 'IDR',
    }));
  });

  test('uses device suggestions instead of injected guest defaults', async () => {
    deviceLanguages = ['id-ID'];
    mocks.settings = { language: 'en', currency: 'USD' };

    render(<OnboardingFlow onComplete={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Atur Worthwhile' }));
    await screen.findByText('Buat Worthwhile terasa familiar');

    expect(screen.getByRole('button', { name: 'Bahasa Indonesia' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByLabelText('Mata Uang')).toHaveValue('IDR');
  });

  test('previews Indonesian immediately and saves its localized reference name', async () => {
    render(<OnboardingFlow onComplete={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Set up Worthwhile' }));
    await screen.findByTestId('onboarding-step-2');
    fireEvent.click(screen.getByRole('button', { name: 'Bahasa Indonesia' }));
    await screen.findByText('Buat Worthwhile terasa familiar');
    fireEvent.click(screen.getByRole('button', { name: 'Lanjut' }));
    await screen.findByTestId('onboarding-step-3');
    fireEvent.click(screen.getByRole('button', { name: '+ Kopi' }));
    fireEvent.change(screen.getByLabelText('Harga'), { target: { value: '25000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Masuk ke Worthwhile' }));

    await waitFor(() => expect(mocks.addEquivalent).toHaveBeenCalledWith({
      name: 'Kopi',
      amount: 25000,
      currencyCode: 'USD',
    }));
  });

  test('gates the app until onboarding is completed', () => {
    const { rerender } = render(
      <MemoryRouter>
        <OnboardingGate><div>App content</div></OnboardingGate>
      </MemoryRouter>,
    );
    expect(screen.getByText('Welcome to Worthwhile')).toBeInTheDocument();
    expect(screen.queryByText('App content')).not.toBeInTheDocument();

    mocks.settings = { onboardingCompleted: 'true' };
    rerender(
      <MemoryRouter>
        <OnboardingGate><div>App content</div></OnboardingGate>
      </MemoryRouter>,
    );
    expect(screen.getByText('App content')).toBeInTheDocument();
  });

  test('returns to Home after completing onboarding', async () => {
    mocks.updateSetting.mockImplementation(async () => {
      mocks.settings = { onboardingCompleted: 'true' };
      return 'true';
    });

    render(
      <MemoryRouter initialEntries={['/settings']}>
        <OnboardingGate>
          <LocationProbe />
        </OnboardingGate>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Set up Worthwhile' }));
    await screen.findByTestId('onboarding-step-2');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await screen.findByTestId('onboarding-step-3');
    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }));

    expect(await screen.findByText('Current route: /')).toBeInTheDocument();
  });
});
