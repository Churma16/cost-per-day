import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { AuthProvider, useAuth } from '../../src/contexts/AuthContext';
import {
  getCurrentUser,
  logoutCurrentUser
} from '../../src/services/api';

vi.mock('../../src/services/api', () => ({
  ApiError: class ApiError extends Error {
    constructor(message, status = null) {
      super(message);
      this.status = status;
    }
  },
  getCurrentUser: vi.fn(),
  getGoogleLoginUrl: vi.fn(() => '/auth/google/login'),
  logoutCurrentUser: vi.fn()
}));

const AuthProbe = () => {
  const { user, error, signOut } = useAuth();

  if (!user) {
    return <div>signed out</div>;
  }

  return (
    <div>
      <div>{user.email}</div>
      {error && <div role="alert">logout failed</div>}
      <button type="button" onClick={signOut}>sign out</button>
    </div>
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentUser.mockResolvedValue({
    id: 'user-1',
    email: 'user@example.com'
  });
});

test('keeps logout failure inside auth state without rejecting the click handler promise', async () => {
  logoutCurrentUser.mockRejectedValue(new Error('network failure'));

  render(
    <AuthProvider>
      <AuthProbe />
    </AuthProvider>
  );

  await screen.findByText('user@example.com');
  fireEvent.click(screen.getByRole('button', { name: /sign out/i }));

  await waitFor(() => {
    expect(screen.getByRole('alert')).toHaveTextContent('logout failed');
  });
  expect(screen.getByText('user@example.com')).toBeInTheDocument();
});
