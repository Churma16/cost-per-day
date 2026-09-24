import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import {
  VERSION_RELOAD_STORAGE_KEY,
  useVersionCheck,
} from './useVersionCheck';
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
    window.sessionStorage.clear();
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
    window.sessionStorage.clear();
    focusManager.setFocused(undefined);
    vi.restoreAllMocks();
  });

  it('does not reload when deployed version matches the running build', async () => {
    fetchVersion.mockResolvedValue({ version: 'build-a' });

    const { result } = renderHook(
      () => useVersionCheck({ runningVersion: 'build-a' }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.latestVersionIdentifier).toBe('build-a');
    });

    expect(fetchVersion).toHaveBeenCalledTimes(1);
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it('reloads once when deployed version differs from the running build', async () => {
    fetchVersion.mockResolvedValue({ version: 'build-b' });

    renderHook(() => useVersionCheck({ runningVersion: 'build-a' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(reloadMock).toHaveBeenCalledTimes(1);
    });

    expect(window.sessionStorage.getItem(VERSION_RELOAD_STORAGE_KEY)).toBe(
      'build-a->build-b'
    );
  });

  it('reloads after an initial version request fails and a later focus check sees a new deployment', async () => {
    fetchVersion
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ version: 'build-b' });

    renderHook(() => useVersionCheck({ runningVersion: 'build-a' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(fetchVersion).toHaveBeenCalledTimes(1);
    });
    expect(reloadMock).not.toHaveBeenCalled();

    await act(async () => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });

    await waitFor(() => {
      expect(fetchVersion).toHaveBeenCalledTimes(2);
      expect(reloadMock).toHaveBeenCalledTimes(1);
    });
  });

  it('does not reload again for the same running-to-deployed transition', async () => {
    window.sessionStorage.setItem(
      VERSION_RELOAD_STORAGE_KEY,
      'build-a->build-b'
    );
    fetchVersion.mockResolvedValue({ version: 'build-b' });

    renderHook(() => useVersionCheck({ runningVersion: 'build-a' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(fetchVersion).toHaveBeenCalledTimes(1);
    });

    expect(reloadMock).not.toHaveBeenCalled();
  });

  it('clears a previous transition after the new bundle is running', async () => {
    window.sessionStorage.setItem(
      VERSION_RELOAD_STORAGE_KEY,
      'build-a->build-b'
    );
    fetchVersion.mockResolvedValue({ version: 'build-b' });

    renderHook(() => useVersionCheck({ runningVersion: 'build-b' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(fetchVersion).toHaveBeenCalledTimes(1);
      expect(window.sessionStorage.getItem(VERSION_RELOAD_STORAGE_KEY)).toBeNull();
    });

    expect(reloadMock).not.toHaveBeenCalled();
  });

  it('fails silently without reloading when the version endpoint is unavailable', async () => {
    fetchVersion.mockRejectedValue(new Error('Network error'));

    renderHook(() => useVersionCheck({ runningVersion: 'build-a' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(fetchVersion).toHaveBeenCalledTimes(1);
    });

    expect(reloadMock).not.toHaveBeenCalled();
  });

  it('does not query version metadata for local development builds', async () => {
    renderHook(() => useVersionCheck({ runningVersion: 'development' }), {
      wrapper: createWrapper(),
    });

    await act(async () => {});

    expect(fetchVersion).not.toHaveBeenCalled();
    expect(reloadMock).not.toHaveBeenCalled();
  });
});
