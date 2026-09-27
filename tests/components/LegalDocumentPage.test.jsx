import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, test } from 'vitest';
import '../../src/i18n';
import LegalDocumentPage from '../../src/components/LegalDocumentPage';

const renderLegalRoute = (initialEntry) => render(
  <MemoryRouter initialEntries={[initialEntry]}>
    <Routes>
      <Route path="/privacy" element={<LegalDocumentPage documentKey="privacy" />} />
      <Route path="/settings" element={<h1>Settings destination</h1>} />
      <Route path="/" element={<h1>Login destination</h1>} />
    </Routes>
  </MemoryRouter>
);

describe('LegalDocumentPage back navigation', () => {
  test('returns to Settings when opened from the Settings legal section', () => {
    renderLegalRoute({ pathname: '/privacy', state: { from: '/settings' } });

    fireEvent.click(screen.getByRole('link', { name: 'Back to Settings' }));

    expect(screen.getByRole('heading', { name: 'Settings destination' })).toBeInTheDocument();
  });

  test('returns to the login route when opened directly', () => {
    renderLegalRoute('/privacy');

    fireEvent.click(screen.getByRole('link', { name: 'Back to Worthwhile' }));

    expect(screen.getByRole('heading', { name: 'Login destination' })).toBeInTheDocument();
  });
});
