import { useQuery } from '@tanstack/react-query';
import { fetchReplacementBenchmark } from '../services/benchmarkService';

export const BENCHMARK_QUERY_KEY = ['replacement-benchmark'];

export const useReplacementBenchmark = (itemId, price, options = {}) => {
  const numericPrice = Number(price);
  const isValidPrice = Number.isFinite(numericPrice) && numericPrice > 0;
  const isEnabled = Boolean(itemId && isValidPrice && (options.enabled ?? true));

  return useQuery({
    queryKey: [...BENCHMARK_QUERY_KEY, itemId, numericPrice],
    queryFn: () => fetchReplacementBenchmark(itemId, numericPrice),
    enabled: isEnabled,
    staleTime: 60 * 1000,
    retry: false,
    ...options,
  });
};
