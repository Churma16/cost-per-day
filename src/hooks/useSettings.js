import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys, SERVER_STATE_STALE_TIME } from '../query/queryConfig';
import { usePersistence } from '../contexts/PersistenceContext';

export const SETTINGS_QUERY_KEY = queryKeys.settings;

export const useSettings = () => {
  const { repositories } = usePersistence();
  const settingsRepository = repositories?.settings;

  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: () => settingsRepository.getAll(),
    enabled: Boolean(settingsRepository),
    staleTime: SERVER_STATE_STALE_TIME,
    retry: 1,
  });
};

export const useUpdateSetting = () => {
  const queryClient = useQueryClient();
  const { repositories } = usePersistence();
  const settingsRepository = repositories?.settings;

  return useMutation({
    mutationFn: ({ key, value }) => {
      if (!settingsRepository) {
        throw new Error('Settings persistence is unavailable.');
      }
      return settingsRepository.set(key, value);
    },
    onMutate: async ({ key, value }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.settings });
      const previousSettings = queryClient.getQueryData(queryKeys.settings);
      queryClient.setQueryData(queryKeys.settings, (settings = {}) => ({
        ...settings,
        [key]: value,
      }));
      return {
        previousSettings,
        hadPreviousSettings: previousSettings !== undefined,
      };
    },
    onError: (_error, _variables, context) => {
      if (context?.hadPreviousSettings) {
        queryClient.setQueryData(queryKeys.settings, context.previousSettings);
      } else {
        queryClient.removeQueries({ queryKey: queryKeys.settings, exact: true });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
  });
};
