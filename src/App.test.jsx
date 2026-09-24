import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import App from './App';
import { ApiError, getCurrentUser } from './services/api';

vi.mock('./services/api', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getCurrentUser: vi.fn(),
    logoutCurrentUser: vi.fn()
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

  test('renders normal-flow header on Home route / without page-header class', async () => {
    window.history.pushState({}, '', '/');
    render(<App />);
    await waitFor(() => {
      expect(document.querySelector('header')).toBeInTheDocument();
    });
    const pageHeaders = document.querySelectorAll('.page-header');
    expect(pageHeaders).toHaveLength(0);
    const homeHeader = document.querySelector('header');
    expect(homeHeader).toHaveClass('relative');
  });

  test('renders exactly one fixed page-header on /settings', async () => {
    window.history.pushState({}, '', '/settings');
    render(<App />);
    await waitFor(() => {
      expect(document.querySelector('.page-header')).toBeInTheDocument();
    });
    const pageHeaders = document.querySelectorAll('.page-header');
    expect(pageHeaders).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Settings');
  });

  test('renders exactly one fixed page-header on /planning', async () => {
    window.history.pushState({}, '', '/planning');
    render(<App />);
    await waitFor(() => {
      expect(document.querySelector('.page-header')).toBeInTheDocument();
    });
    const pageHeaders = document.querySelectorAll('.page-header');
    expect(pageHeaders).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Planned Purchases');
  });

  test('renders exactly one header on /add without duplicate header from App shell', async () => {
    window.history.pushState({}, '', '/add');
    render(<App />);
    await waitFor(() => {
      expect(document.querySelector('.page-header')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Add New Item');
    });
    const pageHeaders = document.querySelectorAll('.page-header');
    expect(pageHeaders).toHaveLength(1);
  });

  test('renders exactly one header on /edit without duplicate header from App shell', async () => {
    window.history.pushState({}, '', '/edit?id=1');
    render(<App />);
    await waitFor(() => {
      expect(document.querySelector('.page-header')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Edit Item');
    });
    const pageHeaders = document.querySelectorAll('.page-header');
    expect(pageHeaders).toHaveLength(1);
  });
});
