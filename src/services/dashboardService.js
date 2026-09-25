import { ApiError, apiRequest } from './httpClient';

const DASHBOARD_NETWORK_ERROR =
  'Unable to reach the server. Check your connection and try again.';

export const fetchDashboardData = async () => {
  const dashboardData = await apiRequest('/api/dashboard', {
    networkErrorMessage: DASHBOARD_NETWORK_ERROR,
  });

  if (!dashboardData || typeof dashboardData !== 'object' || Array.isArray(dashboardData)) {
    throw new ApiError('The server returned an unexpected dashboard response structure.');
  }

  return dashboardData;
};
