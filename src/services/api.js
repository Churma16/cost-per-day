export const DEFAULT_SETTINGS = {
  language: 'en',
  currency: 'USD'
};

export const resolveApiBaseUrl = () => {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (configuredBaseUrl && configuredBaseUrl.trim() !== '') {
    return configuredBaseUrl.trim().replace(/\/+$/, '');
  }
  return import.meta.env.MODE === 'development' ? 'http://localhost:8080' : '';
};

export const API_BASE_URL = resolveApiBaseUrl();

export class ApiError extends Error {
  constructor(message, status = null, cause = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.cause = cause;
  }
}

export const buildApiUrl = (path) => `${resolveApiBaseUrl()}${path}`;

const request = async (path, options = {}) => {
  const requestOptions = {
    credentials: 'include',
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    }
  };

  let response;
  try {
    response = await fetch(buildApiUrl(path), requestOptions);
  } catch (error) {
    throw new ApiError(
      'Unable to reach the server. Check the backend connection and try again.',
      null,
      error
    );
  }

  let envelope = null;
  try {
    envelope = await response.json();
  } catch (error) {
    if (response.ok) {
      throw new ApiError('The server returned an unexpected response.', response.status, error);
    }
  }

  if (!response.ok) {
    throw new ApiError(
      envelope?.meta?.message || `Request failed with status ${response.status}.`,
      response.status
    );
  }

  if (!envelope || typeof envelope !== 'object' || !Object.prototype.hasOwnProperty.call(envelope, 'data')) {
    throw new ApiError('The server returned an unexpected response.', response.status);
  }

  return envelope.data;
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
  const items = await request('/api/items');
  if (!Array.isArray(items)) {
    throw new ApiError('The server returned invalid item data.');
  }
  return items;
};

export const addItem = (item) => request('/api/items', {
  method: 'POST',
  body: JSON.stringify(toItemPayload(item))
});

export const updateItem = (id, item) => request(`/api/items/${encodeURIComponent(String(id))}`, {
  method: 'PUT',
  body: JSON.stringify(toItemPayload(item))
});

export const deleteItem = (id) => request(`/api/items/${encodeURIComponent(String(id))}`, {
  method: 'DELETE'
});

export const getReplacementBenchmark = (id, price) => request(
  `/api/items/${encodeURIComponent(String(id))}/replacement-benchmark?price=${encodeURIComponent(String(price))}`
);

export const getAllSettings = async () => {
  const settings = await request('/api/settings');
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    throw new ApiError('The server returned invalid settings data.');
  }
  return settings;
};

export const getSetting = async (key) => {
  const settings = await getAllSettings();
  return settings[key] ?? DEFAULT_SETTINGS[key];
};

export const updateSetting = (key, value) => request(
  `/api/settings/${encodeURIComponent(String(key))}`,
  {
    method: 'PUT',
    body: JSON.stringify({ value: String(value) })
  }
);

export const replaceAllItems = async (items) => {
  if (!Array.isArray(items)) {
    throw new ApiError('Import data must be an array of items.');
  }

  const replacedItems = await request('/api/items/replace', {
    method: 'PUT',
    body: JSON.stringify(items.map(toItemPayload))
  });

  if (!Array.isArray(replacedItems)) {
    throw new ApiError('The server returned invalid item data.');
  }

  return replacedItems;
};


export const getCurrentUser = () => request('/api/me');

export const logoutCurrentUser = () => request('/auth/logout', {
  method: 'POST'
});

export const getGoogleLoginUrl = () => buildApiUrl('/auth/google/login');

const toValueEquivalentPayload = (equivalent) => ({
  name: String(equivalent?.name || '').trim(),
  amount: Number(equivalent?.amount),
  currencyCode: String(equivalent?.currencyCode || '').trim().toUpperCase()
});

export const getAllValueEquivalents = async () => {
  const valueEquivalents = await request('/api/value-equivalents');
  if (!Array.isArray(valueEquivalents)) {
    throw new ApiError('The server returned invalid value equivalent data.');
  }
  return valueEquivalents;
};

export const createValueEquivalent = (equivalent) => request('/api/value-equivalents', {
  method: 'POST',
  body: JSON.stringify(toValueEquivalentPayload(equivalent))
});

export const updateValueEquivalent = (id, equivalent) => request(
  `/api/value-equivalents/${encodeURIComponent(String(id))}`,
  {
    method: 'PUT',
    body: JSON.stringify(toValueEquivalentPayload(equivalent))
  }
);

export const deleteValueEquivalent = (id) => request(
  `/api/value-equivalents/${encodeURIComponent(String(id))}`,
  {
    method: 'DELETE'
  }
);

