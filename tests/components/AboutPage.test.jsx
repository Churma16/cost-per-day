import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, test } from 'vitest';
import i18n from '../../src/i18n';
import AboutPage from '../../src/components/AboutPage';
import { APP_VERSION } from '../../src/constants/branding';

const renderAboutRoute = (initialEntry = '/about') => render(
  <MemoryRouter initialEntries={[initialEntry]}>
    <Routes>
      <Route path="/about" element={<AboutPage />} />
      <Route path="/settings" element={<h1>Settings destination</h1>} />
      <Route path="/" element={<h1>Login destination</h1>} />
    </Routes>
  </MemoryRouter>
);

afterEach(async () => {
  await i18n.changeLanguage('en');
});

describe('AboutPage', () => {
  test('explains Worthwhile without judging purchases and uses the canonical version', () => {
    renderAboutRoute();

    expect(screen.getByRole('heading', { name: "Understand a purchase's value over time", level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/Price tells you what you paid/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'The decision stays yours' })).toBeInTheDocument();
    expect(screen.getByText(/not financial, accounting, investment, or professional advice/)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`Version ${APP_VERSION}`))).toBeInTheDocument();
    expect(screen.getByText('Early Beta')).toBeInTheDocument();
  });

  test('renders the localized Indonesian About content', async () => {
    await i18n.changeLanguage('id');
    renderAboutRoute();

    expect(screen.getByRole('heading', { name: 'Pahami nilai pembelian melalui waktu', level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/Harga memberi tahu berapa yang kamu bayar/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Keputusan tetap milikmu' })).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`Versi ${APP_VERSION}`))).toBeInTheDocument();
  });

  test('returns to Settings when opened from the Settings group', () => {
    renderAboutRoute({ pathname: '/about', state: { from: '/settings' } });

    fireEvent.click(screen.getByRole('link', { name: 'Back to Settings' }));

    expect(screen.getByRole('heading', { name: 'Settings destination' })).toBeInTheDocument();
  });
});
