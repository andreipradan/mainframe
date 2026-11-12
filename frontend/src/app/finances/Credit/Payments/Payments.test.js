import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Payments from './Payments';

let mockState;
const mockDispatch = jest.fn();
const mockHistory = { push: jest.fn() };
jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector) => selector(mockState),
}));
jest.mock('react-router-dom', () => ({
  useHistory: () => mockHistory,
}));
jest.mock('../../../../api/finance/payments', () => ({
  PaymentsApi: class PaymentsApiMock {
    getList() {
      return { type: 'payments/getList' };
    }

    upload(payload) {
      return { type: 'payments/upload', payload };
    }

    update(id, data) {
      return { type: 'payments/update', payload: { id, data } };
    }
  },
}));
jest.mock('../../../shared/BottomPagination', () => () => null);
jest.mock('../../../shared/Errors', () => ({ errors }) => (
  <div>{errors?.[0] || errors?.detail || null}</div>
));
jest.mock('react-loader-spinner', () => ({
  Circles: () => <div>Loading payments</div>,
  ColorRing: () => <div>Loading payment</div>,
}));
jest.mock('react-bootstrap', () => ({
  Collapse: ({ children }) => <>{children}</>,
}));
jest.mock('react-bootstrap/Form', () => {
  const React = require('react');
  const Form = ({ children, ...props }) =>
    React.createElement('form', props, children);
  Form.Group = ({ children, ...props }) =>
    React.createElement('div', props, children);
  Form.Label = ({ children, ...props }) =>
    React.createElement('label', props, children);
  Form.Control = (props) => React.createElement('input', props);
  return { __esModule: true, default: Form };
});
jest.mock('react-bootstrap/Button', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children, ...props }) =>
      React.createElement('button', props, children),
  };
});
jest.mock('react-bootstrap/Modal', () => {
  const React = require('react');
  const Modal = ({ children, show }) =>
    show ? React.createElement('div', null, children) : null;
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

const renderPayments = () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => root.render(<Payments />));
  return {
    container,
    unmount: () => act(() => root.unmount()),
  };
};

const setFile = (input, file) => {
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: [file],
  });
  act(() => input.dispatchEvent(new Event('change', { bubbles: true })));
};

describe('Payments', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    mockHistory.push.mockClear();
    mockState = {
      auth: { token: 'token' },
      payment: {
        count: 2,
        errors: null,
        loading: false,
        loadingItems: [],
        results: [
          {
            id: 1,
            date: '2025-01-01',
            total: '100',
            is_prepayment: true,
            principal: '80',
            interest: '20',
            remaining: '900',
            saved: '5',
          },
          {
            id: 2,
            date: '2025-02-01',
            total: '100',
            is_prepayment: false,
            principal: '90',
            interest: '10',
            remaining: '810',
            saved: '0',
          },
        ],
        selectedItem: null,
        kwargs: {},
      },
    };
  });

  test('renders payments, navigates to credit, and refreshes the list', () => {
    const { container, unmount } = renderPayments();
    expect(container.textContent).toContain('2025-01-01');

    act(() =>
      Array.from(container.querySelectorAll('a'))
        .find((anchor) => anchor.textContent === 'Credit')
        .click()
    );
    expect(mockHistory.push).toHaveBeenCalledWith('/finances/credit/details');

    act(() => Array.from(container.querySelectorAll('h3 button'))[0].click());
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'payments/getList' });
    act(() => container.querySelector('tbody tr').click());
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'payment/selectItem',
      payload: 1,
    });
    unmount();
  });

  test('validates and uploads a PDF and handles selected-payment actions', () => {
    const { container, unmount } = renderPayments();
    const fileInput = container.querySelector('input[type="file"]');
    setFile(fileInput, { name: 'statement.txt' });
    expect(container.textContent).toContain('File must be pdf!');
    setFile(fileInput, { name: 'statement.pdf' });
    expect(container.textContent).toContain('statement.pdf');
    act(() =>
      container
        .querySelector('form')
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'payments/upload' })
    );
    unmount();

    mockState.payment.selectedItem = {
      id: 7,
      date: '2025-03-01',
      is_prepayment: false,
      saved: '12',
    };
    mockState.payment.loadingItems = [7];
    const loading = renderPayments();
    expect(loading.container.textContent).toContain('Loading payment');
    loading.unmount();

    mockState.payment.loadingItems = [];
    const selected = renderPayments();
    expect(selected.container.textContent).toContain('Installment');
    expect(selected.container.querySelector('input[type="text"]').value).toBe(
      '12'
    );
    act(() =>
      Array.from(selected.container.querySelectorAll('button'))
        .find((button) => button.textContent === 'Save Changes')
        .click()
    );
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'payments/update',
      payload: { id: 7, data: { saved: '12' } },
    });
    selected.unmount();
  });
});
