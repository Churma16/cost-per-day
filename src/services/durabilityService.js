import axios from 'axios';

const resolveDurabilityApiBaseUrl = () => {
  const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (configuredApiBaseUrl && configuredApiBaseUrl.trim() !== '') {
    return configuredApiBaseUrl.trim().replace(/\/+$/, '');
  }
  return import.meta.env.MODE === 'development' ? 'http://localhost:8080' : '';
};

export const durabilityHttpClient = axios.create({
  baseURL: resolveDurabilityApiBaseUrl(),
  withCredentials: true,
  headers: {
    Accept: 'application/json',
  },
});

const handleDurabilityHttpError = (error, fallbackMessage) => {
  if (error.response?.data?.meta?.message) {
    throw new Error(error.response.data.meta.message);
  }
  if (error.response?.status) {
    throw new Error(`Request failed with status code ${error.response.status}.`);
  }
  throw new Error(fallbackMessage || 'Unable to reach the server. Check your connection and try again.');
};

export const fetchDurabilityAnalytics = async ({ category = '', brand = '' } = {}) => {
  try {
    const queryParameters = new URLSearchParams();
    if (category && category.trim() !== '') {
      queryParameters.append('category', category.trim());
    }
    if (brand && brand.trim() !== '') {
      queryParameters.append('brand', brand.trim());
    }

    const queryString = queryParameters.toString();
    const requestUrl = `/api/insights/durability${queryString ? `?${queryString}` : ''}`;

    const httpResponse = await durabilityHttpClient.get(requestUrl);
    const responsePayload = httpResponse.data;

    if (!responsePayload || typeof responsePayload !== 'object' || !responsePayload.data) {
      throw new Error('The server returned an unexpected durability analytics response structure.');
    }

    return responsePayload.data;
  } catch (error) {
    return handleDurabilityHttpError(error, 'Unable to load durability analytics from the server.');
  }
};

export const fetchCategories = async () => {
  try {
    const httpResponse = await durabilityHttpClient.get('/api/categories');
    const responsePayload = httpResponse.data;

    if (!responsePayload || typeof responsePayload !== 'object' || !Array.isArray(responsePayload.data)) {
      throw new Error('The server returned an unexpected categories response structure.');
    }

    return responsePayload.data;
  } catch (error) {
    return handleDurabilityHttpError(error, 'Unable to load categories from the server.');
  }
};

export const fetchBrands = async () => {
  try {
    const httpResponse = await durabilityHttpClient.get('/api/brands');
    const responsePayload = httpResponse.data;

    if (!responsePayload || typeof responsePayload !== 'object' || !Array.isArray(responsePayload.data)) {
      throw new Error('The server returned an unexpected brands response structure.');
    }

    return responsePayload.data;
  } catch (error) {
    return handleDurabilityHttpError(error, 'Unable to load brands from the server.');
  }
};
