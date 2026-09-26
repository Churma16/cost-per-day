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
      navAnalytics: 'Durability',
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
    expect(screen.getByRole('button', { name: 'Durability' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
  });

  it('uses the shared soft-neutral shell surface instead of a white card surface', () => {
    renderFooterWithInitialRoute('/');

    const navigationElement = screen.getByRole('navigation', { name: /primary navigation/i });
    expect(navigationElement).toHaveClass('bg-[#F6F7F8]/95', 'app-footer');
    expect(navigationElement).not.toHaveClass('bg-white/95');
  });

  it('sets aria-current="page" and visibly labels every destination', () => {
    renderFooterWithInitialRoute('/');

    const homeButton = screen.getByRole('button', { name: 'Home' });
    expect(homeButton).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('Home')).toBeVisible();
    expect(screen.getByText('Planning')).toBeVisible();
    expect(screen.getByText('Add')).toBeVisible();
    expect(screen.getByText('Durability')).toBeVisible();
    expect(screen.getByText('Settings')).toBeVisible();

    const planningButton = screen.getByRole('button', { name: 'Planning' });
    expect(planningButton).not.toHaveAttribute('aria-current');
  });

  it('renders one decorative Ring of Ownership icon for each destination', () => {
    const { container } = renderFooterWithInitialRoute('/');

    const icons = container.querySelectorAll('[data-navigation-icon]');
    expect(icons).toHaveLength(5);
    expect(Array.from(icons).map((icon) => icon.dataset.navigationIcon)).toEqual([
      'home',
      'planning',
      'add',
      'analytics',
      'settings',
    ]);

    icons.forEach((icon) => {
      expect(icon).toHaveAttribute('aria-hidden', 'true');
      expect(icon).toHaveAttribute('focusable', 'false');
      expect(icon).toHaveAttribute('viewBox', '0 0 26 26');
      expect(icon).toHaveAttribute('width', '26');
      expect(icon).toHaveAttribute('height', '26');
    });
  });

  it('keeps icon geometry stable while exposing active state without color alone', () => {
    const { container } = renderFooterWithInitialRoute('/planning');

    const homeIcon = container.querySelector('[data-navigation-icon="home"]');
    const planningIcon = container.querySelector('[data-navigation-icon="planning"]');

    expect(homeIcon).toHaveAttribute('data-active', 'false');
    expect(planningIcon).toHaveAttribute('data-active', 'true');
    expect(homeIcon).toHaveAttribute('viewBox', planningIcon.getAttribute('viewBox'));
    expect(homeIcon).toHaveAttribute('width', planningIcon.getAttribute('width'));
    expect(homeIcon).toHaveAttribute('height', planningIcon.getAttribute('height'));
    expect(planningIcon.querySelectorAll('circle')).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Planning' })).toHaveAttribute('aria-current', 'page');
  });

  it('uses the canonical home arc only in the active state', () => {
    const { container } = renderFooterWithInitialRoute('/');
    const homeIcon = container.querySelector('[data-navigation-icon="home"]');

    expect(homeIcon.querySelector('path')).toHaveAttribute(
      'd',
      'M13 3.5 A9.5 9.5 0 1 1 4.2 18'
    );
    expect(homeIcon.querySelector('path')).toHaveClass('home-arc', 'is-active');
    expect(homeIcon.querySelector('circle')).toHaveAttribute('r', '9.5');
  });

  it('keeps the inactive home center neutral and resets the charged arc', () => {
    const { container } = renderFooterWithInitialRoute('/settings');
    const homeIcon = container.querySelector('[data-navigation-icon="home"]');
    const homeCircles = container.querySelectorAll('[data-navigation-icon="home"] circle');

    expect(homeIcon.querySelector('path')).toHaveClass('home-arc');
    expect(homeIcon.querySelector('path')).not.toHaveClass('is-active');
    expect(homeCircles).toHaveLength(2);
    expect(homeCircles[1]).toHaveAttribute('r', '2.2');
    expect(homeCircles[1]).toHaveAttribute('fill', 'currentColor');
    expect(homeCircles[1]).toHaveClass('navigation-icon__neutral-ring');
  });

  it('matches the canonical per-tab construction geometry', () => {
    const { container } = renderFooterWithInitialRoute('/settings');
    const planningCircles = container.querySelectorAll('[data-navigation-icon="planning"] circle');
    const addPath = container.querySelector('[data-navigation-icon="add"] path');
    const durabilityCircles = container.querySelectorAll('[data-navigation-icon="analytics"] circle');
    const settingsIcon = container.querySelector('[data-navigation-icon="settings"]');

    expect(planningCircles[0]).toHaveAttribute('stroke-dasharray', '2.5 3');
    expect(planningCircles[1]).toHaveAttribute('cy', '3.5');
    expect(planningCircles[1]).toHaveAttribute('r', '2');
    expect(planningCircles[2]).toHaveAttribute('r', '1.6');
    expect(addPath).toHaveAttribute('d', 'M13 8.5V17.5M8.5 13H17.5');
    expect(Array.from(durabilityCircles).map((circle) => circle.getAttribute('r'))).toEqual([
      '9.5',
      '6.2',
      '2.8',
    ]);
    expect(settingsIcon.querySelector('circle')).toHaveAttribute('r', '3.4');
    expect(settingsIcon.querySelector('path')).toHaveAttribute('stroke-width', '2.4');
    expect(settingsIcon.querySelector('path')).toHaveAttribute('stroke-linecap', 'round');
  });

  it('keeps color values outside the SVG geometry', () => {
    const { container } = renderFooterWithInitialRoute('/analytics');
    const icons = container.querySelectorAll('[data-navigation-icon]');

    icons.forEach((icon) => {
      icon.querySelectorAll('[stroke]').forEach((element) => {
        expect(element).toHaveAttribute('stroke', 'currentColor');
      });
      icon.querySelectorAll('[fill]').forEach((element) => {
        expect(element.getAttribute('fill')).toMatch(/^(currentColor|none)$/);
      });
    });
  });

  it('exposes the per-icon animation hooks without animating whole icons', () => {
    const { container } = renderFooterWithInitialRoute('/planning');
    const planningIcon = container.querySelector('[data-navigation-icon="planning"]');
    const addIcon = container.querySelector('[data-navigation-icon="add"]');
    const durabilityIcon = container.querySelector('[data-navigation-icon="analytics"]');
    const settingsIcon = container.querySelector('[data-navigation-icon="settings"]');

    expect(planningIcon.querySelector('.planned-ring')).toBeInTheDocument();
    expect(planningIcon.querySelector('.planned-center-dot')).toBeInTheDocument();
    expect(planningIcon.querySelector('.planned-target-dot')).toHaveClass('is-active');
    expect(addIcon.querySelector('.add-ring')).toBeInTheDocument();
    expect(addIcon.querySelector('.add-plus')).toBeInTheDocument();
    expect(durabilityIcon.querySelector('.durability-outer')).toBeInTheDocument();
    expect(durabilityIcon.querySelector('.durability-mid')).toBeInTheDocument();
    expect(durabilityIcon.querySelector('.durability-inner')).toBeInTheDocument();
    expect(settingsIcon.querySelector('.settings-circle')).toBeInTheDocument();
    expect(settingsIcon.querySelector('.settings-spokes')).toBeInTheDocument();
    expect(settingsIcon.querySelector('.settings-gear')).toHaveAttribute('data-rotation', '0');
    container.querySelectorAll('[data-navigation-icon]').forEach((icon) => {
      expect(icon.getAttribute('class')).not.toMatch(/scale/);
    });
  });

  it('correctly activates the planning destination when on /planning', () => {
    const { container } = renderFooterWithInitialRoute('/planning');

    expect(screen.getByRole('button', { name: 'Planning' })).toHaveAttribute('aria-current', 'page');
    expect(container.querySelector('[data-navigation-icon="planning"]')).toHaveAttribute('data-active', 'true');
    expect(screen.getByRole('button', { name: 'Home' })).not.toHaveAttribute('aria-current');
    expect(container.querySelector('[data-navigation-icon="home"]')).toHaveAttribute('data-active', 'false');
  });

  it('correctly activates the add destination when on /add', () => {
    const { container } = renderFooterWithInitialRoute('/add');

    expect(screen.getByRole('button', { name: 'Add' })).toHaveAttribute('aria-current', 'page');
    expect(container.querySelector('[data-navigation-icon="add"]')).toHaveAttribute('data-active', 'true');
  });

  it('keeps the rendered bottom navigation stable for query-only changes', () => {
    window.history.pushState({}, '', '/add?type=item');
    render(
      <BrowserRouter>
        <Footer />
      </BrowserRouter>
    );
    const navigation = screen.getByRole('navigation', { name: /primary navigation/i });
    const activeIcon = navigation.querySelector('[data-navigation-icon="add"]');

    act(() => {
      window.history.pushState({}, '', '/add?type=planned');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(screen.getByRole('navigation', { name: /primary navigation/i })).toBe(navigation);
    expect(navigation.querySelector('[data-navigation-icon="add"]')).toBe(activeIcon);
  });

  it('correctly activates the analytics destination when on /analytics', () => {
    const { container } = renderFooterWithInitialRoute('/analytics');

    expect(screen.getByRole('button', { name: 'Durability' })).toHaveAttribute('aria-current', 'page');
    expect(container.querySelector('[data-navigation-icon="analytics"]')).toHaveAttribute('data-active', 'true');
  });

  it('correctly activates the settings destination when on /settings', () => {
    const { container } = renderFooterWithInitialRoute('/settings');

    expect(screen.getByRole('button', { name: 'Settings' })).toHaveAttribute('aria-current', 'page');
    expect(container.querySelector('[data-navigation-icon="settings"]')).toHaveAttribute('data-active', 'true');
  });

  it('continues the settings rotation forward when it deactivates', () => {
    window.history.pushState({}, '', '/settings');
    const { container } = render(
      <BrowserRouter>
        <Footer />
      </BrowserRouter>
    );
    const settingsGear = container.querySelector('.settings-gear');

    expect(settingsGear).toHaveAttribute('data-rotation', '12');

    act(() => {
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(settingsGear).toHaveAttribute('data-rotation', '24');
  });

  it('triggers immediate navigation without delay when a destination is clicked', () => {
    renderFooterWithInitialRoute('/');

    const planningButton = screen.getByRole('button', { name: 'Planning' });
    fireEvent.click(planningButton);

    expect(mockedNavigate).toHaveBeenCalledTimes(1);
    expect(mockedNavigate).toHaveBeenCalledWith('/planning');

    const analyticsButton = screen.getByRole('button', { name: 'Durability' });
    fireEvent.click(analyticsButton);

    expect(mockedNavigate).toHaveBeenCalledTimes(2);
    expect(mockedNavigate).toHaveBeenCalledWith('/analytics');
  });
});
