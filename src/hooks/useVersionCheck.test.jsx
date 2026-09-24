import { renderHook, act } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { useVersionCheck } from './useVersionCheck';

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
  });

  afterEach(() => {
    window.location = originalLocation;
    vi.restoreAllMocks();
  });

  it('fetches /version.json with cache: no-store on mount and records initial version', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ version: 'v1.0.0' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    renderHook(() => useVersionCheck());

    expect(fetchMock).toHaveBeenCalledWith('/version.json', { cache: 'no-store' });
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it('does not reload when version is unchanged on visibility change', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ version: 'v1.0.0' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    renderHook(() => useVersionCheck());
    await act(async () => {});

    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Simulate tab becoming visible again with same version
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    });

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it('reloads window when a new version is detected on visibility change', async () => {
    let callCount = 0;
    const fetchMock = vi.fn().mockImplementation(async () => {
      callCount += 1;
      return {
        ok: true,
        json: async () => ({
          version: callCount === 1 ? 'v1.0.0' : 'v2.0.0',
        }),
      };
    });
    vi.stubGlobal('fetch', fetchMock);

    renderHook(() => useVersionCheck());
    await act(async () => {});

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(reloadMock).not.toHaveBeenCalled();

    // Simulate tab becoming visible with new version
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    });

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it('does not check version when visibilityState is hidden', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ version: 'v1.0.0' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    renderHook(() => useVersionCheck());
    await act(async () => {});

    expect(fetchMock).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it('fails silently when network error occurs', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Network error'));
    vi.stubGlobal('fetch', fetchMock);

    renderHook(() => useVersionCheck());
    await act(async () => {});

    expect(fetchMock).toHaveBeenCalledWith('/version.json', { cache: 'no-store' });
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it('removes visibilitychange listener on unmount', async () => {
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ version: 'v1.0.0' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { unmount } = renderHook(() => useVersionCheck());
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
  });
});
