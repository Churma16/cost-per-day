import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  const { user, isGuest } = useAuth();
  const queryClient = useQueryClient();
  const previousScopeRef = useRef('anonymous');
  const repositories = useMemo(
    () => selectPersistenceRepositories({ user, isGuest }),
    [user, isGuest],
  );
  const scope = user
    ? `authenticated:${user.id}`
    : isGuest
      ? 'guest'
      : 'anonymous';

  useEffect(() => {
    if (previousScopeRef.current !== scope) {
      queryClient.clear();
      previousScopeRef.current = scope;
    }
  }, [queryClient, scope]);

  const value = useMemo(() => ({ repositories, scope }), [repositories, scope]);

  return (
    <PersistenceContext.Provider value={value}>
      {children}
    </PersistenceContext.Provider>
  );
};

export const usePersistence = () => useContext(PersistenceContext);
