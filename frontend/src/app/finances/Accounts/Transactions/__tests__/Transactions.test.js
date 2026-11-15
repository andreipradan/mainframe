import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import { Provider } from 'react-redux';

// Ensure modules the component uses don't perform network calls
jest.mock('../../../../../api/finance/accounts', () => ({
  AccountsApi: {
    getList: (...args) => ({ type: 'accounts/getList', args }),
    get: (...args) => ({ type: 'accounts/get', args }),
  },
}));
jest.mock('../../../../../api/finance', () => ({
  FinanceApi: {
    getExpenses: (...args) => ({ type: 'finance/getExpenses', args }),
  },
}));
jest.mock('../../../../../api/finance/transactions', () => ({
  TransactionsApi: class {
    constructor() {
      this.getList = (...args) => ({ type: 'transactions/getList', args });
      this.delete = (...args) => ({ type: 'transactions/delete', args });
    }

    static uploadTransactions(...args) {
      return {
        type: 'transactions/upload',
        args,
      };
    }
  },
}));
jest.mock('react-toastify', () => ({
  toast: { success: jest.fn(), warning: jest.fn(), error: jest.fn() },
}));

// Mock heavy UI and third-party components to keep render deterministic
jest.mock('src/app/shared/ListItem', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ label, value, children }) =>
      React.createElement('div', null, `${label}: ${value}`, children),
  };
});
jest.mock('src/app/shared/BottomPagination', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: () => React.createElement('div', null, 'pagination'),
  };
});
jest.mock('react-fast-marquee', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children }) => React.createElement('div', null, children),
  };
});
jest.mock('react-select', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: (props) =>
      React.createElement(
        'div',
        null,
        React.createElement(
          'button',
          {
            type: 'button',
            'data-testid': 'select-control',
            onClick: () => {
              props.onChange?.(
                props.isMulti ? props.options || [] : props.options?.[0] || null
              );
              props.onMenuClose?.();
            },
          },
          props.value
            ? String(
                Array.isArray(props.value)
                  ? props.value.map((value) => value.label).join(', ')
                  : props.value.label || props.value
              )
            : 'All'
        ),
        props.isClearable &&
          React.createElement(
            'button',
            {
              type: 'button',
              'data-testid': 'clear-select',
              onClick: () => props.onChange?.(null),
            },
            'Clear'
          )
      ),
  };
});
jest.mock('react-datepicker', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: (props) =>
      React.createElement('input', {
        type: 'text',
        value: props.selected ? props.selected.toString() : '',
        readOnly: true,
      }),
  };
});
jest.mock('react-chartjs-2', () => {
  const React = require('react');
  return {
    Bar: ({ getElementAtEvent, options }) => {
      const [tooltip, setTooltip] = React.useState('');
      const selectChartCategory = (datasetLabel) =>
        getElementAtEvent?.([
          {
            _model: {
              datasetLabel,
              label: 'January',
            },
          },
        ]);
      return React.createElement(
        'div',
        null,
        React.createElement(
          'button',
          {
            type: 'button',
            'data-testid': 'chart-select',
            onClick: () => selectChartCategory('Restaurants'),
          },
          'Select chart category'
        ),
        React.createElement(
          'button',
          {
            type: 'button',
            'data-testid': 'chart-select-unidentified',
            onClick: () => selectChartCategory('Unidentified'),
          },
          'Select unidentified chart category'
        ),
        React.createElement(
          'button',
          {
            type: 'button',
            'data-testid': 'chart-empty',
            onClick: () => getElementAtEvent?.([]),
          },
          'Select no chart category'
        ),
        React.createElement(
          'button',
          {
            type: 'button',
            'data-testid': 'chart-tooltip',
            onClick: () =>
              setTooltip(
                options.tooltips.callbacks.title([{ index: 0 }], {
                  datasets: [
                    { data: ['-5'] },
                    { data: ['10'] },
                    { data: ['0'] },
                  ],
                })
              ),
          },
          'Show chart tooltip'
        ),
        React.createElement(
          'span',
          { 'data-testid': 'chart-tooltip-result' },
          tooltip
        )
      );
    },
  };
});
jest.mock('react-loader-spinner', () => {
  const React = require('react');
  return { Circles: () => React.createElement('div', null) };
});
jest.mock('src/app/shared/Errors', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ errors }) =>
      React.createElement('div', null, errors ? String(errors) : null),
  };
});
jest.mock(
  'src/app/finances/Accounts/Transactions/components/AccountEditModal',
  () => {
    const React = require('react');
    return {
      __esModule: true,
      default: () => React.createElement('div', null),
    };
  }
);
jest.mock(
  'src/app/finances/Accounts/Transactions/components/TransactionEditModal',
  () => {
    const React = require('react');
    return {
      __esModule: true,
      default: () => React.createElement('div', null),
    };
  }
);
jest.mock(
  'src/app/finances/Accounts/Transactions/components/TransactionsBulkUpdateModal',
  () => {
    const React = require('react');
    return {
      __esModule: true,
      default: ({ specificCategoriesModalOpen }) =>
        specificCategoriesModalOpen
          ? React.createElement('div', null, 'Bulk category dialog')
          : null,
    };
  }
);
jest.mock('react-bootstrap', () => {
  const React = require('react');
  return {
    Collapse: ({ children }) => React.createElement('div', null, children),
    Dropdown: (() => {
      const Dropdown = (props) =>
        React.createElement('div', props, props.children);
      Dropdown.Toggle = ({ children, ...props }) =>
        React.createElement('a', props, children);
      Dropdown.Menu = ({ children }) =>
        React.createElement('div', null, children);
      Dropdown.Item = ({ children, active, ...props }) =>
        React.createElement(
          'div',
          { ...props, 'data-active': active },
          children
        );
      return Dropdown;
    })(),
    Button: ({ children, ...props }) =>
      React.createElement('button', props, children),
    // Provide Form component with expected subcomponents used in Transactions
    Form: (() => {
      const Form = ({ children, ...props }) =>
        React.createElement('form', props, children);
      Form.Group = ({ children, ...props }) =>
        React.createElement('div', props, children);
      Form.Label = ({ children, ...props }) =>
        React.createElement('label', props, children);
      Form.Control = (props) => React.createElement('input', props, null);
      Form.Check = (props) =>
        React.createElement('input', { type: 'checkbox', ...props }, null);
      return Form;
    })(),
  };
});
jest.mock('react-bootstrap/Button', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children, ...props }) =>
      React.createElement('button', props, children),
  };
});
jest.mock('react-bootstrap/Form', () => {
  const React = require('react');
  const Form = ({ children, ...props }) =>
    React.createElement('form', props, children);
  Form.Group = ({ children, ...props }) =>
    React.createElement('div', props, children);
  Form.Label = ({ children, ...props }) =>
    React.createElement('label', props, children);
  Form.Control = (props) => React.createElement('input', props, null);
  Form.Check = (props) =>
    React.createElement('input', { type: 'checkbox', ...props }, null);
  return { __esModule: true, default: Form };
});
jest.mock('react-bootstrap/Modal', () => {
  const React = require('react');
  const Modal = ({ children, show }) =>
    show ? React.createElement('div', { role: 'dialog' }, children) : null;
  Modal.Body = ({ children }) => React.createElement('div', null, children);
  Modal.Footer = ({ children }) => React.createElement('div', null, children);
  Modal.Header = ({ children }) => React.createElement('div', null, children);
  Modal.Title = ({ children }) => React.createElement('div', null, children);
  return {
    __esModule: true,
    default: Modal,
    Body: Modal.Body,
    Footer: Modal.Footer,
    Header: Modal.Header,
    Title: Modal.Title,
  };
});

