import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { AuthProvider, useAuth } from '../../src/contexts/AuthContext';
import {
  getCurrentUser,
  logoutCurrentUser
} from '../../src/services/api';
import { guestMigrationService } from '../../src/services/guestMigrationService';

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

vi.mock('../../src/services/guestMigrationService', () => ({
  guestMigrationService: {
    migrate: vi.fn(),
  },
}));

const AuthProbe = () => {
  const {
    user,
    isGuest,
    error,
    signOut,
    guestMigrationError,
    retryGuestMigration,
  } = useAuth();

  if (!user) {
    return <div>{isGuest ? 'guest mode' : 'signed out'}</div>;
  }

  return (
    <div>
      <div>{user.email}</div>
      {error && <div role="alert">logout failed</div>}
      {guestMigrationError && (
        <div>
          <div role="status">guest migration failed</div>
          <button type="button" onClick={retryGuestMigration}>retry migration</button>
        </div>
      )}
      <button type="button" onClick={signOut}>sign out</button>
    </div>
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  getCurrentUser.mockResolvedValue({
    id: 'user-1',
    email: 'user@example.com'
  });
  guestMigrationService.migrate.mockResolvedValue({ alreadyImported: false });
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


test('restores local guest mode when session bootstrap fails for a non-401 reason', async () => {
  window.localStorage.setItem('worthwhile:guest-mode', '1');
  getCurrentUser.mockRejectedValue(new Error('backend unavailable'));

  render(
    <AuthProvider>
      <AuthProbe />
    </AuthProvider>
  );

  expect(await screen.findByText('guest mode')).toBeInTheDocument();
});

test('keeps the guest marker after cleanup failure and clears it only after a successful retry', async () => {
  window.localStorage.setItem('worthwhile:guest-mode', '1');
  guestMigrationService.migrate
    .mockRejectedValueOnce(new Error('indexeddb cleanup failed'))
    .mockResolvedValueOnce({ alreadyImported: true });

  render(
    <AuthProvider>
      <AuthProbe />
    </AuthProvider>
  );

  expect(await screen.findByRole('status')).toHaveTextContent('guest migration failed');
  expect(window.localStorage.getItem('worthwhile:guest-mode')).toBe('1');

  fireEvent.click(screen.getByRole('button', { name: /retry migration/i }));

  await waitFor(() => {
    expect(window.localStorage.getItem('worthwhile:guest-mode')).toBeNull();
  });
  expect(guestMigrationService.migrate).toHaveBeenCalledTimes(2);
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
