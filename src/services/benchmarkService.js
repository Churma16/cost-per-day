import { getReplacementBenchmark } from './api';

export const fetchReplacementBenchmark = async (itemId, price) => {
  return getReplacementBenchmark(itemId, price);
};
