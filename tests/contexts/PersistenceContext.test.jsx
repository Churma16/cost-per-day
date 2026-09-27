import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, test, vi } from 'vitest';

let authState = { user: null, isGuest: true };

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

import { PersistenceProvider } from '../../src/contexts/PersistenceContext';

describe('persistence scope cache isolation', () => {
  test('clears guest cache before authenticated children mount', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData(['items'], [{ id: 'guest-item' }]);
    queryClient.setQueryData(['settings'], { language: 'id', currency: 'IDR' });
    queryClient.setQueryData(['value-equivalents'], [{ id: 'guest-equivalent' }]);

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <PersistenceProvider>
          <div>content</div>
        </PersistenceProvider>
      </QueryClientProvider>
    );

    expect(queryClient.getQueryData(['items'])).toEqual([{ id: 'guest-item' }]);
    expect(queryClient.getQueryData(['settings'])).toEqual({ language: 'id', currency: 'IDR' });
    expect(queryClient.getQueryData(['value-equivalents'])).toEqual([{ id: 'guest-equivalent' }]);

    authState = { user: { id: 'user-1' }, isGuest: false };
    rerender(
      <QueryClientProvider client={queryClient}>
        <PersistenceProvider>
          <div>content</div>
        </PersistenceProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(queryClient.getQueryData(['items'])).toBeUndefined();
      expect(queryClient.getQueryData(['settings'])).toBeUndefined();
      expect(queryClient.getQueryData(['value-equivalents'])).toBeUndefined();
    });
  });
});
