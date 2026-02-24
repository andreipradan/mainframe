import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Categorize from '../Categorize';

// Mock APIs and heavy components
jest.mock('src/api/finance', () => ({
  PredictionApi: {
    getTasks: (token) => (dispatch) => {},
    getTask: (token, type, flag) => (dispatch) => {},
    predict: (token, args) => (dispatch) => {},
    train: (token, args) => (dispatch) => {},
  },
}));
jest.mock('src/api/finance/transactions', () => ({
  TransactionsApi: function() {
    return {
      // Return functions that themselves return thunks so dispatch receives a
      // callable (redux-thunk) instead of `undefined`.
      getList: (kwargs) => (dispatch) => {},
      bulkUpdateTransactions: (token, data, kwargs) => (dispatch) => {},
    };
  },
}));

describe('Categorize component', () => {
  it('renders without crashing', async () => {
    const initialState = {
      auth: { token: null },
      transactions: { results: [], kwargs: {}, loading: false, count: 0, unidentified_count: 0, categories: [], confirmed_by_choices: [] },
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
      await new Promise(r => setTimeout(r, 0));
    });

    expect(div.innerHTML).toContain('Categorize');

    await act(async () => {
      root.unmount();
      await new Promise(r => setTimeout(r, 0));
    });
  });
});
