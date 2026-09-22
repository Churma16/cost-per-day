import { render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { ApiError, getCurrentUser } from './services/api';

jest.mock('./services/api', () => {
  const actual = jest.requireActual('./services/api');
  return {
    ...actual,
    getCurrentUser: jest.fn(),
    logoutCurrentUser: jest.fn()
  };
});

beforeEach(() => {
  jest.clearAllMocks();
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
