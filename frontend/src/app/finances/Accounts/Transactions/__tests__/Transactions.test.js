import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';

// Ensure modules the component uses don't perform network calls
jest.mock('../../../../../api/finance/accounts', () => ({
  AccountsApi: { getList: jest.fn() },
}));
jest.mock('../../../../../api/finance', () => ({
  FinanceApi: { getExpenses: jest.fn() },
}));
jest.mock('../../../../../api/finance/transactions', () => ({
  TransactionsApi: jest.fn().mockImplementation(() => ({
    getList: jest.fn(),
    delete: jest.fn(),
    uploadTransactions: jest.fn(),
  })),
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
        'select',
        null,
        props.value ? String(props.value.label || props.value) : null
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
      }),
  };
});
jest.mock('react-chartjs-2', () => {
  const React = require('react');
  return { Bar: () => React.createElement('div', null) };
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
      default: () => React.createElement('div', null),
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
      Dropdown.Item = ({ children, ...props }) =>
        React.createElement('div', props, children);
      return Dropdown;
    })(),
    Button: ({ children, ...props }) =>
      React.createElement('button', props, children),
    // Provide Form component with expected subcomponents used in Transactions
    Form: (() => {
      const Form = ({ children }) =>
        React.createElement('form', null, children);
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
  const Form = ({ children }) => React.createElement('form', null, children);
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
  const Modal = ({ children }) => React.createElement('div', null, children);
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
    dispatch: () => {},
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
    cleanup: () => root.unmount(),
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
    const { root, container } = renderWithState(initialState);
    expect(container.textContent).toContain('TestBank (Checking)');
    root.unmount();
  });

  test('shows "No transactions found" when there are no results', () => {
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
    const { root, container } = renderWithState(initialState);
    expect(container.textContent).toContain('Lunch at cafe');
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
    // click the trash icon to open the delete modal
    const trash = container.querySelector('.mdi-trash-can-outline');
    expect(trash).toBeTruthy();
    act(() => {
      trash.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    // Errors mock renders errors as text when provided
    expect(container.textContent).toContain('Delete blocked');
    root.unmount();
  });
});
