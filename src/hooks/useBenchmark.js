import { useQuery } from '@tanstack/react-query';
import { fetchReplacementBenchmark } from '../services/benchmarkService';
import { queryKeys, SERVER_STATE_STALE_TIME } from '../query/queryConfig';

export const BENCHMARK_QUERY_KEY = queryKeys.replacementBenchmarks;

export const useReplacementBenchmark = (itemId, price, options = {}) => {
  const numericPrice = Number(price);
  const isValidPrice = Number.isFinite(numericPrice) && numericPrice > 0;
  const isEnabled = Boolean(itemId && isValidPrice && (options.enabled ?? true));

  return useQuery({
    queryKey: queryKeys.replacementBenchmark(itemId, numericPrice),
    queryFn: () => fetchReplacementBenchmark(itemId, numericPrice),
    enabled: isEnabled,
    staleTime: SERVER_STATE_STALE_TIME,
    retry: false,
    ...options,
  });
};
