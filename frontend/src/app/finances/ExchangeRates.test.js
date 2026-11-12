import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import ExchangeRates from './ExchangeRates';

let mockState;
const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector) => selector(mockState),
}));
jest.mock('../../api/exchange', () => ({
  __esModule: true,
  default: class ExchangeApiMock {
    constructor(token) {
      this.token = token;
    }

    getList(kwargs) {
      return { type: 'exchange/getList', payload: kwargs };
    }
  },
}));
jest.mock('./Accounts/Categorize/EditModal', () => ({ selectStyles: {} }));
jest.mock('../shared/BottomPagination', () => () => null);
jest.mock('../shared/Errors', () => () => null);
jest.mock('react-chartjs-2', () => ({
  Bar: (props) => {
    global.mockBarProps = props;
    return <div>Exchange chart</div>;
  },
}));
jest.mock('react-loader-spinner', () => ({
  Circles: () => <div>Loading exchange rates</div>,
}));
jest.mock('react-select', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ options = [], onChange, value }) =>
      React.createElement(
        'div',
        null,
        React.createElement(
          'button',
          {
            type: 'button',
            onClick: () => onChange(options[0] || null),
          },
          value?.label || options[0]?.label || 'Choose'
        ),
        React.createElement(
          'button',
          { type: 'button', onClick: () => onChange(null) },
          'Clear'
        )
      ),
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

const renderExchangeRates = () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => root.render(<ExchangeRates />));
  return {
    container,
    unmount: () => act(() => root.unmount()),
  };
};

describe('ExchangeRates', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    global.mockBarProps = null;
    mockState = {
      auth: { token: 'token' },
      exchange: {
        count: 2,
        errors: null,
        loading: false,
        kwargs: {},
        symbols: ['EURUSD', 'EURCAD'],
        sources: ['ECB', 'Bank'],
        results: [
          {
            id: 1,
            date: '2025-01-01',
            symbol: 'EURUSD',
            source: 'ECB',
            value: 1.1,
          },
          {
            id: 2,
            date: '2025-01-02',
            symbol: 'EURUSD',
            source: 'Bank',
            value: 1.2,
          },
        ],
      },
    };
  });

  test('renders rates, chart gradients, and currency/source filters', () => {
    const { container, unmount } = renderExchangeRates();
    expect(container.textContent).toContain('Exchange Rates');
    expect(container.textContent).toContain('Exchange chart');
    expect(container.textContent).toContain('1/1/2025');

    const gradient = {
      addColorStop: jest.fn(),
    };
    const context = {
      chart: { ctx: { createLinearGradient: jest.fn(() => gradient) } },
      height: 75,
    };
    expect(global.mockBarProps.data.datasets[0].backgroundColor(context)).toBe(
      gradient
    );
    expect(global.mockBarProps.data.datasets[0].borderColor(context)).toBe(
      gradient
    );
    expect(gradient.addColorStop).toHaveBeenCalled();

    const filterButtons = container.querySelectorAll('form button');
    act(() => filterButtons[0].click());
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'exchange/setKwargs' })
    );
    act(() => filterButtons[1].click());
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'exchange/setKwargs' })
    );

    act(() => container.querySelector('h3 button').click());
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'exchange/getList',
      payload: {},
    });
    unmount();
  });

  test('shows loading and empty results and submits filter changes', () => {
    mockState.exchange.loading = true;
    mockState.exchange.results = [];
    const loading = renderExchangeRates();
    expect(loading.container.textContent).toContain('Loading exchange rates');
    loading.unmount();

    mockState.exchange.loading = false;
    const empty = renderExchangeRates();
    expect(empty.container.textContent).toContain('No rates found');
    act(() =>
      empty.container
        .querySelector('form')
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'exchange/getList' })
    );
    empty.unmount();
  });
});
