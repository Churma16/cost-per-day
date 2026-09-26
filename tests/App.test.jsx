import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import App from '../src/App';
import { ApiError, getCurrentUser } from '../src/services/api';

vi.mock('../src/services/api', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getCurrentUser: vi.fn(),
    logoutCurrentUser: vi.fn(),
    getAllSettings: vi.fn().mockResolvedValue({ language: 'en', currency: 'USD' }),
    getAllValueEquivalents: vi.fn().mockResolvedValue([]),
    getAllItems: vi.fn().mockResolvedValue([])
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
});

test('renders authentication loading state while session bootstrap is pending', () => {
  getCurrentUser.mockImplementation(() => new Promise(() => {}));

  render(<App />);

  expect(screen.getByText(/loading/i)).toBeInTheDocument();
});

test('shows Google sign-in when there is no application session', async () => {
  getCurrentUser.mockRejectedValue(new ApiError('authenticated user identity is required', 401));

  render(<App />);

  await waitFor(() => {
    expect(screen.getByRole('button', { name: /continue without an account/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
    expect(screen.getByText(/data stays on this device/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Worthwhile', level: 1 })).toBeInTheDocument();
    expect(screen.getByAltText('Worthwhile')).toBeInTheDocument();
  });
});

describe('Header route isolation regression tests', () => {
  beforeEach(() => {
    getCurrentUser.mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
  });

  test('renders the Home-owned sticky header on / without page-header class', async () => {
    window.history.pushState({}, '', '/');
    render(<App />);
    await waitFor(() => {
      expect(document.querySelector('header')).toBeInTheDocument();
    });
    const pageHeaders = document.querySelectorAll('.page-header');
    expect(pageHeaders).toHaveLength(0);
    const homeHeader = document.querySelector('header');
    expect(homeHeader).toHaveClass('sticky');
    expect(homeHeader.closest('.min-h-full')).toBeInTheDocument();
  });

  test('allows route content to grow while page-content remains the scroll container', async () => {
    window.history.pushState({}, '', '/');
    render(<App />);

    await waitFor(() => {
      expect(document.querySelector('.page-content')).toBeInTheDocument();
    });

    const pageContent = document.querySelector('.page-content');
    const routeTransition = pageContent.firstElementChild;

    expect(pageContent.tagName).toBe('MAIN');
    expect(routeTransition).toHaveClass('min-h-full', 'w-full');
    expect(routeTransition).not.toHaveClass('h-full');
  });

  test('renders clean header on /settings without page-header banner', async () => {
    window.history.pushState({}, '', '/settings');
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Settings');
    });
    const pageHeaders = document.querySelectorAll('.page-header');
    expect(pageHeaders).toHaveLength(0);
    expect(document.querySelectorAll('.page-content')).toHaveLength(1);
    expect(document.querySelector('.page-content')).toHaveAttribute('class', 'page-content');
    const settingsContent = document.querySelector('.settings-page-content');
    expect(settingsContent).not.toHaveClass('page-content');
    expect(settingsContent).not.toHaveClass('pb-24');
    expect(settingsContent).toHaveClass('pb-8');
  });

  test('renders clean header on /planning without page-header banner', async () => {
    window.history.pushState({}, '', '/planning');
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Planned Purchases');
    });
    const pageHeaders = document.querySelectorAll('.page-header');
    expect(pageHeaders).toHaveLength(0);
  });

  test('renders clean header on /analytics without page-header banner', async () => {
    window.history.pushState({}, '', '/analytics');
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ownership Over Time');
    });
    const pageHeaders = document.querySelectorAll('.page-header');
    expect(pageHeaders).toHaveLength(0);
  });

  test('renders clean header on /add without page-header banner', async () => {
    window.history.pushState({}, '', '/add');
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Add an item');
    });
    expect(screen.getByRole('tab', { name: 'Already owned' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Planned' })).toBeInTheDocument();
    const pageHeaders = document.querySelectorAll('.page-header');
    expect(pageHeaders).toHaveLength(0);
    expect(document.querySelectorAll('.page-content')).toHaveLength(1);
    expect(document.querySelector('.page-content')).toHaveAttribute('class', 'page-content');
    const formContent = document.querySelector('.form-page-content');
    expect(formContent).not.toHaveClass('page-content');
    expect(formContent).not.toHaveClass('pb-24');
    expect(formContent).toHaveClass('pb-8');
  });

  test('renders clean header on /edit without page-header banner', async () => {
    window.history.pushState({}, '', '/edit?id=1');
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Edit Item');
    });
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    const pageHeaders = document.querySelectorAll('.page-header');
    expect(pageHeaders).toHaveLength(0);
    expect(document.querySelectorAll('.page-content')).toHaveLength(1);
    expect(document.querySelector('.page-content')).toHaveAttribute('class', 'page-content');
    const formContent = document.querySelector('.form-page-content');
    expect(formContent).not.toHaveClass('page-content');
    expect(formContent).not.toHaveClass('pb-24');
    expect(formContent).toHaveClass('pb-8');
  });
});
