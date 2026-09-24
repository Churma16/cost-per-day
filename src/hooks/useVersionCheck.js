import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchVersion } from '../services/versionService';

export const VERSION_QUERY_KEY = ['version'];

export const useVersionCheck = () => {
  const initialVersionReference = useRef(null);

  const { data: latestVersionData, isSuccess } = useQuery({
    queryKey: VERSION_QUERY_KEY,
    queryFn: fetchVersion,
    refetchOnWindowFocus: true,
    staleTime: 0,
    retry: false,
  });

  useEffect(() => {
    const latestVersionIdentifier = latestVersionData?.version;

    if (!latestVersionIdentifier) {
      return;
    }

    if (initialVersionReference.current === null) {
      initialVersionReference.current = latestVersionIdentifier;
    } else if (initialVersionReference.current !== latestVersionIdentifier) {
      window.location.reload();
    }
  }, [latestVersionData]);

  return {
    initialVersion: initialVersionReference.current,
    latestVersionIdentifier: latestVersionData?.version,
    isSuccess,
  };
};

export default useVersionCheck;
