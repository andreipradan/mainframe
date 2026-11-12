import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import EditModal from '../EditModal';

let mockState = {};
const mockDispatch = jest.fn();

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector) => selector(mockState),
}));
jest.mock('../../../api/expenses', () => ({
  ExpensesApi: class ExpensesApi {
    constructor(token) {
      this.token = token;
    }

    getItem = (id) => {
      return { type: 'expenses/getItem', id };
    };

    create = (data) => {
      return { type: 'expenses/create', data };
    };

    update = (id, data) => {
      return { type: 'expenses/update', id, data };
    };
  },
}));
jest.mock('react-bootstrap', () => {
  const React = require('react');
  const Form = ({ children, ...props }) =>
    React.createElement('form', props, children);
  Form.Group = ({ children, ...props }) =>
    React.createElement('div', props, children);
  Form.Label = ({ children }) => React.createElement('label', null, children);
  Form.Control = (props) => React.createElement('input', props);
  return { __esModule: true, default: Form };
});
jest.mock('react-bootstrap/Modal', () => {
  const React = require('react');
  const Modal = ({ children, show }) =>
    show ? React.createElement('div', null, children) : null;
  Modal.Header = ({ children }) => React.createElement('div', null, children);
  Modal.Title = ({ children }) => React.createElement('div', null, children);
  Modal.Body = ({ children }) => React.createElement('div', null, children);
  Modal.Footer = ({ children }) => React.createElement('div', null, children);
  return { __esModule: true, default: Modal };
});
jest.mock('react-bootstrap/Button', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children, ...props }) =>
      React.createElement('button', props, children),
  };
});
jest.mock('react-datepicker', () => {
  const React = require('react');
  return ({ selected, onChange, className, readOnly }) =>
    React.createElement('input', {
      className,
      readOnly,
      type: 'date',
      value: selected?.toISOString().slice(0, 10) || '',
      onChange: (event) => onChange(new Date(`${event.target.value}T00:00:00`)),
    });
});
jest.mock('react-select', () => ({
  __esModule: true,
  default: ({ options, value, onChange }) => (
    <div>
      <span>{value?.label}</span>
      <button type='button' onClick={() => onChange(options?.[1])}>
        Select alternate payer
      </button>
      <button type='button' onClick={() => onChange(null)}>
        Clear payer
      </button>
    </div>
  ),
}));
jest.mock('react-loader-spinner', () => ({
  ColorRing: () => <div>Loading</div>,
}));

const currentUser = {
  id: 1,
  username: 'Current',
  email: 'current@example.com',
};
const alternateUser = {
  id: 2,
  username: 'Alternate',
  email: 'alternate@example.com',
};

const makeState = (overrides = {}) => ({
  auth: { token: 'token', user: currentUser },
  expenses: {
    selectedItem: null,
    modalOpen: true,
    errors: null,
    users: [currentUser, alternateUser],
    loading: false,
    loadingItems: [],
    ...overrides,
  },
});

const renderModal = () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => root.render(<EditModal />));
  return {
    container,
    unmount: () => act(() => root.unmount()),
  };
};

const changeValue = (element, value) => {
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(element),
      'value'
    ).set;
    setter.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  });
};

beforeEach(() => {
  mockDispatch.mockReset();
});

describe('Expense edit modal', () => {
  test('creates an expense with edited fields and displays field errors', () => {
    const errors = ['Expense could not be saved'];
    errors.payer_id = ['Select a payer'];
    errors.date = ['Choose a date'];
    errors.description = ['Enter a description'];
    errors.amount = ['Enter an amount'];
    errors.currency = ['Enter a currency'];
    mockState = makeState({ errors });

    const { container, unmount } = renderModal();
    expect(container.textContent).toContain('Expense could not be saved');
    expect(container.textContent).toContain('Enter a currency');

    const textInputs = container.querySelectorAll('input[type="text"]');
    changeValue(textInputs[0], 'Utilities');
    changeValue(textInputs[1], '42.50');
    changeValue(textInputs[2], 'EUR');
    changeValue(container.querySelector('input[type="date"]'), '2025-03-05');

    act(() =>
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === 'Select alternate payer')
        .click()
    );
    act(() =>
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === 'Create expense')
        .click()
    );

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'expenses/create',
        data: {
          amount: '42.50',
          currency: 'EUR',
          date: '2025-03-05',
          description: 'Utilities',
          payer_id: 2,
        },
      })
    );
    unmount();
  });

  test('updates an expense, refreshes it, and falls back to the current payer', () => {
    const selectedItem = {
      id: 9,
      amount: '12',
      currency: 'RON',
      date: '2025-01-02',
      description: 'Lunch',
      payer: alternateUser,
    };
    mockState = makeState({
      selectedItem,
      modalOpen: false,
      errors: { detail: 'Load failed' },
    });

    const { container, unmount } = renderModal();
    expect(container.textContent).toContain('Edit expense?');
    expect(container.textContent).toContain('Load failed');
    changeValue(container.querySelector('input[type="text"]'), 'Dinner');

    act(() =>
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.querySelector('.mdi-refresh'))
        .click()
    );
    act(() =>
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === 'Update expense')
        .click()
    );

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'expenses/getItem',
      id: 9,
    });
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'expenses/update',
        id: 9,
        data: expect.objectContaining({ description: 'Dinner', payer_id: 2 }),
      })
    );

    act(() =>
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === 'Clear payer')
        .click()
    );
    unmount();
  });

  test('renders loading details and closes the modal', () => {
    mockState = makeState({
      selectedItem: { id: 9, payer: currentUser },
      modalOpen: false,
      loadingItems: [9],
    });
    const { container, unmount } = renderModal();

    expect(container.textContent).toContain('Loading');
    act(() =>
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === 'Close')
        .click()
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'expenses/selectItem' })
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'expenses/setModalOpen',
        payload: false,
      })
    );
    unmount();
  });
});
