import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import EditModal, { getTypeLabel } from '../EditModal';

let mockState = {};
const mockDispatch = jest.fn();

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector) => selector(mockState),
}));
jest.mock('src/api/finance/categories', () => ({
  CategoriesApi: {
    getList: (token) => ({ type: 'categories/getList', token }),
  },
}));
jest.mock('src/api/finance/transactions', () => ({
  TransactionsApi: {
    update: (token, id, data) => ({
      type: 'transactions/update',
      token,
      id,
      data,
    }),
    updateAll: (token, data, kwargs) => ({
      type: 'transactions/updateAll',
      token,
      data,
      kwargs,
    }),
  },
}));
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
  Form.Group = ({ children }) => React.createElement('div', null, children);
  Form.Label = ({ children }) => React.createElement('label', null, children);
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
jest.mock('react-select/creatable', () => ({
  __esModule: true,
  default: ({ options, onChange, onCreateOption, styles, value }) => {
    const backgrounds = [
      styles.option({}, { isSelected: true, isFocused: false }).backgroundColor,
      styles.option({}, { isSelected: false, isFocused: true }).backgroundColor,
      styles.option({}, { isSelected: false, isFocused: false })
        .backgroundColor,
    ];
    return (
      <div>
        <span>{value?.label}</span>
        <span>{backgrounds.join(',')}</span>
        <button type='button' onClick={() => onChange(options?.[0])}>
          Select category
        </button>
        <button type='button' onClick={() => onChange(null)}>
          Clear category
        </button>
        <button type='button' onClick={() => onCreateOption('new-category')}>
          Create category
        </button>
      </div>
    );
  },
}));
jest.mock('react-ace', () => ({
  __esModule: true,
  default: ({ value }) => <textarea readOnly value={value} />,
}));
jest.mock('../../../../shared/Errors', () => () => null);

const transaction = {
  id: 31,
  description: 'Coffee shop',
  amount: '10.00',
  currency: 'RON',
  fee: '1.00',
  type: 'card_payment',
  product: 'Debit',
  started_at: '2025-01-02T09:00:00Z',
  completed_at: '2025-01-02T09:05:00Z',
  state: 'COMPLETED',
  confirmed_by: 1,
  category: 'food',
  category_suggestion: 'groceries',
  additional_data: { merchant: 'Cafe' },
};

const makeState = (selectedItem = transaction, overrides = {}) => ({
  auth: { token: 'token' },
  categories: { results: [{ id: 'travel' }], loading: false },
  transactions: {
    kwargs: { account: 'checking' },
    selectedItem,
    confirmedByChoices: [
      [1, 'Automatically'],
      [2, 'Manually'],
    ],
    errors: null,
    loading: false,
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

beforeEach(() => {
  mockDispatch.mockReset();
});

describe('Transaction edit modal', () => {
  test('renders transaction metadata and saves a changed category', () => {
    mockState = makeState();
    const { container, unmount } = renderModal();

    expect(container.textContent).toContain('Transaction details');
    expect(container.textContent).toContain('Fee: 1.00');
    expect(container.textContent).toContain('Automatically');
    expect(container.textContent).toContain('#2f84d3,#829fbb,#212529');
    expect(getTypeLabel('ATM')).toBe('ATM');
    expect(getTypeLabel('')).toBe('');
    expect(getTypeLabel('card_payment')).toBe('Card payment');

    act(() =>
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === 'Select category')
        .click()
    );
    act(() =>
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === 'Save Changes')
        .click()
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'transactions/update',
        token: 'token',
        id: 31,
        data: { category: 'travel' },
      })
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'transactions/selectItem' })
    );
    unmount();
  });

  test('creates a category, submits the form, and confirms a bulk update', () => {
    mockState = makeState({
      ...transaction,
      state: 'PENDING',
      confirmed_by: 2,
      fee: '0',
      additional_data: null,
      category: 'food',
    });
    const { container, unmount } = renderModal();

    expect(container.textContent).toContain('Manually');
    expect(container.textContent).toMatch(/State:\s*PENDING/);

    act(() =>
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === 'Create category')
        .click()
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'transactions/update',
        data: { category: 'new-category' },
      })
    );
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'categories/create',
      payload: { id: 'new-category', value: 'New category' },
    });

    const form = container.querySelector('form');
    act(() =>
      form.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true })
      )
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'transactions/update',
        data: { type: 'card_payment', category: 'new-category' },
      })
    );

    act(() =>
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === 'Select category')
        .click()
    );
    act(() =>
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === 'Save all')
        .click()
    );
    act(() =>
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === 'No, go back')
        .click()
    );
    act(() =>
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === 'Save all')
        .click()
    );
    act(() =>
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === 'Yes, update ALL!')
        .click()
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'transactions/updateAll',
        data: { category: 'travel', description: 'Coffee shop' },
        kwargs: { account: 'checking' },
      })
    );
    unmount();
  });

  test('loads categories and renders no modal without a selected transaction', () => {
    mockState = {
      ...makeState(null),
      categories: { results: null, loading: true },
    };
    const { container, unmount } = renderModal();
    expect(container.textContent).toBe('');
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'categories/getList',
      token: 'token',
    });
    unmount();
  });
});
