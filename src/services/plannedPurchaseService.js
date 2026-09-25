import {
  ApiError,
  apiRequest,
  apiRequestEnvelope,
} from './httpClient';

const isObjectData = (value) => (
  value
  && typeof value === 'object'
  && !Array.isArray(value)
);

const validatePlannedPurchase = (plannedPurchase, message) => {
  if (!isObjectData(plannedPurchase)) {
    throw new ApiError(message);
  }
  return plannedPurchase;
};

export const fetchPlannedPurchases = async () => {
  const plannedPurchases = await apiRequest('/api/planned-purchases', {
    networkErrorMessage: 'Unable to load planned purchases from the server.',
  });

  if (!Array.isArray(plannedPurchases)) {
    throw new ApiError('The server returned an unexpected planned purchases response structure.');
  }

  return plannedPurchases;
};

export const fetchPlannedPurchaseById = async (plannedPurchaseId) => {
  const plannedPurchase = await apiRequest(
    `/api/planned-purchases/${encodeURIComponent(String(plannedPurchaseId))}`,
    {
      networkErrorMessage: 'Unable to load the requested planned purchase.',
    }
  );

  return validatePlannedPurchase(
    plannedPurchase,
    'The server returned an unexpected planned purchase response structure.'
  );
};

export const createPlannedPurchase = async (plannedPurchasePayload) => {
  const plannedPurchase = await apiRequest('/api/planned-purchases', {
    method: 'POST',
    json: plannedPurchasePayload,
    networkErrorMessage: 'Unable to create the planned purchase.',
  });

  return validatePlannedPurchase(
    plannedPurchase,
    'The server returned an unexpected planned purchase creation response structure.'
  );
};

export const updatePlannedPurchase = async (plannedPurchaseId, plannedPurchasePayload) => {
  const plannedPurchase = await apiRequest(
    `/api/planned-purchases/${encodeURIComponent(String(plannedPurchaseId))}`,
    {
      method: 'PUT',
      json: plannedPurchasePayload,
      networkErrorMessage: 'Unable to update the planned purchase.',
    }
  );

  return validatePlannedPurchase(
    plannedPurchase,
    'The server returned an unexpected planned purchase update response structure.'
  );
};

export const deletePlannedPurchase = (plannedPurchaseId) => apiRequestEnvelope(
  `/api/planned-purchases/${encodeURIComponent(String(plannedPurchaseId))}`,
  {
    method: 'DELETE',
    networkErrorMessage: 'Unable to delete the planned purchase.',
  }
);
