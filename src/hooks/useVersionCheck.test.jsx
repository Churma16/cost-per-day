import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { useVersionCheck } from './useVersionCheck';
import { fetchVersion } from '../services/versionService';

vi.mock('../services/versionService', () => ({
  fetchVersion: vi.fn(),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
      },
    },
  });

  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useVersionCheck', () => {
  const originalLocation = window.location;
  let reloadMock;

  beforeEach(() => {
    vi.clearAllMocks();
    reloadMock = vi.fn();
    delete window.location;
    window.location = {
      ...originalLocation,
      reload: reloadMock,
    };
    focusManager.setFocused(undefined);
  });

  afterEach(() => {
    window.location = originalLocation;
    focusManager.setFocused(undefined);
    vi.restoreAllMocks();
  });

  it('fetches version on mount and records initial version without reloading', async () => {
    fetchVersion.mockResolvedValue({ version: 'v1.0.0' });

    const { result } = renderHook(() => useVersionCheck(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.latestVersionIdentifier).toBe('v1.0.0');
    });

    expect(fetchVersion).toHaveBeenCalledTimes(1);
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it('does not reload when version is unchanged on window focus', async () => {
    fetchVersion.mockResolvedValue({ version: 'v1.0.0' });

    const { result } = renderHook(() => useVersionCheck(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.latestVersionIdentifier).toBe('v1.0.0');
    });

    await act(async () => {
      window.dispatchEvent(new Event('visibilitychange'));
    });

    await waitFor(() => {
      expect(fetchVersion).toHaveBeenCalledTimes(2);
    });

    expect(reloadMock).not.toHaveBeenCalled();
  });

  it('reloads window when a new version is detected on window focus', async () => {
    let fetchInvocationCount = 0;
    fetchVersion.mockImplementation(async () => {
      fetchInvocationCount += 1;
      return {
        version: fetchInvocationCount === 1 ? 'v1.0.0' : 'v2.0.0',
      };
    });

    const { result } = renderHook(() => useVersionCheck(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.latestVersionIdentifier).toBe('v1.0.0');
    });
    expect(reloadMock).not.toHaveBeenCalled();

    await act(async () => {
      window.dispatchEvent(new Event('visibilitychange'));
    });

    await waitFor(() => {
      expect(fetchVersion).toHaveBeenCalledTimes(2);
      expect(reloadMock).toHaveBeenCalledTimes(1);
    });
  });

  it('refetches when focusManager triggers focus state update', async () => {
    fetchVersion.mockResolvedValue({ version: 'v1.0.0' });

    const { result } = renderHook(() => useVersionCheck(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.latestVersionIdentifier).toBe('v1.0.0');
    });

    await act(async () => {
      focusManager.setFocused(true);
    });

    await waitFor(() => {
      expect(fetchVersion).toHaveBeenCalledTimes(2);
    });

    expect(reloadMock).not.toHaveBeenCalled();
  });

  it('fails silently without reloading when network error occurs', async () => {
    fetchVersion.mockRejectedValue(new Error('Network error'));

    renderHook(() => useVersionCheck(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(fetchVersion).toHaveBeenCalledTimes(1);
    });

    expect(reloadMock).not.toHaveBeenCalled();
  });
});
