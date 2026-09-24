import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { updateSetting } from '../services/api';
import { queryKeys } from '../query/queryConfig';
import { useUpdateSetting } from './useSettings';

vi.mock('../services/api', () => ({
  getAllSettings: vi.fn(),
  updateSetting: vi.fn(),
}));

describe('settings mutations', () => {
  beforeEach(() => vi.clearAllMocks());

  it('removes an optimistic setting when the mutation fails without prior cache data', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });
    updateSetting.mockRejectedValue(new Error('Save failed'));
    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useUpdateSetting(), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync({ key: 'currency', value: 'IDR' }))
        .rejects.toThrow('Save failed');
    });

    expect(queryClient.getQueryData(queryKeys.settings)).toBeUndefined();
  });
});
