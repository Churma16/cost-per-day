import React from 'react';
import { act, render as testingLibraryRender, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { LanguageProvider, useLanguage } from '../../src/contexts/LanguageContext';
import { getAllSettings, updateSetting } from '../../src/services/api';
import i18n from '../../src/i18n';

vi.mock('../../src/services/api', () => ({
  getAllSettings: vi.fn(),
  updateSetting: vi.fn(),
}));

vi.mock('../../src/i18n', () => ({
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

const render = (ui) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return testingLibraryRender(ui, {
    wrapper: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  });
};

describe('LanguageContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    i18n.changeLanguage.mockResolvedValue(undefined);
  });

  test('loads persisted Indonesian language from storage', async () => {
    getAllSettings.mockResolvedValue({ language: 'id' });

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

    getAllSettings.mockImplementation(async () => ({ language: savedLanguage }));
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

    expect(getAllSettings).toHaveBeenCalledTimes(2);
    expect(i18n.changeLanguage).toHaveBeenLastCalledWith('id');
  });

  test('falls back safely to English when persisted language is deprioritized (fr or zh) or unknown', async () => {
    // Persisted as 'fr'
    getAllSettings.mockResolvedValue({ language: 'fr' });

    const frRender = render(
      <LanguageProvider>
        <TestLanguageConsumer />
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('language-code')).toHaveTextContent('en');
    });

    expect(i18n.changeLanguage).toHaveBeenCalledWith('en');
    frRender.unmount();

    // Persisted as 'zh'
    getAllSettings.mockResolvedValue({ language: 'zh' });

    const zhRender = render(
      <LanguageProvider>
        <TestLanguageConsumer />
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('language-code')).toHaveTextContent('en');
    });

    expect(i18n.changeLanguage).toHaveBeenCalledWith('en');
    zhRender.unmount();
  });
});
