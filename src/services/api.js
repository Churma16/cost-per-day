export const DEFAULT_SETTINGS = {
  language: 'en',
  currency: 'USD'
};

const DEFAULT_API_BASE_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:8080'
  : '';

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || DEFAULT_API_BASE_URL)
  .trim()
  .replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(message, status = null, cause = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.cause = cause;
  }
}

const buildApiUrl = (path) => `${API_BASE_URL}${path}`;

const request = async (path, options = {}) => {
  const requestOptions = {
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

const toItemPayload = (item) => ({
  name: item.name,
  price: Number(item.price),
  purchaseDate: item.purchaseDate
});

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
