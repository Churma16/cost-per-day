import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import {
  apiRepositories,
  selectPersistenceRepositories,
} from '../data/persistenceRepositories';

const PersistenceContext = createContext({
  repositories: apiRepositories,
  scope: 'api-default',
});

export const PersistenceProvider = ({ children }) => {
  const { user, isGuest, migrationRevision = 0 } = useAuth();
  const queryClient = useQueryClient();
  const repositories = useMemo(
    () => selectPersistenceRepositories({ user, isGuest }),
    [user, isGuest],
  );
  const scope = user
    ? `authenticated:${user.id}`
    : isGuest
      ? 'guest'
      : 'anonymous';
  const [activeScope, setActiveScope] = useState(scope);
  const previousMigrationRevisionRef = useRef(migrationRevision);

  useEffect(() => {
    if (activeScope === scope) return;
    queryClient.clear();
    setActiveScope(scope);
  }, [activeScope, queryClient, scope]);

  useEffect(() => {
    if (previousMigrationRevisionRef.current === migrationRevision) return;
    previousMigrationRevisionRef.current = migrationRevision;
    queryClient.invalidateQueries();
  }, [migrationRevision, queryClient]);

  const value = useMemo(() => ({ repositories, scope }), [repositories, scope]);

  if (activeScope !== scope) {
    return null;
  }

  return (
    <PersistenceContext.Provider value={value}>
      {children}
    </PersistenceContext.Provider>
  );
};

export const usePersistence = () => useContext(PersistenceContext);
