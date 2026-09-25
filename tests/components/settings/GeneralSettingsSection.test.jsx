import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import GeneralSettingsSection from '../../../src/components/settings/GeneralSettingsSection';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => ({
      general: 'General',
      language: 'Language',
      currency: 'Currency',
    }[key] || key),
  }),
}));

describe('GeneralSettingsSection', () => {
  test('delegates preference selection without owning persistence side effects', () => {
    const onOpenLanguage = vi.fn();
    const onOpenCurrency = vi.fn();

    render(
      <GeneralSettingsSection
        language="en"
        languageName="English"
        selectedCurrencyOption={{ code: 'USD', symbol: '$', name: 'US Dollar' }}
        isInteractionBlocked={false}
        onOpenLanguage={onOpenLanguage}
        onOpenCurrency={onOpenCurrency}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Language: English' }));
    fireEvent.click(screen.getByRole('button', { name: 'Currency: $ US Dollar' }));

    expect(onOpenLanguage).toHaveBeenCalledTimes(1);
    expect(onOpenCurrency).toHaveBeenCalledTimes(1);
  });
});
