import {
  API_BASE_URL,
  ApiError,
  apiRequest,
  buildApiUrl,
  resolveApiBaseUrl,
} from './httpClient';

export {
  API_BASE_URL,
  ApiError,
  buildApiUrl,
  resolveApiBaseUrl,
};

export const DEFAULT_SETTINGS = {
  language: 'en',
  currency: 'USD'
};

const toItemPayload = (item) => {
  const payload = {
    name: item.name,
    price: Number(item.price),
    purchaseDate: item.purchaseDate
  };

  if (Object.prototype.hasOwnProperty.call(item, 'status')) {
    payload.status = item.status;
  }
  if (Object.prototype.hasOwnProperty.call(item, 'endedAt')) {
    payload.endedAt = item.endedAt ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(item, 'salePrice')) {
    payload.salePrice = item.salePrice === null || item.salePrice === undefined || item.salePrice === ''
      ? null
      : Number(item.salePrice);
  }
  if (Object.prototype.hasOwnProperty.call(item, 'targetType')) {
    payload.targetType = item.targetType === '' || item.targetType === undefined ? null : item.targetType;
  }
  if (Object.prototype.hasOwnProperty.call(item, 'targetValue')) {
    payload.targetValue = item.targetValue === null || item.targetValue === undefined || item.targetValue === ''
      ? null
      : Number(item.targetValue);
  }
  if (Object.prototype.hasOwnProperty.call(item, 'category')) {
    payload.category = item.category === '' || item.category === undefined ? null : item.category;
  }
  if (Object.prototype.hasOwnProperty.call(item, 'brand')) {
    payload.brand = item.brand === '' || item.brand === undefined ? null : item.brand;
  }

  return payload;
};

export const getAllItems = async () => {
  const items = await apiRequest('/api/items');
  if (!Array.isArray(items)) {
    throw new ApiError('The server returned invalid item data.');
  }
  return items;
};

export const addItem = (item) => apiRequest('/api/items', {
  method: 'POST',
  json: toItemPayload(item)
});

export const updateItem = (id, item) => apiRequest(`/api/items/${encodeURIComponent(String(id))}`, {
  method: 'PUT',
  json: toItemPayload(item)
});

export const deleteItem = (id) => apiRequest(`/api/items/${encodeURIComponent(String(id))}`, {
  method: 'DELETE'
});

export const getReplacementBenchmark = (id, price) => apiRequest(
  `/api/items/${encodeURIComponent(String(id))}/replacement-benchmark?price=${encodeURIComponent(String(price))}`
);

export const getAllSettings = async () => {
  const settings = await apiRequest('/api/settings');
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    throw new ApiError('The server returned invalid settings data.');
  }
  return settings;
};

export const getSetting = async (key) => {
  const settings = await getAllSettings();
  return settings[key] ?? DEFAULT_SETTINGS[key];
};

export const updateSetting = (key, value) => apiRequest(
  `/api/settings/${encodeURIComponent(String(key))}`,
  {
    method: 'PUT',
    json: { value: String(value) }
  }
);

export const replaceAllItems = async (items) => {
  if (!Array.isArray(items)) {
    throw new ApiError('Import data must be an array of items.');
  }

  const replacedItems = await apiRequest('/api/items/replace', {
    method: 'PUT',
    json: items.map(toItemPayload)
  });

  if (!Array.isArray(replacedItems)) {
    throw new ApiError('The server returned invalid item data.');
  }

  return replacedItems;
};

export const getCurrentUser = () => apiRequest('/api/me');

export const logoutCurrentUser = () => apiRequest('/auth/logout', {
  method: 'POST'
});

export const getGoogleLoginUrl = () => buildApiUrl('/auth/google/login');

const toValueEquivalentPayload = (equivalent) => ({
  name: String(equivalent?.name || '').trim(),
  amount: Number(equivalent?.amount),
  currencyCode: String(equivalent?.currencyCode || '').trim().toUpperCase()
});

export const getAllValueEquivalents = async () => {
  const valueEquivalents = await apiRequest('/api/value-equivalents');
  if (!Array.isArray(valueEquivalents)) {
    throw new ApiError('The server returned invalid value equivalent data.');
  }
  return valueEquivalents;
};

export const createValueEquivalent = (equivalent) => apiRequest('/api/value-equivalents', {
  method: 'POST',
  json: toValueEquivalentPayload(equivalent)
});

export const updateValueEquivalent = (id, equivalent) => apiRequest(
  `/api/value-equivalents/${encodeURIComponent(String(id))}`,
  {
    method: 'PUT',
    json: toValueEquivalentPayload(equivalent)
  }
);

export const deleteValueEquivalent = (id) => apiRequest(
  `/api/value-equivalents/${encodeURIComponent(String(id))}`,
  {
    method: 'DELETE'
  }
);
