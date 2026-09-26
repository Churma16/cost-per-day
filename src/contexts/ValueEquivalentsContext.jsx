import React, { createContext, useContext } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAllValueEquivalents,
  createValueEquivalent,
  updateValueEquivalent,
  deleteValueEquivalent
} from '../services/api';
import { queryKeys, SERVER_STATE_STALE_TIME } from '../query/queryConfig';
import { useAuth } from './AuthContext';

export const ValueEquivalentsContext = createContext(null);

export const ValueEquivalentsProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const auth = useAuth();
  const hasAuthenticatedUser = auth === null ? true : Boolean(auth.user);
  const equivalentsQuery = useQuery({
    queryKey: queryKeys.valueEquivalents,
    queryFn: getAllValueEquivalents,
    enabled: hasAuthenticatedUser,
    staleTime: SERVER_STATE_STALE_TIME,
    retry: 1,
  });

  const createMutation = useMutation({
    mutationFn: (data) => {
      if (!hasAuthenticatedUser) throw new Error('Sign in to use synced value equivalents.');
      return createValueEquivalent(data);
    },
    onSuccess: (created) => {
      queryClient.setQueryData(queryKeys.valueEquivalents, (items = []) => [...items, created]);
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => {
      if (!hasAuthenticatedUser) throw new Error('Sign in to use synced value equivalents.');
      return updateValueEquivalent(id, data);
    },
    onSuccess: (updated, { id }) => {
      queryClient.setQueryData(queryKeys.valueEquivalents, (items = []) =>
        items.map((item) => (String(item.id) === String(id) ? updated : item))
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => {
      if (!hasAuthenticatedUser) throw new Error('Sign in to use synced value equivalents.');
      return deleteValueEquivalent(id);
    },
    onSuccess: (_result, id) => {
      queryClient.setQueryData(queryKeys.valueEquivalents, (items = []) =>
        items.filter((item) => String(item.id) !== String(id))
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });

  return (
    <ValueEquivalentsContext.Provider value={{
      valueEquivalents: equivalentsQuery.data || [],
      isLoading: equivalentsQuery.isLoading && !equivalentsQuery.data,
      error: equivalentsQuery.data === undefined ? equivalentsQuery.error : null,
      addEquivalent: (data) => createMutation.mutateAsync(data),
      editEquivalent: (id, data) => updateMutation.mutateAsync({ id, data }),
      removeEquivalent: (id) => deleteMutation.mutateAsync(id),
      refreshEquivalents: equivalentsQuery.refetch
    }}>
      {children}
    </ValueEquivalentsContext.Provider>
  );
};

export const useValueEquivalents = () => {
  const context = useContext(ValueEquivalentsContext);
  if (!context) throw new Error('useValueEquivalents must be used within a ValueEquivalentsProvider');
  return context;
};
