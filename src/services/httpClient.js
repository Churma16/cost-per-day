export const resolveApiBaseUrl = () => {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (configuredBaseUrl && configuredBaseUrl.trim() !== '') {
    return configuredBaseUrl.trim().replace(/\/+$/, '');
  }
  return import.meta.env.MODE === 'development' ? 'http://localhost:8080' : '';
};

export const API_BASE_URL = resolveApiBaseUrl();

export class ApiError extends Error {
  constructor(message, status = null, cause = null, meta = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.cause = cause;
    this.meta = meta;
  }
}

export const buildApiUrl = (path) => `${resolveApiBaseUrl()}${path}`;

const DEFAULT_NETWORK_ERROR_MESSAGE =
  'Unable to reach the server. Check the backend connection and try again.';

const statusFallbackMessage = (status) => `Request failed with status ${status}.`;

const isEnvelope = (value) => (
  value
  && typeof value === 'object'
  && !Array.isArray(value)
  && Object.prototype.hasOwnProperty.call(value, 'data')
);

export const apiRequestEnvelope = async (path, options = {}) => {
  const {
    json,
    headers,
    networkErrorMessage = DEFAULT_NETWORK_ERROR_MESSAGE,
    ...requestOptions
  } = options;

  const hasJsonBody = Object.prototype.hasOwnProperty.call(options, 'json');
  const fetchOptions = {
    credentials: 'include',
    ...requestOptions,
    ...(hasJsonBody ? { body: JSON.stringify(json) } : {}),
    headers: {
      Accept: 'application/json',
      ...(hasJsonBody ? { 'Content-Type': 'application/json' } : {}),
      ...(headers || {})
    }
  };

  let response;
  try {
    response = await fetch(buildApiUrl(path), fetchOptions);
  } catch (error) {
    throw new ApiError(networkErrorMessage, null, error);
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
      envelope?.meta?.message || statusFallbackMessage(response.status),
      response.status,
      null,
      envelope?.meta || null
    );
  }

  if (!isEnvelope(envelope)) {
    throw new ApiError(
      'The server returned an unexpected response.',
      response.status,
      null,
      envelope?.meta || null
    );
  }

  return envelope;
};

export const apiRequest = async (path, options = {}) => {
  const envelope = await apiRequestEnvelope(path, options);
  return envelope.data;
};