// Note: we intentionally use the local Transactions above for deterministic testing
// Import the real Transactions component (mocks above will replace heavy deps)
const Transactions = require('../Transactions').default;
function renderWithState(initialState) {
  const div = document.createElement('div');
  document.body.appendChild(div);
  // Provide a minimal store to the Provider so selectors can read state
  const store = {
    getState: () => initialState,
    subscribe: () => () => {},
    dispatch: jest.fn(),
  };
  // Use React 18 createRoot to avoid ReactDOM.render deprecation warnings
  const rootInstance = createRoot(div);
  // Ensure render completes before returning (wrap in act for sync flush)
  act(() => {
    rootInstance.render(
      React.createElement(
        Provider,
        { store },
        React.createElement(Transactions, { initialState })
      )
    );
  });
  const root = {
    unmount: () => {
      act(() => rootInstance.unmount());
      div.remove();
    },
  };
  return {
    root,
    container: div,
    store,
    cleanup: () => root.unmount(),
  };
}

function makeState({ accounts = {}, transactions = {} } = {}) {
  const year = new Date().getFullYear();
  return {
    auth: { token: 'tok' },
    accounts: {
      selectedItem: {
        bank: 'TestBank',
        type: 'Checking',
        id: 1,
        number: '1234',
        first_name: 'Test',
        last_name: 'User',
        client_code: 'client',
      },
      results: [],
      analytics: null,
      loading: false,
      modalOpen: false,
      ...accounts,
    },
    transactions: {
      loading: false,
      results: [],
      kwargs: { year },
      errors: null,
      count: 0,
      categories: ['restaurants', 'utilities', 'Unidentified'],
      types: ['card', 'transfer'],
      confirmed_by_choices: [
        [1, 'Test User'],
        [2, 'Other User'],
      ],
      ...transactions,
    },
  };
}

