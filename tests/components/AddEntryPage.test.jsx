import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { vi } from 'vitest';
import AddEntryPage from '../../src/components/AddEntryPage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => ({
      back: 'Back',
      addEntryTitle: 'Add',
      addEntryTypeLabel: 'What would you like to add?',
      ownedItemTab: 'Owned item',
      plannedItemTab: 'Planned item',
    })[key] || key,
  }),
}));

vi.mock('../../src/components/AddItem', () => ({
  default: () => {
    const [value, setValue] = useState('');
    return (
      <input
        data-testid="owned-draft"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
    );
  },
}));

vi.mock('../../src/components/PlannedPurchaseCreateForm', () => ({
  default: () => {
    const [value, setValue] = useState('');
    return (
      <input
        data-testid="planned-draft"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
    );
  },
}));

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

const renderPage = (initialEntry) => render(
  <MemoryRouter initialEntries={[initialEntry]}>
    <Routes>
      <Route path="/add" element={<AddEntryPage />} />
    </Routes>
    <LocationProbe />
  </MemoryRouter>
);

describe('AddEntryPage', () => {
  it('defaults ordinary /add navigation to the owned-item tab and canonical URL', async () => {
    renderPage('/add');

    expect(screen.getByRole('heading', { name: 'Add' })).toHaveClass('text-2xl');
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Owned item' })).toHaveAttribute('aria-selected', 'true');
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/add?type=item'));
  });

  it('restores a directly linked planned-item tab', () => {
    renderPage('/add?type=planned');

    expect(screen.getByRole('tab', { name: 'Planned item' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('location')).toHaveTextContent('/add?type=planned');
  });

  it('keeps independent drafts mounted while switching tabs', () => {
    renderPage('/add?type=item');

    fireEvent.change(screen.getByTestId('owned-draft'), { target: { value: 'Camera' } });
    fireEvent.click(screen.getByRole('tab', { name: 'Planned item' }));
    fireEvent.change(screen.getByTestId('planned-draft'), { target: { value: 'Tripod' } });
    fireEvent.click(screen.getByRole('tab', { name: 'Owned item' }));

    expect(screen.getByTestId('owned-draft')).toHaveValue('Camera');
    expect(screen.getByTestId('planned-draft')).toHaveValue('Tripod');
  });

  it('supports arrow-key tab navigation', async () => {
    renderPage('/add?type=item');

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Owned item' }), { key: 'ArrowRight' });

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Planned item' })).toHaveAttribute('aria-selected', 'true');
    });
  });
});
