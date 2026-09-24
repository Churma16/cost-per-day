import React from 'react';
import { render as testingLibraryRender, screen, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
  ValueEquivalentsProvider,
  useValueEquivalents
} from './ValueEquivalentsContext';
import {
  getAllValueEquivalents,
  createValueEquivalent,
  updateValueEquivalent,
  deleteValueEquivalent
} from '../services/api';
import { queryKeys } from '../query/queryConfig';

vi.mock('../services/api', () => ({
  getAllValueEquivalents: vi.fn(),
  createValueEquivalent: vi.fn(),
  updateValueEquivalent: vi.fn(),
  deleteValueEquivalent: vi.fn()
}));

const render = (ui) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return testingLibraryRender(ui, {
    wrapper: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  });
};

const TestConsumer = () => {
  const {
    valueEquivalents,
    isLoading,
    error,
    addEquivalent,
    editEquivalent,
    removeEquivalent
  } = useValueEquivalents();

  if (isLoading) {
    return <div>Loading Equivalents...</div>;
  }

  return (
    <div>
      {error && <div data-testid="error-message">{error.message}</div>}
      <div data-testid="equivalents-count">{valueEquivalents.length}</div>
      <ul>
        {valueEquivalents.map((item) => (
          <li key={item.id} data-testid={`item-${item.id}`}>
            {item.name}: {item.amount} {item.currencyCode}
          </li>
        ))}
      </ul>
      <button
        onClick={() =>
          addEquivalent({ name: 'Coffee', amount: 15000, currencyCode: 'IDR' })
        }
      >
        Add Coffee
      </button>
      <button
        onClick={() =>
          editEquivalent('1', { name: 'Expensive Coffee', amount: 20000, currencyCode: 'IDR' })
        }
      >
        Edit Coffee
      </button>
      <button onClick={() => removeEquivalent('1')}>Delete Coffee</button>
    </div>
  );
};

describe('ValueEquivalentsContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads and provides value equivalents on initial mount', async () => {
    const initialData = [
      { id: '1', name: 'Gorengan', amount: 2500, currencyCode: 'IDR' }
    ];
    getAllValueEquivalents.mockResolvedValue(initialData);

    render(
      <ValueEquivalentsProvider>
        <TestConsumer />
      </ValueEquivalentsProvider>
    );

    expect(screen.getByText('Loading Equivalents...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('equivalents-count')).toHaveTextContent('1');
      expect(screen.getByTestId('item-1')).toHaveTextContent('Gorengan: 2500 IDR');
    });
  });

  it('keeps cached equivalents visible when a background refresh fails', () => {
    const cachedEquivalents = [
      { id: 'cached-1', name: 'Coffee', amount: 15000, currencyCode: 'IDR' }
    ];
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(queryKeys.valueEquivalents, cachedEquivalents, { updatedAt: 1 });
    getAllValueEquivalents.mockRejectedValue(new Error('Temporary network failure'));

    testingLibraryRender(
      <QueryClientProvider client={queryClient}>
        <ValueEquivalentsProvider><TestConsumer /></ValueEquivalentsProvider>
      </QueryClientProvider>
    );

    expect(screen.getByTestId('item-cached-1')).toHaveTextContent('Coffee: 15000 IDR');
    expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
  });

  it('adds, edits, and removes value equivalents optimistically/server updated', async () => {
    getAllValueEquivalents.mockResolvedValue([]);
    createValueEquivalent.mockResolvedValue({
      id: '1',
      name: 'Coffee',
      amount: 15000,
      currencyCode: 'IDR'
    });
    updateValueEquivalent.mockResolvedValue({
      id: '1',
      name: 'Expensive Coffee',
      amount: 20000,
      currencyCode: 'IDR'
    });
    deleteValueEquivalent.mockResolvedValue(null);

    render(
      <ValueEquivalentsProvider>
        <TestConsumer />
      </ValueEquivalentsProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('equivalents-count')).toHaveTextContent('0');
    });

    // Add
    await act(async () => {
      screen.getByText('Add Coffee').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('equivalents-count')).toHaveTextContent('1');
      expect(screen.getByTestId('item-1')).toHaveTextContent('Coffee: 15000 IDR');
    });

    // Edit
    await act(async () => {
      screen.getByText('Edit Coffee').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('item-1')).toHaveTextContent('Expensive Coffee: 20000 IDR');
    });

    // Delete
    await act(async () => {
      screen.getByText('Delete Coffee').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('equivalents-count')).toHaveTextContent('0');
    });
  });

  it('throws error when hook is used outside of provider', () => {
    const BadComponent = () => {
      useValueEquivalents();
      return null;
    };

    expect(() => render(<BadComponent />)).toThrow(
      'useValueEquivalents must be used within a ValueEquivalentsProvider'
    );
  });
});