describe('Transactions component (basic)', () => {
  test('shows account bank and type when selectedItem exists', () => {
    const initialState = {
      auth: { token: 'tok' },
      accounts: {
        selectedItem: { bank: 'TestBank', type: 'Checking', id: 1 },
        results: [],
        analytics: null,
        loading: false,
        modalOpen: false,
      },
      transactions: {
        loading: false,
        results: [],
        kwargs: {},
        errors: null,
        count: 0,
      },
    };
    const { root, container, store } = renderWithState(initialState);
    expect(container.textContent).toContain('TestBank (Checking)');
    const editButton = container.querySelector(
      'button[aria-label="Edit account"]'
    );
    const addButton = container.querySelector(
      'button[aria-label="Add account"]'
    );
    expect(editButton).not.toBeNull();
    expect(addButton).not.toBeNull();
    act(() => editButton.click());
    act(() => addButton.click());
    const modalActions = store.dispatch.mock.calls
      .slice(-2)
      .map(([action]) => action.payload);
    expect(modalActions).toEqual([true, 'new']);
    root.unmount();
  });

  test('renders without monthly analytics when there are no transactions', () => {
    const initialState = {
      auth: { token: 'tok' },
      accounts: {
        selectedItem: { bank: 'TestBank', type: 'Checking', id: 1 },
        results: [],
        analytics: { years: [] },
        loading: false,
        modalOpen: false,
      },
      transactions: {
        loading: false,
        results: [],
        kwargs: {},
        errors: null,
        count: 0,
      },
    };
    const { root, container } = renderWithState(initialState);
    expect(container.textContent).toContain('No transactions found');
    root.unmount();
  });

  test('renders latest transaction marquee when results present', () => {
    const tx = {
      id: 11,
      completed_at: '2025-01-02T12:00:00Z',
      started_at: '2025-01-01T09:00:00Z',
      amount: '10.00',
      fee: '0.00',
      state: 'done',
      description: 'Lunch at cafe',
      type: 'card',
      category: 'Unidentified',
      product: 'Food',
    };
    const initialState = {
      auth: { token: 'tok' },
      accounts: {
        selectedItem: { bank: 'TestBank', type: 'Checking', id: 1 },
        results: [],
        analytics: null,
        loading: false,
        modalOpen: false,
      },
      transactions: {
        loading: false,
        results: [tx],
        kwargs: {},
        errors: null,
        count: 1,
      },
    };
    const { root, container, store } = renderWithState(initialState);
    expect(container.textContent).toContain('Lunch at cafe');
    const editButton = container.querySelector(
      'button[aria-label="Edit transaction 11"]'
    );
    expect(editButton).not.toBeNull();
    act(() => editButton.click());
    expect(store.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'transactions/selectItem',
        payload: 11,
      })
    );
    root.unmount();
  });

  test('shows modal errors when deleting a transaction and errors exist', () => {
    const tx = {
      id: 22,
      created_at: '2025-01-01T00:00:00Z',
      started_at: '2025-01-01T09:00:00Z',
      completed_at: null,
      amount: '5.00',
      fee: '0.00',
      state: 'pending',
      description: 'Test delete',
      type: 'card',
      category: 'Unidentified',
      product: 'Misc',
    };
    const initialState = {
      auth: { token: 'tok' },
      accounts: {
        selectedItem: { bank: 'TestBank', type: 'Checking', id: 1 },
        results: [],
        analytics: null,
        loading: false,
        modalOpen: false,
      },
      transactions: {
        loading: false,
        results: [tx],
        kwargs: {},
        errors: ['Delete blocked'],
        count: 1,
      },
    };
    const { root, container } = renderWithState(initialState);
    const deleteButton = container.querySelector(
      'button[aria-label="Delete transaction 22"]'
    );
    expect(deleteButton).not.toBeNull();
    expect(deleteButton.type).toBe('button');
    act(() => deleteButton.click());
    expect(container.querySelector('[role="dialog"]').textContent).toContain(
      'Delete transaction?'
    );
    // Errors mock renders errors as text when provided
    expect(container.textContent).toContain('Delete blocked');
    root.unmount();
  });

  test('applies search, filters, and expense toggles', () => {
    const { root, container, store } = renderWithState(makeState());
    const searchToggle = container.querySelector(
      'button .mdi-magnify'
    ).parentElement;
    act(() => searchToggle.click());

    const searchInput = container.querySelector(
      'input[placeholder="Search transactions"]'
    );
    searchInput.value = 'coffee';
    act(() => Simulate.change(searchInput));
    act(() => Simulate.submit(searchInput.closest('form')));

    const selectControls = container.querySelectorAll(
      '[data-testid="select-control"]'
    );
    act(() => {
      selectControls[0].click();
      selectControls[1].click();
      selectControls[2].click();
    });
    const clearControls = container.querySelectorAll(
      '[data-testid="clear-select"]'
    );
    act(() => clearControls[0].click());

    const expensesCheckbox = Array.from(
      container.querySelectorAll('input[type="checkbox"]')
    ).find((checkbox) =>
      checkbox.parentElement.textContent.includes('Expenses only')
    );
    const uniqueCheckbox = Array.from(
      container.querySelectorAll('input[type="checkbox"]')
    ).find((checkbox) => checkbox.parentElement.textContent.includes('Unique'));
    act(() => expensesCheckbox.click());
    act(() => uniqueCheckbox.click());

    const payloads = store.dispatch.mock.calls
      .map(([action]) => action.payload)
      .filter(Boolean);
    expect(payloads).toEqual(
      expect.arrayContaining([
        { search_term: 'coffee', page: 1 },
        { confirmed_by: 1, page: 1 },
        { category: 'restaurants', page: 1 },
        { type: ['card', 'transfer'], page: 1 },
        { confirmed_by: '', page: 1 },
        { only_expenses: true, page: 1 },
        { unique: true, page: 1 },
      ])
    );
    root.unmount();
  });

  test('selects suggested categories, opens bulk update, and filters from the chart', () => {
    const year = new Date().getFullYear();
    const { root, container, store } = renderWithState(
      makeState({
        accounts: {
          analytics: {
            years: [year - 1, year, year + 1],
            categories: [
              'cash',
              'health',
              'restaurants',
              'savings',
              'shopping',
              'transport',
              'travel',
              'utilities',
              'Unidentified',
              'misc',
            ],
            per_month: [
              {
                month: 'January',
                cash: '0',
                health: '-1',
                restaurants: '-5',
                savings: '10',
                shopping: '0',
                transport: '0',
                travel: '0',
                utilities: '0',
                Unidentified: '0',
                misc: '0',
              },
            ],
          },
        },
        transactions: {
          results: [
            {
              id: 31,
              created_at: '2025-01-01T00:00:00Z',
              started_at: '2025-01-01T09:00:00Z',
              completed_at: '2025-01-01T09:30:00Z',
              amount: '-5.00',
              fee: '0.50',
              state: 'done',
              description: 'Coffee shop',
              type: 'card',
              category: 'Unidentified',
              category_suggestion: 'restaurants',
            },
            {
              id: 32,
              created_at: '2025-01-02T00:00:00Z',
              started_at: '2025-01-02T09:00:00Z',
              completed_at: null,
              amount: '-8.00',
              fee: '0.00',
              state: 'pending',
              description: 'Water bill',
              type: 'transfer',
              category: 'Unidentified',
              category_suggestion: 'utilities',
            },
          ],
          count: 2,
        },
      })
    );

    act(() => container.querySelector('#all-checkbox').click());
    expect(container.textContent).toContain('Update 2 categories');
    const bulkButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent.includes('Update 2 categories')
    );
    act(() => bulkButton.click());
    expect(container.textContent).toContain('Bulk category dialog');

    const chartButton = container.querySelector('[data-testid="chart-select"]');
    act(() => chartButton.click());
    expect(store.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'transactions/setKwargs',
        payload: {
          account_id: 1,
          category: 'restaurants',
          month: 1,
          only_expenses: true,
          page: 1,
          year,
        },
      })
    );
    act(() => container.querySelector('[data-testid="chart-tooltip"]').click());
    expect(
      container.querySelector('[data-testid="chart-tooltip-result"]')
        .textContent
    ).toBe('Total: 5.00\n(10.00-5.00)');
    const dispatchCount = store.dispatch.mock.calls.length;
    act(() => container.querySelector('[data-testid="chart-empty"]').click());
    expect(store.dispatch).toHaveBeenCalledTimes(dispatchCount);
    act(() =>
      container
        .querySelector('[data-testid="chart-select-unidentified"]')
        .click()
    );
    expect(store.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'transactions/setKwargs',
        payload: expect.objectContaining({ category: 'Unidentified' }),
      })
    );

    const previousYear =
      container.querySelector('.mdi-skip-previous').parentElement;
    act(() => previousYear.click());
    expect(store.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'transactions/setKwargs',
        payload: { account_id: 1, year: year - 1 },
      })
    );
    act(() => container.querySelector('.mdi-skip-next').parentElement.click());
    expect(store.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'transactions/setKwargs',
        payload: { account_id: 1, year },
      })
    );
    root.unmount();
  });

  test('changes accounts and refreshes account, expense, and transaction data', () => {
    const { root, container, store } = renderWithState(
      makeState({
        accounts: {
          results: [{ id: 2, bank: 'SecondBank', type: 'Savings' }],
        },
      })
    );
    const financeBreadcrumb = Array.from(container.querySelectorAll('a')).find(
      (link) => link.textContent === 'Finance'
    );
    act(() => financeBreadcrumb.click());
    act(() => container.querySelector('.preview-item').click());
    expect(store.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'accounts/selectItem',
        payload: 2,
      })
    );

    const refreshButtons = container.querySelectorAll('.mdi-refresh');
    act(() => refreshButtons[0].parentElement.click());
    act(() => refreshButtons[1].parentElement.click());
    act(() => refreshButtons[2].parentElement.click());
    expect(store.dispatch).toHaveBeenCalledWith({
      type: 'accounts/get',
      args: ['tok', 1],
    });
    expect(store.dispatch).toHaveBeenCalledWith({
      type: 'finance/getExpenses',
      args: ['tok', 1, new Date().getFullYear()],
    });
    expect(store.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'transactions/setKwargs',
        payload: { only_expenses: false, page: 1, unique: false },
      })
    );
    root.unmount();
  });

  test('adds, changes, and removes suggested transaction categories', () => {
    const { root, container } = renderWithState(
      makeState({
        transactions: {
          results: [
            {
              id: 51,
              started_at: '2025-01-01T09:00:00Z',
              amount: '-5.00',
              fee: '0',
              description: 'Coffee shop',
              type: 'card',
              category: 'Unidentified',
              category_suggestion: 'restaurants',
            },
            {
              id: 52,
              started_at: '2025-01-02T09:00:00Z',
              amount: '-8.00',
              fee: '0',
              description: 'Water bill',
              type: 'card',
              category: 'Unidentified',
              category_suggestion: 'utilities',
            },
            {
              id: 53,
              started_at: '2025-01-03T09:00:00Z',
              amount: '-2.00',
              fee: '0',
              description: 'Unknown',
              type: 'card',
              category: 'Unidentified',
            },
            {
              id: 54,
              started_at: '2025-01-04T09:00:00Z',
              amount: '-3.00',
              fee: '0',
              description: 'Already uncategorized',
              type: 'card',
              category: 'Unidentified',
              category_suggestion: 'Unidentified',
            },
          ],
          count: 4,
        },
      })
    );
    const rows = container.querySelectorAll('tbody tr');
    act(() => rows[0].click());
    expect(container.textContent).toContain('Update 1 categories');
    act(() => rows[1].click());
    expect(container.textContent).toContain('Update 2 categories');
    act(() => rows[2].click());
    expect(container.textContent).toContain('Update 2 categories');
    act(() => rows[3].click());
    expect(container.textContent).toContain('Update 2 categories');

    const categorySelects = container.querySelectorAll(
      '[data-testid="select-control"]'
    );
    act(() => categorySelects[0].click());
    act(() => rows[0].click());
    expect(container.textContent).toContain('Update 1 categories');
    const setAllLink = Array.from(container.querySelectorAll('a')).find(
      (link) => link.textContent.includes('to all')
    );
    act(() => setAllLink.click());
    root.unmount();
  });

  test('validates and uploads supported files', () => {
    const { root, container, store } = renderWithState(makeState());
    const uploadToggle =
      container.querySelector('button .mdi-upload').parentElement;
    act(() => uploadToggle.click());

    const fileInput = container.querySelector('#customFileLang');
    act(() =>
      Simulate.change(fileInput, {
        target: { files: [{ name: 'transactions.exe' }] },
      })
    );
    expect(container.textContent).toContain(
      'File extension must be one of: csv, xlsx!'
    );
    expect(container.querySelector('button[type="submit"]').disabled).toBe(
      true
    );

    const file = { name: 'transactions.csv' };
    act(() =>
      Simulate.change(fileInput, {
        target: { files: [file] },
      })
    );
    expect(container.textContent).toContain('transactions.csv');
    const uploadForm = fileInput.closest('form');
    act(() => Simulate.submit(uploadForm));

    const uploadAction = store.dispatch.mock.calls
      .map(([action]) => action)
      .find((action) => action.type === 'transactions/upload');
    expect(uploadAction.args[2]).toEqual({
      account_id: 1,
      year: new Date().getFullYear(),
    });
    expect(uploadAction.args[1].get('file')).toBe('[object Object]');
    root.unmount();
  });

  test('confirms transaction deletion and handles empty analytics interactions', () => {
    const transaction = {
      id: 44,
      created_at: '2025-01-01T00:00:00Z',
      started_at: '2025-01-01T09:00:00Z',
      completed_at: null,
      amount: '5.00',
      fee: '0.00',
      state: 'pending',
      description: 'Pending transaction',
      type: 'card',
      category: 'Unidentified',
    };
    const { root, container, store } = renderWithState(
      makeState({
        accounts: { analytics: { years: [] } },
        transactions: { results: [transaction], count: 1 },
      })
    );
    act(() =>
      container
        .querySelector('button[aria-label="Delete transaction 44"]')
        .click()
    );
    const deleteConfirmation = Array.from(
      container.querySelectorAll('button')
    ).find((button) => button.textContent.includes('Yes, delete!'));
    act(() => deleteConfirmation.click());
    expect(store.dispatch).toHaveBeenCalledWith({
      type: 'transactions/delete',
      args: [44],
    });
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    root.unmount();
  });
});
