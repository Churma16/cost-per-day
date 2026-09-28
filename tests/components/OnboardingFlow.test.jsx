import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
  settingsQuery: {
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  },
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
  useSettings: () => ({ data: mocks.settings, ...mocks.settingsQuery }),
  useUpdateSetting: () => ({ mutateAsync: mocks.updateSetting }),
}));

describe('first-run onboarding flow', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    deviceLanguages = ['en-US'];
    vi.spyOn(window.navigator, 'languages', 'get')
      .mockImplementation(() => deviceLanguages);
    mocks.settings = {};
    mocks.settingsQuery = {
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    mocks.changeLanguage.mockResolvedValue(undefined);
    mocks.changeCurrency.mockResolvedValue(undefined);
    mocks.addEquivalent.mockResolvedValue({ id: 'equivalent-1' });
    mocks.updateSetting.mockResolvedValue('true');
    await i18n.changeLanguage('en');
  });

  afterEach(() => {
    vi.useRealTimers();
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

  test('retries only references that were not already saved', async () => {
    const onComplete = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.addEquivalent
      .mockResolvedValueOnce({ id: 'coffee' })
      .mockRejectedValueOnce(new Error('temporary save failure'))
      .mockResolvedValueOnce({ id: 'snack' })
      .mockResolvedValueOnce({ id: 'lunch' });

    render(<OnboardingFlow onComplete={onComplete} />);
    fireEvent.click(screen.getByRole('button', { name: 'Set up Worthwhile' }));
    await screen.findByTestId('onboarding-step-2');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await screen.findByTestId('onboarding-step-3');
    fireEvent.click(screen.getByRole('button', { name: '+ Coffee' }));
    fireEvent.click(screen.getByRole('button', { name: '+ Snack' }));
    fireEvent.click(screen.getByRole('button', { name: '+ Lunch' }));
    screen.getAllByLabelText('Price').forEach((input, index) => {
      fireEvent.change(input, { target: { value: String((index + 1) * 5) } });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enter Worthwhile' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Your setup choices are still here. Try again when you're ready."
    );
    expect(screen.queryByText('temporary save failure')).not.toBeInTheDocument();

    const nameInputs = screen.getAllByLabelText('Name');
    const amountInputs = screen.getAllByLabelText('Price');
    const removeButtons = screen.getAllByRole('button', { name: 'Remove reference' });
    expect(screen.getByText('Saved')).toBeInTheDocument();
    expect(nameInputs[0]).toBeDisabled();
    expect(amountInputs[0]).toBeDisabled();
    expect(removeButtons[0]).toBeDisabled();
    expect(within(screen.getByTestId('onboarding-step-3')).getByRole(
      'button',
      { name: 'Back' },
    )).toBeDisabled();
    expect(nameInputs[1]).not.toBeDisabled();
    expect(amountInputs[1]).not.toBeDisabled();
    fireEvent.change(nameInputs[0], { target: { value: 'Latte' } });
    fireEvent.click(removeButtons[0]);
    expect(nameInputs[0]).toHaveValue('Coffee');
    expect(screen.getAllByLabelText('Name')).toHaveLength(3);

    fireEvent.click(screen.getByRole('button', { name: 'Enter Worthwhile' }));

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(mocks.addEquivalent.mock.calls.map(([reference]) => reference.name)).toEqual([
      'Coffee',
      'Snack',
      'Snack',
      'Lunch',
    ]);
    expect(mocks.updateSetting).toHaveBeenCalledWith({
      key: 'onboardingCompleted',
      value: 'true',
    });
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

  test('shows a neutral launch loader while onboarding status loads', () => {
    vi.useFakeTimers();
    mocks.settingsQuery = {
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    };

    const { container } = render(
      <MemoryRouter>
        <OnboardingGate><div>App content</div></OnboardingGate>
      </MemoryRouter>,
    );

    expect(screen.queryByText('App content')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(container.querySelector('.state-skeleton')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(screen.getByTestId('application-launch-loader')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Getting your items ready...' })).toBeInTheDocument();
    expect(screen.queryByRole('note')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1800);
    });

    expect(screen.getByRole('note')).toHaveTextContent('Cost per day gradually settles as the days of ownership add up.');
    expect(screen.queryByText('Welcome to Worthwhile')).not.toBeInTheDocument();
  });

  test('keeps the neutral launch loader consistent on Settings during bootstrap', () => {
    vi.useFakeTimers();
    mocks.settingsQuery = {
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    };

    render(
      <MemoryRouter initialEntries={['/settings']}>
        <OnboardingGate><div>Settings content</div></OnboardingGate>
      </MemoryRouter>,
    );

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(screen.queryByText('Settings content')).not.toBeInTheDocument();
    expect(screen.getByTestId('application-launch-loader')).toBeInTheDocument();
    expect(screen.queryByText('Welcome to Worthwhile')).not.toBeInTheDocument();
  });

  test('offers retry when onboarding settings bootstrap fails', () => {
    const refetch = vi.fn();
    mocks.settingsQuery = {
      data: undefined,
      isLoading: false,
      error: new Error('raw settings transport failure'),
      refetch,
    };

    render(
      <MemoryRouter>
        <OnboardingGate><div>App content</div></OnboardingGate>
      </MemoryRouter>,
    );

    const errorState = screen.getByRole('status');
    expect(errorState).toHaveTextContent("Couldn't load your setup. Check your connection and try again.");
    expect(errorState).not.toHaveTextContent('raw settings transport failure');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalledTimes(1);
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
