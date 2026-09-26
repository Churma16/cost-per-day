import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import {
  VERSION_RELOAD_STORAGE_KEY,
  useVersionCheck,
} from '../../src/hooks/useVersionCheck';
import { fetchVersion } from '../../src/services/versionService';

vi.mock('../../src/services/versionService', () => ({
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

  it('does not reload when deployed revision matches the running build', async () => {
    fetchVersion.mockResolvedValue({ version: '0.2.0-beta.1', revision: 'build-a' });

    const { result } = renderHook(
      () => useVersionCheck({ runningRevision: 'build-a' }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.latestRevision).toBe('build-a');
    });

    expect(fetchVersion).toHaveBeenCalledTimes(1);
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it('reloads once when deployed revision differs from the running build', async () => {
    fetchVersion.mockResolvedValue({ version: '0.2.0-beta.1', revision: 'build-b' });

    renderHook(() => useVersionCheck({ runningRevision: 'build-a' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(reloadMock).toHaveBeenCalledTimes(1);
    });

    expect(window.sessionStorage.getItem(VERSION_RELOAD_STORAGE_KEY)).toBe(
      'build-a->build-b'
    );
  });

  it('reloads when legacy metadata stores the deployed revision in version', async () => {
    fetchVersion.mockResolvedValue({ version: 'build-b' });

    const { result } = renderHook(
      () => useVersionCheck({ runningRevision: 'build-a' }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(reloadMock).toHaveBeenCalledTimes(1);
    });

    expect(result.current.latestRevision).toBe('build-b');
    expect(window.sessionStorage.getItem(VERSION_RELOAD_STORAGE_KEY)).toBe(
      'build-a->build-b'
    );
  });

  it('uses revision instead of SemVer when both metadata fields exist', async () => {
    fetchVersion.mockResolvedValue({
      version: 'build-legacy-value',
      revision: 'build-b',
    });

    const { result } = renderHook(
      () => useVersionCheck({ runningRevision: 'build-a' }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(reloadMock).toHaveBeenCalledTimes(1);
    });

    expect(result.current.latestRevision).toBe('build-b');
    expect(window.sessionStorage.getItem(VERSION_RELOAD_STORAGE_KEY)).toBe(
      'build-a->build-b'
    );
  });

  it('reloads after an initial version request fails and a later focus check sees a new deployment', async () => {
    fetchVersion
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ version: '0.2.0-beta.1', revision: 'build-b' });

    renderHook(() => useVersionCheck({ runningRevision: 'build-a' }), {
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
    fetchVersion.mockResolvedValue({ version: '0.2.0-beta.1', revision: 'build-b' });

    renderHook(() => useVersionCheck({ runningRevision: 'build-a' }), {
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
    fetchVersion.mockResolvedValue({ version: '0.2.0-beta.1', revision: 'build-b' });

    renderHook(() => useVersionCheck({ runningRevision: 'build-b' }), {
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

    renderHook(() => useVersionCheck({ runningRevision: 'build-a' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(fetchVersion).toHaveBeenCalledTimes(1);
    });

    expect(reloadMock).not.toHaveBeenCalled();
  });

  it('does not query version metadata for local development builds', async () => {
    renderHook(() => useVersionCheck({ runningRevision: 'development' }), {
      wrapper: createWrapper(),
    });

    await act(async () => {});

    expect(fetchVersion).not.toHaveBeenCalled();
    expect(reloadMock).not.toHaveBeenCalled();
  });
});
