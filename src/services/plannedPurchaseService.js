import axios from 'axios';

const resolvePlannedPurchaseApiBaseUrl = () => {
  const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (configuredApiBaseUrl && configuredApiBaseUrl.trim() !== '') {
    return configuredApiBaseUrl.trim().replace(/\/+$/, '');
  }
  return import.meta.env.MODE === 'development' ? 'http://localhost:8080' : '';
};

export const plannedPurchaseHttpClient = axios.create({
  baseURL: resolvePlannedPurchaseApiBaseUrl(),
  withCredentials: true,
  headers: {
    Accept: 'application/json',
  },
});

const handlePlannedPurchaseHttpError = (error, fallbackMessage) => {
  if (error.response?.data?.meta?.message) {
    throw new Error(error.response.data.meta.message);
  }
  if (error.response?.status) {
    throw new Error(`Request failed with status code ${error.response.status}.`);
  }
  throw new Error(fallbackMessage || 'Unable to reach the server. Check your connection and try again.');
};

export const fetchPlannedPurchases = async () => {
  try {
    const httpResponse = await plannedPurchaseHttpClient.get('/api/planned-purchases');
    const responsePayload = httpResponse.data;

    if (!responsePayload || typeof responsePayload !== 'object' || !Array.isArray(responsePayload.data)) {
      throw new Error('The server returned an unexpected planned purchases response structure.');
    }

    return responsePayload.data;
  } catch (error) {
    return handlePlannedPurchaseHttpError(error, 'Unable to load planned purchases from the server.');
  }
};

export const fetchPlannedPurchaseById = async (plannedPurchaseId) => {
  try {
    const httpResponse = await plannedPurchaseHttpClient.get(`/api/planned-purchases/${encodeURIComponent(String(plannedPurchaseId))}`);
    const responsePayload = httpResponse.data;

    if (!responsePayload || typeof responsePayload !== 'object' || !responsePayload.data) {
      throw new Error('The server returned an unexpected planned purchase response structure.');
    }

    return responsePayload.data;
  } catch (error) {
    return handlePlannedPurchaseHttpError(error, 'Unable to load the requested planned purchase.');
  }
};

export const createPlannedPurchase = async (plannedPurchasePayload) => {
  try {
    const httpResponse = await plannedPurchaseHttpClient.post('/api/planned-purchases', plannedPurchasePayload);
    const responsePayload = httpResponse.data;

    if (!responsePayload || typeof responsePayload !== 'object' || !responsePayload.data) {
      throw new Error('The server returned an unexpected planned purchase creation response structure.');
    }

    return responsePayload.data;
  } catch (error) {
    return handlePlannedPurchaseHttpError(error, 'Unable to create the planned purchase.');
  }
};

export const updatePlannedPurchase = async (plannedPurchaseId, plannedPurchasePayload) => {
  try {
    const httpResponse = await plannedPurchaseHttpClient.put(
      `/api/planned-purchases/${encodeURIComponent(String(plannedPurchaseId))}`,
      plannedPurchasePayload
    );
    const responsePayload = httpResponse.data;

    if (!responsePayload || typeof responsePayload !== 'object' || !responsePayload.data) {
      throw new Error('The server returned an unexpected planned purchase update response structure.');
    }

    return responsePayload.data;
  } catch (error) {
    return handlePlannedPurchaseHttpError(error, 'Unable to update the planned purchase.');
  }
};

export const deletePlannedPurchase = async (plannedPurchaseId) => {
  try {
    const httpResponse = await plannedPurchaseHttpClient.delete(
      `/api/planned-purchases/${encodeURIComponent(String(plannedPurchaseId))}`
    );
    return httpResponse.data;
  } catch (error) {
    return handlePlannedPurchaseHttpError(error, 'Unable to delete the planned purchase.');
  }
};

export const convertPlannedPurchase = async (plannedPurchaseId, conversionPayload) => {
  try {
    const httpResponse = await plannedPurchaseHttpClient.post(
      `/api/planned-purchases/${encodeURIComponent(String(plannedPurchaseId))}/convert`,
      conversionPayload
    );
    const responsePayload = httpResponse.data;

    if (!responsePayload || typeof responsePayload !== 'object' || !responsePayload.data) {
      throw new Error('The server returned an unexpected planned purchase conversion response structure.');
    }

    return responsePayload.data;
  } catch (error) {
    return handlePlannedPurchaseHttpError(error, 'Unable to convert the planned purchase.');
  }
};
