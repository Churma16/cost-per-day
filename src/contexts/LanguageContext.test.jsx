import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { LanguageProvider, useLanguage } from './LanguageContext';
import { getSetting, updateSetting } from '../services/api';
import i18n from '../i18n';

vi.mock('../services/api', () => ({
  getSetting: vi.fn(),
  updateSetting: vi.fn(),
}));

vi.mock('../i18n', () => ({
  default: {
    changeLanguage: vi.fn(),
  },
}));

const TestLanguageConsumer = () => {
  const { language, changeLanguage } = useLanguage();

  return (
    <div>
      <span data-testid="language-code">{language}</span>
      <button onClick={() => changeLanguage('id')}>Set Indonesian</button>
    </div>
  );
};

describe('LanguageContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    i18n.changeLanguage.mockResolvedValue(undefined);
  });

  test('loads persisted Indonesian language from storage', async () => {
    getSetting.mockResolvedValue('id');

    render(
      <LanguageProvider>
        <TestLanguageConsumer />
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('language-code')).toHaveTextContent('id');
    });

    expect(i18n.changeLanguage).toHaveBeenCalledWith('id');
    expect(updateSetting).not.toHaveBeenCalled();
  });

  test('persists Indonesian and restores it after provider remount', async () => {
    let savedLanguage = 'en';

    getSetting.mockImplementation(async () => savedLanguage);
    updateSetting.mockImplementation(async (key, value) => {
      if (key === 'language') {
        savedLanguage = value;
      }
    });

    const firstRender = render(
      <LanguageProvider>
        <TestLanguageConsumer />
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('language-code')).toHaveTextContent('en');
    });

    await act(async () => {
      screen.getByRole('button', { name: 'Set Indonesian' }).click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('language-code')).toHaveTextContent('id');
    });

    expect(updateSetting).toHaveBeenCalledWith('language', 'id');

    firstRender.unmount();

    render(
      <LanguageProvider>
        <TestLanguageConsumer />
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('language-code')).toHaveTextContent('id');
    });

    expect(getSetting).toHaveBeenCalledTimes(2);
    expect(i18n.changeLanguage).toHaveBeenLastCalledWith('id');
  });
});
