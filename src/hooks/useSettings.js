import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getAllSettings, updateSetting } from '../services/api';
import { queryKeys, SERVER_STATE_STALE_TIME } from '../query/queryConfig';

export const SETTINGS_QUERY_KEY = queryKeys.settings;

export const useSettings = () => useQuery({
  queryKey: queryKeys.settings,
  queryFn: getAllSettings,
  staleTime: SERVER_STATE_STALE_TIME,
  retry: 1,
});

export const useUpdateSetting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ key, value }) => updateSetting(key, value),
    onMutate: async ({ key, value }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.settings });
      const previousSettings = queryClient.getQueryData(queryKeys.settings);
      queryClient.setQueryData(queryKeys.settings, (settings = {}) => ({
        ...settings,
        [key]: value,
      }));
      return { previousSettings };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousSettings) {
        queryClient.setQueryData(queryKeys.settings, context.previousSettings);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
  });
};
