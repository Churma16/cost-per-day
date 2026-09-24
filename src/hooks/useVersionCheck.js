import { useEffect, useRef } from 'react';

export const useVersionCheck = () => {
  const initialVersionReference = useRef(null);

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const response = await fetch('/version.json', {
          cache: 'no-store',
        });

        if (!response.ok) {
          return;
        }

        const versionData = await response.json();
        const latestVersionIdentifier = versionData?.version;

        if (!latestVersionIdentifier) {
          return;
        }

        if (initialVersionReference.current === null) {
          initialVersionReference.current = latestVersionIdentifier;
        } else if (initialVersionReference.current !== latestVersionIdentifier) {
          window.location.reload();
        }
      } catch {
        // Fail silently on network errors or JSON parse failures
      }
    };

    checkVersion();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkVersion();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
};

export default useVersionCheck;
