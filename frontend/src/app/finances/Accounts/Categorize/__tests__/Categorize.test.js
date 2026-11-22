import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Categorize from '../Categorize';

// Mock APIs and heavy components
vi.mock('src/api/finance', () => ({
  PredictionApi: {
    getTasks: (token) => ({ type: 'prediction/getTasks', token }),
    getTask: (token, task) => ({ type: 'prediction/getTask', token, task }),
    predict: (token, descriptions, kwargs) => ({
      type: 'prediction/predict',
      token,
      descriptions,
      kwargs,
    }),
    train: (token) => ({ type: 'prediction/train', token }),
  },
}));
vi.mock('src/api/finance/transactions', () => ({
  TransactionsApi: class {
    getList = (kwargs) => ({ type: 'transactions/getList', kwargs });

    static bulkUpdateTransactions = (token, categories, kwargs) => ({
      type: 'transactions/bulkUpdate',
      token,
      categories,
      kwargs,
    });
  },
}));
vi.mock('react-select', () => {
  return {
    __esModule: true,
    default: ({ isMulti, onChange, onMenuClose, options, value }) =>
      React.createElement(
        'button',
        {
          type: 'button',
          'data-testid': 'select-control',
          onClick: () => {
            if (isMulti) {
              onChange?.(options || []);
              onMenuClose?.();
            } else {
              onChange?.(options?.[0] || null);
            }
          },
        },
        Array.isArray(value)
          ? value.map((item) => item.label).join(', ')
          : value?.label
      ),
  };
});
vi.mock('react-bootstrap', () => {
  const Collapse = ({ children, in: isOpen }) =>
    isOpen ? React.createElement('div', null, children) : null;
  const Form = ({ children, ...props }) =>
    React.createElement('form', props, children);
  Form.Group = ({ children, ...props }) =>
    React.createElement('div', props, children);
  Form.Label = ({ children, ...props }) =>
    React.createElement('label', props, children);
  Form.Control = (props) => React.createElement('input', props);
  return { Collapse, Form };
});
vi.mock('react-bootstrap/Modal', () => {
  const Modal = ({ children, show }) =>
    show ? React.createElement('div', null, children) : null;
  Modal.Header = ({ children }) => React.createElement('div', null, children);
  Modal.Title = ({ children }) => React.createElement('div', null, children);
  Modal.Body = ({ children }) => React.createElement('div', null, children);
  Modal.Footer = ({ children }) => React.createElement('div', null, children);
  return { __esModule: true, default: Modal };
});
vi.mock('react-bootstrap/Button', () => {
  return {
    __esModule: true,
    default: ({ children, ...props }) =>
      React.createElement('button', props, children),
  };
});
vi.mock('react-bootstrap/Alert', () => {
  return {
    default: ({ children, onClose }) =>
      React.createElement(
        'div',
        null,
        children,
        onClose &&
          React.createElement(
            'button',
            { type: 'button', onClick: onClose },
            'Dismiss'
          )
      ),
  };
});
vi.mock('react-loader-spinner', () => ({ Circles: () => null }));
vi.mock('../../../../shared/Errors', () => ({ default: () => null }));
vi.mock('../../../../shared/BottomPagination', () => ({ default: () => null }));
vi.mock('../EditModal', () => ({
  __esModule: true,
  default: () => null,
  getTypeLabel: (type) => type,
  selectStyles: {},
}));
vi.mock('react-toastify', () => ({
  toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
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
    const dispatchSpy = vi.spyOn(store, 'dispatch');
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

  it('updates selected categories, predicts, trains, and applies filters', async () => {
    const transactions = [
      {
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
      },
      {
        id: 32,
        account_name: 'Checking',
        started_at: '2025-01-03T09:00:00Z',
        amount: '-20.00',
        fee: '1.00',
        description: 'Utility payment',
        type: 'transfer',
        category: 'Unidentified',
        category_suggestion: null,
        state: 'pending',
      },
    ];
    const initialState = {
      auth: { token: 'auth-token' },
      transactions: {
        results: transactions,
        kwargs: {},
        loading: false,
        count: 2,
        unidentified_count: 2,
        categories: ['food', 'travel', 'Unidentified'],
        types: ['card', 'transfer'],
        accounts: [{ bank: 'Example Bank', type: 'checking', id: 7 }],
        confirmed_by_choices: [[1, 'Admin']],
        msg: { level: 'warning', message: 'Categories updated' },
      },
      categories: { results: [], loading: false, count: 0, page_size: 10 },
      prediction: {
        loading: false,
        errors: null,
        train: {
          status: 'complete',
          accuracy: '0.85',
          count: 2,
          error: 'Last warning',
          history: [
            {
              timestamp: '2025-01-03T10:00:00Z',
              status: 'complete',
              detail: 'trained',
            },
          ],
        },
        predict: {
          status: 'complete',
          operation: 'classifying',
          progress: 75,
          error: 'Partial result',
          history: [
            {
              timestamp: '2025-01-03T11:00:00Z',
              status: 'complete',
              detail: 'predicted',
            },
          ],
        },
      },
    };
    const store = configureStore({ reducer: (state = initialState) => state });
    const dispatchSpy = vi.spyOn(store, 'dispatch');
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

    expect(div.textContent).toContain('Categories updated');
    act(() =>
      Array.from(div.querySelectorAll('button'))
        .find((button) => button.textContent.trim() === 'Dismiss')
        .click()
    );
    expect(div.textContent).not.toContain('Categories updated');
    const tasksToggle = Array.from(div.querySelectorAll('button')).find(
      (button) => button.textContent.trim() === 'Tasks'
    );
    act(() => tasksToggle.click());
    expect(div.textContent).toContain('Training objects count: 2');
    expect(div.textContent).toContain('Progress 75%');
    const taskHistoryToggles = Array.from(
      div.querySelectorAll('button')
    ).filter((button) => button.textContent.includes('History'));
    taskHistoryToggles.forEach((button) => act(() => button.click()));
    expect(div.textContent).toContain('detail: trained');
    expect(div.textContent).toContain('detail: predicted');
    div.querySelectorAll('.mdi-refresh').forEach((icon) => {
      act(() => icon.closest('button').click());
    });

    const coffeeRow = Array.from(div.querySelectorAll('tbody tr')).find((row) =>
      row.textContent.includes('Coffee shop')
    );
    act(() => coffeeRow.click());
    expect(div.textContent).toContain('Update 1 categories');
    act(() =>
      Array.from(div.querySelectorAll('button'))
        .find((button) => button.textContent.trim() === 'Update 1 categories')
        .click()
    );
    expect(div.textContent).toContain('Update multiple categories?');
    act(() =>
      Array.from(div.querySelectorAll('button'))
        .find((button) => button.textContent.trim() === 'Yes, bulk update!')
        .click()
    );
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'transactions/bulkUpdate',
        token: 'auth-token',
        categories: [{ description: 'Coffee shop', category: 'food' }],
      })
    );

    act(() =>
      Array.from(div.querySelectorAll('button'))
        .find((button) => button.textContent.trim() === 'Predict 1')
        .click()
    );
    act(() =>
      Array.from(div.querySelectorAll('button'))
        .find((button) => button.textContent.trim() === 'Yes, start!')
        .click()
    );
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'prediction/predict',
        token: 'auth-token',
        descriptions: ['Coffee shop'],
      })
    );

    const filterSelects = div.querySelectorAll(
      '[data-testid="select-control"]'
    );
    for (const select of Array.from(filterSelects).slice(-4)) {
      act(() => select.click());
    }
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'transactions/setKwargs',
        payload: { account_id: 7, page: 1 },
      })
    );
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'transactions/setKwargs',
        payload: { category: 'food', page: 1 },
      })
    );
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'transactions/setKwargs',
        payload: { type: ['card', 'transfer'], page: 1 },
      })
    );

    const categoryToggles = div.querySelectorAll('input.checkbox');
    act(() =>
      Simulate.change(categoryToggles[0], {
        target: { checked: true },
      })
    );
    act(() =>
      Simulate.change(categoryToggles[1], {
        target: { checked: true },
      })
    );
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'transactions/setKwargs',
        payload: { only_expenses: true },
      })
    );
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'transactions/setKwargs',
        payload: { unique: true },
      })
    );
    act(() => div.querySelector('.mdi-refresh').closest('button').click());
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'prediction/getTasks' })
    );

    act(() =>
      Array.from(div.querySelectorAll('button'))
        .find((button) => button.textContent.trim() === 'Train model')
        .click()
    );
    act(() =>
      Array.from(div.querySelectorAll('button'))
        .find((button) => button.textContent.trim() === 'Yes, train model!')
        .click()
    );
    expect(dispatchSpy).toHaveBeenCalledWith({
      type: 'prediction/train',
      token: 'auth-token',
    });

    act(() =>
      Array.from(div.querySelectorAll('button'))
        .find((button) => button.textContent.trim() === 'Predict latest 1')
        .click()
    );
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'prediction/predict',
        token: 'auth-token',
        descriptions: ['Utility payment'],
      })
    );

    act(() => div.querySelector('.mdi-magnify').closest('button').click());
    const search = div.querySelector(
      'input[placeholder="Search transactions"]'
    );
    act(() => Simulate.change(search, { target: { value: 'coffee' } }));
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'transactions/setKwargs',
        payload: { search_term: 'coffee' },
      })
    );
    act(() => Simulate.submit(search.closest('form')));
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'transactions/setKwargs',
        payload: { page: 1 },
      })
    );

    act(() => coffeeRow.click());
    act(() => coffeeRow.click());
    const setCategoryForAll = Array.from(div.querySelectorAll('a')).find(
      (link) => link.textContent.includes('Set Food to all')
    );
    act(() => setCategoryForAll.click());
    expect(div.textContent).toContain('Update 2 categories');
    act(() =>
      Array.from(div.querySelectorAll('button'))
        .find((button) => button.textContent.trim() === 'Update 2 categories')
        .click()
    );
    act(() =>
      Array.from(div.querySelectorAll('button'))
        .find((button) => button.textContent.trim() === 'No, go back')
        .click()
    );

    const selectAll = div.querySelector('input.form-check-input');
    act(() => Simulate.change(selectAll, { target: { checked: true } }));
    expect(div.textContent).toContain('Update 1 categories');
    act(() => Simulate.change(selectAll, { target: { checked: false } }));

    await act(async () => {
      root.unmount();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  });
});
