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
  });
});
