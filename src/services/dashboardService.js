import axios from 'axios';

const resolveDashboardApiBaseUrl = () => {
  const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (configuredApiBaseUrl && configuredApiBaseUrl.trim() !== '') {
    return configuredApiBaseUrl.trim().replace(/\/+$/, '');
  }
  return import.meta.env.MODE === 'development' ? 'http://localhost:8080' : '';
};

export const dashboardHttpClient = axios.create({
  baseURL: resolveDashboardApiBaseUrl(),
  withCredentials: true,
  headers: {
    Accept: 'application/json',
  },
});

export const fetchDashboardData = async () => {
  try {
    const httpResponse = await dashboardHttpClient.get('/api/dashboard');
    const responsePayload = httpResponse.data;

    if (!responsePayload || typeof responsePayload !== 'object' || !responsePayload.data) {
      throw new Error('The server returned an unexpected dashboard response structure.');
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
