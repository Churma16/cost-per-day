import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchVersion } from '../services/versionService';

export const VERSION_QUERY_KEY = ['version'];
export const VERSION_RELOAD_STORAGE_KEY = 'worthwhile:version-reload';

const getEmbeddedBuildRevision = () => import.meta.env.VITE_APP_REVISION?.trim() ?? '';

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

export const useVersionCheck = ({ runningRevision = getEmbeddedBuildRevision() } = {}) => {
  const reloadTriggered = useRef(false);
  const normalizedRunningRevision = runningRevision?.trim() ?? '';
  const versionChecksEnabled =
    normalizedRunningRevision.length > 0 && normalizedRunningRevision !== 'development';

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

    const latestRevision =
      latestVersionData?.revision?.trim() ||
      latestVersionData?.version?.trim();
    if (!latestRevision) {
      return;
    }

    if (latestRevision === normalizedRunningRevision) {
      clearStoredReloadTransition();
      return;
    }

    const transition = `${normalizedRunningRevision}->${latestRevision}`;

    if (
      reloadTriggered.current ||
      getStoredReloadTransition() === transition
    ) {
      return;
    }

    reloadTriggered.current = true;
    storeReloadTransition(transition);
    window.location.reload();
  }, [latestVersionData, normalizedRunningRevision, versionChecksEnabled]);

  return {
    runningRevision: normalizedRunningRevision,
    latestRevision: latestVersionData?.revision,
    isSuccess,
  };
};

export default useVersionCheck;
