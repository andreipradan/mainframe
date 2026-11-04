import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Categorize from '../Categorize';

// Mock APIs and heavy components
jest.mock('src/api/finance', () => ({
  PredictionApi: {
    getTasks: () => jest.fn(),
    getTask: () => jest.fn(),
    predict: () => jest.fn(),
    train: () => jest.fn(),
  },
}));
jest.mock('src/api/finance/transactions', () => ({
  TransactionsApi: class {
    getList = () => jest.fn();
    bulkUpdateTransactions = () => jest.fn();
  },
}));
jest.mock('react-toastify', () => ({
  toast: { success: jest.fn(), warning: jest.fn(), error: jest.fn() },
}));

describe('Categorize component', () => {
  it('renders without crashing', async () => {
    const initialState = {
      auth: { token: null },
      transactions: {
        results: [],
        kwargs: {},
        loading: false,
        count: 0,
        unidentified_count: 0,
        categories: [],
        confirmed_by_choices: [],
      },
      categories: { results: [], loading: false, count: 0, page_size: 10 },
      prediction: { loading: false },
    };
    const store = configureStore({ reducer: (s = initialState) => s });

    const div = document.createElement('div');
    const root = createRoot(div);
    await act(async () => {
      root.render(
        <Provider store={store}>
          <Categorize />
        </Provider>
      );
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(div.innerHTML).toContain('Categorize');

    await act(async () => {
      root.unmount();
      await new Promise((r) => setTimeout(r, 0));
    });
  });

  it('uses the accessible transaction edit button without changing the category', async () => {
    const transaction = {
      id: 31,
      account_name: 'Checking',
      started_at: '2025-01-02T09:00:00Z',
      amount: '10.00',
      fee: '0.00',
      description: 'Coffee shop',
      type: 'card',
      category: 'Unidentified',
      category_suggestion: 'food',
      completed_at: '2025-01-02T09:05:00Z',
    };
    const initialState = {
      auth: { token: null },
      transactions: {
        results: [transaction],
        kwargs: {},
        loading: false,
        count: 1,
        unidentified_count: 1,
        categories: [],
        confirmed_by_choices: [],
      },
      categories: { results: [], loading: false, count: 0, page_size: 10 },
      prediction: { loading: false },
    };
    const store = configureStore({ reducer: (state = initialState) => state });
    const dispatchSpy = jest.spyOn(store, 'dispatch');
    const div = document.createElement('div');
    const root = createRoot(div);

    await act(async () => {
      root.render(
        <Provider store={store}>
          <Categorize />
        </Provider>
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const editButton = div.querySelector(
      'button[aria-label="Edit transaction 31"]'
    );
    expect(editButton).not.toBeNull();
    act(() => editButton.click());
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'transactions/selectItem',
        payload: 31,
      })
    );

    await act(async () => {
      root.unmount();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  });
});
