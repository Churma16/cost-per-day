import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchVersion } from '../services/versionService';

export const VERSION_QUERY_KEY = ['version'];
export const VERSION_RELOAD_STORAGE_KEY = 'worthwhile:version-reload';

const getEmbeddedBuildVersion = () => import.meta.env.VITE_APP_VERSION?.trim() ?? '';

const getStoredReloadTransition = () => {
  try {
    return window.sessionStorage.getItem(VERSION_RELOAD_STORAGE_KEY);
  } catch {
    return null;
  }
};

const storeReloadTransition = (transition) => {
  try {
    window.sessionStorage.setItem(VERSION_RELOAD_STORAGE_KEY, transition);
  } catch {
    // Storage can be unavailable in restrictive browser modes. The in-memory
    // guard below still prevents repeated reloads within the current document.
  }
};

const clearStoredReloadTransition = () => {
  try {
    window.sessionStorage.removeItem(VERSION_RELOAD_STORAGE_KEY);
  } catch {
    // Ignore storage failures; version checks must never break normal usage.
  }
};

export const useVersionCheck = ({ runningVersion = getEmbeddedBuildVersion() } = {}) => {
  const reloadTriggered = useRef(false);
  const normalizedRunningVersion = runningVersion?.trim() ?? '';
  const versionChecksEnabled =
    normalizedRunningVersion.length > 0 && normalizedRunningVersion !== 'development';

  const { data: latestVersionData, isSuccess } = useQuery({
    queryKey: VERSION_QUERY_KEY,
    queryFn: fetchVersion,
    enabled: versionChecksEnabled,
    refetchOnWindowFocus: true,
    staleTime: 0,
    retry: false,
  });

  useEffect(() => {
    if (!versionChecksEnabled) {
      return;
    }

    const latestVersionIdentifier = latestVersionData?.version?.trim();
    if (!latestVersionIdentifier) {
      return;
    }

    if (latestVersionIdentifier === normalizedRunningVersion) {
      clearStoredReloadTransition();
      return;
    }

    const transition = `${normalizedRunningVersion}->${latestVersionIdentifier}`;

    if (
      reloadTriggered.current ||
      getStoredReloadTransition() === transition
    ) {
      return;
    }

    reloadTriggered.current = true;
    storeReloadTransition(transition);
    window.location.reload();
  }, [latestVersionData, normalizedRunningVersion, versionChecksEnabled]);

  return {
    runningVersion: normalizedRunningVersion,
    latestVersionIdentifier: latestVersionData?.version,
    isSuccess,
  };
};

export default useVersionCheck;
