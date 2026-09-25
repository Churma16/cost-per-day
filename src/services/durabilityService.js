import { ApiError, apiRequest } from './httpClient';

const isObjectData = (value) => (
  value
  && typeof value === 'object'
  && !Array.isArray(value)
);

export const fetchDurabilityAnalytics = async ({ category = '', brand = '' } = {}) => {
  const queryParameters = new URLSearchParams();
  if (category && category.trim() !== '') {
    queryParameters.append('category', category.trim());
  }
  if (brand && brand.trim() !== '') {
    queryParameters.append('brand', brand.trim());
  }

  const queryString = queryParameters.toString();
  const requestUrl = `/api/insights/durability${queryString ? `?${queryString}` : ''}`;

  const analytics = await apiRequest(requestUrl, {
    networkErrorMessage: 'Unable to load durability analytics from the server.',
  });

  if (!isObjectData(analytics)) {
    throw new ApiError('The server returned an unexpected durability analytics response structure.');
  }

  return analytics;
};

export const fetchCategories = async () => {
  const categories = await apiRequest('/api/categories', {
    networkErrorMessage: 'Unable to load categories from the server.',
  });

  if (!Array.isArray(categories)) {
    throw new ApiError('The server returned an unexpected categories response structure.');
  }

  return categories;
};

export const fetchBrands = async () => {
  const brands = await apiRequest('/api/brands', {
    networkErrorMessage: 'Unable to load brands from the server.',
  });

  if (!Array.isArray(brands)) {
    throw new ApiError('The server returned an unexpected brands response structure.');
  }

  return brands;
};
