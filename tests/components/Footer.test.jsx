import React from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import Footer from '../../src/components/Footer';

const mockedNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actualRouter = await vi.importActual('react-router-dom');
  return {
    ...actualRouter,
    useNavigate: () => mockedNavigate,
  };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => ({
      primaryNavigation: 'Primary navigation',
      navHome: 'Home',
      navPlanning: 'Planning',
      navAdd: 'Add',
      navAnalytics: 'Analytics',
      navSettings: 'Settings',
    })[key] || key,
  }),
}));

describe('Footer Navigation Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderFooterWithInitialRoute = (initialRoute = '/') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <Footer />
      </MemoryRouter>
    );
  };

  it('renders primary navigation landmarks and exactly five navigation destinations', () => {
    renderFooterWithInitialRoute('/');

    const navigationElement = screen.getByRole('navigation', { name: /primary navigation/i });
    expect(navigationElement).toBeInTheDocument();

    const navigationButtons = screen.getAllByRole('button');
    expect(navigationButtons).toHaveLength(5);

    expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Planning' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Analytics' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
  });

  it('uses the shared soft-neutral shell surface instead of a white card surface', () => {
    renderFooterWithInitialRoute('/');

    const navigationElement = screen.getByRole('navigation', { name: /primary navigation/i });
    expect(navigationElement).toHaveClass('bg-[#F6F7F8]/95', 'app-footer');
    expect(navigationElement).not.toHaveClass('bg-white/95');
  });

  it('sets aria-current="page" and active indicator on the active route', () => {
    renderFooterWithInitialRoute('/');

    const homeButton = screen.getByRole('button', { name: 'Home' });
    expect(homeButton).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('active-indicator-home')).toBeInTheDocument();

    const planningButton = screen.getByRole('button', { name: 'Planning' });
    expect(planningButton).not.toHaveAttribute('aria-current');
    expect(screen.queryByTestId('active-indicator-planning')).not.toBeInTheDocument();
  });

  it('correctly activates the planning destination when on /planning', () => {
    renderFooterWithInitialRoute('/planning');

    expect(screen.getByRole('button', { name: 'Planning' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('active-indicator-planning')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Home' })).not.toHaveAttribute('aria-current');
    expect(screen.queryByTestId('active-indicator-home')).not.toBeInTheDocument();
  });

  it('correctly activates the add destination when on /add', () => {
    renderFooterWithInitialRoute('/add');

    expect(screen.getByRole('button', { name: 'Add' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('active-indicator-add')).toBeInTheDocument();
  });

  it('keeps the rendered bottom navigation stable for query-only changes', () => {
    window.history.pushState({}, '', '/add?type=item');
    render(
      <BrowserRouter>
        <Footer />
      </BrowserRouter>
    );
    const navigation = screen.getByRole('navigation', { name: /primary navigation/i });
    const activeIndicator = screen.getByTestId('active-indicator-add');

    act(() => {
      window.history.pushState({}, '', '/add?type=planned');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(screen.getByRole('navigation', { name: /primary navigation/i })).toBe(navigation);
    expect(screen.getByTestId('active-indicator-add')).toBe(activeIndicator);
  });

  it('correctly activates the analytics destination when on /analytics', () => {
    renderFooterWithInitialRoute('/analytics');

    expect(screen.getByRole('button', { name: 'Analytics' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('active-indicator-analytics')).toBeInTheDocument();
  });

  it('correctly activates the settings destination when on /settings', () => {
    renderFooterWithInitialRoute('/settings');

    expect(screen.getByRole('button', { name: 'Settings' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('active-indicator-settings')).toBeInTheDocument();
  });

  it('triggers immediate navigation without delay when a destination is clicked', () => {
    renderFooterWithInitialRoute('/');

    const planningButton = screen.getByRole('button', { name: 'Planning' });
    fireEvent.click(planningButton);

    expect(mockedNavigate).toHaveBeenCalledTimes(1);
    expect(mockedNavigate).toHaveBeenCalledWith('/planning');

    const analyticsButton = screen.getByRole('button', { name: 'Analytics' });
    fireEvent.click(analyticsButton);

    expect(mockedNavigate).toHaveBeenCalledTimes(2);
    expect(mockedNavigate).toHaveBeenCalledWith('/analytics');
  });
});
