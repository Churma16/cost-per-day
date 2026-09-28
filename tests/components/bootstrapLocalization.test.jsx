import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import AppLaunchLoader from '../../src/components/ui/AppLaunchLoader';
import enTranslations from '../../src/i18n/locales/en';
import idTranslations from '../../src/i18n/locales/id';

let currentLocale = 'id';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => {
      const dictionary = currentLocale === 'id' ? idTranslations : enTranslations;
      return dictionary[key] ?? key;
    },
    i18n: {
      language: currentLocale,
    },
  }),
}));

describe('Cold-start and bootstrap launch state localization', () => {
  it('does not include hardcoded English-only copy in the pre-React index.html shell', () => {
    const indexPath = path.resolve(__dirname, '../../index.html');
    const indexHtml = fs.readFileSync(indexPath, 'utf8');

    // Pre-React shell must not enforce English copy before i18n is initialized
    expect(indexHtml).not.toContain('Getting your items ready...');
    expect(indexHtml).not.toContain('Worth knowing');
    expect(indexHtml).not.toContain('Cost per day gradually settles');
    expect(indexHtml).not.toContain('Loading Worthwhile');
    expect(indexHtml).toContain('class="pre-react-launch__mark"');
    expect(indexHtml).toContain('class="pre-react-launch__brand">Worthwhile</p>');
  });

  it('renders localized Indonesian launch text when language is set to id', () => {
    currentLocale = 'id';

    render(<AppLaunchLoader showContent showTip />);

    expect(screen.getByRole('status')).toHaveAttribute('aria-label', idTranslations.launchLoadingLabel);
    expect(screen.getByText(idTranslations.launchLoadingLabel)).toBeInTheDocument();
    expect(screen.getByText(idTranslations.launchLoadingTipLabel)).toBeInTheDocument();
    expect(screen.getByText(idTranslations.launchLoadingTip)).toBeInTheDocument();

    // English strings must not appear when language is Indonesian
    expect(screen.queryByText(enTranslations.launchLoadingLabel)).not.toBeInTheDocument();
    expect(screen.queryByText(enTranslations.launchLoadingTipLabel)).not.toBeInTheDocument();
    expect(screen.queryByText(enTranslations.launchLoadingTip)).not.toBeInTheDocument();
  });

  it('renders localized English launch text when language is set to en', () => {
    currentLocale = 'en';

    render(<AppLaunchLoader showContent showTip />);

    expect(screen.getByRole('status')).toHaveAttribute('aria-label', enTranslations.launchLoadingLabel);
    expect(screen.getByText(enTranslations.launchLoadingLabel)).toBeInTheDocument();
    expect(screen.getByText(enTranslations.launchLoadingTipLabel)).toBeInTheDocument();
    expect(screen.getByText(enTranslations.launchLoadingTip)).toBeInTheDocument();
  });
});
