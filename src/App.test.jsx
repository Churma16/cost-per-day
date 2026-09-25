import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import App from './App';
import { ApiError, getCurrentUser } from './services/api';

vi.mock('./services/api', async (importOriginal) => {
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
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
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

  test('renders clean header on /settings without page-header banner', async () => {
    window.history.pushState({}, '', '/settings');
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Settings');
    });
    const pageHeaders = document.querySelectorAll('.page-header');
    expect(pageHeaders).toHaveLength(0);
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
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Durability & Ownership');
    });
    const pageHeaders = document.querySelectorAll('.page-header');
    expect(pageHeaders).toHaveLength(0);
  });

  test('renders clean header on /add without page-header banner', async () => {
    window.history.pushState({}, '', '/add');
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Add New Item');
    });
    const pageHeaders = document.querySelectorAll('.page-header');
    expect(pageHeaders).toHaveLength(0);
  });

  test('renders clean header on /edit without page-header banner', async () => {
    window.history.pushState({}, '', '/edit?id=1');
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Edit Item');
    });
    const pageHeaders = document.querySelectorAll('.page-header');
    expect(pageHeaders).toHaveLength(0);
  });
});
