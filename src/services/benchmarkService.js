import axios from 'axios';

const resolveBenchmarkApiBaseUrl = () => {
  const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (configuredApiBaseUrl && configuredApiBaseUrl.trim() !== '') {
    return configuredApiBaseUrl.trim().replace(/\/+$/, '');
  }
  return import.meta.env.MODE === 'development' ? 'http://localhost:8080' : '';
};

export const benchmarkHttpClient = axios.create({
  baseURL: resolveBenchmarkApiBaseUrl(),
  withCredentials: true,
  headers: {
    Accept: 'application/json',
  },
});

export const fetchReplacementBenchmark = async (itemId, price) => {
  try {
    const httpResponse = await benchmarkHttpClient.get(
      `/api/items/${encodeURIComponent(String(itemId))}/replacement-benchmark`,
      {
        params: { price }
      }
    );
    const responsePayload = httpResponse.data;

    if (!responsePayload || typeof responsePayload !== 'object' || !responsePayload.data) {
      throw new Error('The server returned an unexpected benchmark response structure.');
    }

    return responsePayload.data;
  } catch (error) {
    if (error.response?.data?.meta?.message) {
      throw new Error(error.response.data.meta.message);
    }
    if (error.response?.status) {
      throw new Error(`Request failed with status code ${error.response.status}.`);
    }
    throw new Error('Unable to reach the server. Check your connection and try again.');
  }
};
