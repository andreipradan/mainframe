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
});
