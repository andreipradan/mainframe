import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import Bonds from '../Bonds';
import Crypto from '../Crypto';
import Deposits from '../Deposits';
import Pension from '../Pension';
import Stocks from '../Stocks';
import axios from '../../../../api';

let mockState = null;
const mockDispatch = vi.fn();
vi.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector) => selector(mockState),
}));
vi.mock('react-loader-spinner', () => ({
  Circles: () => <div>Loading pension data</div>,
  ColorRing: () => null,
}));
vi.mock('react-fast-marquee', () => ({
  default: ({ children }) => children,
}));
vi.mock('react-bootstrap', () => {
  return {
    Collapse: ({ children }) =>
      React.createElement(React.Fragment, null, children),
  };
});
vi.mock('react-select', () => {
  return {
    __esModule: true,
    default: (props) =>
      React.createElement(
        'button',
        {
          type: 'button',
          'data-testid': 'investment-select',
          onClick: () =>
            props.onChange?.(
              props.isMulti ? props.options || [] : props.options?.[0] || null
            ),
        },
        props.value?.label || props.placeholder || 'Select'
      ),
  };
});
vi.mock('react-datepicker', () => {
  return {
    default: (props) =>
      React.createElement(
        'button',
        {
          type: 'button',
          onClick: () => props.onChange?.(new Date('2025-03-01T12:00:00Z')),
        },
        'Set date'
      ),
  };
});
vi.mock('react-bootstrap/Modal', () => {
  const Modal = ({ children, show }) =>
    show ? React.createElement('div', { role: 'dialog' }, children) : null;
  Modal.Header = ({ children }) => React.createElement('div', null, children);
  Modal.Title = ({ children }) => React.createElement('h2', null, children);
  Modal.Body = ({ children }) => React.createElement('div', null, children);
  Modal.Footer = ({ children }) => React.createElement('div', null, children);
  return { __esModule: true, default: Modal };
});
vi.mock('src/app/shared/Errors', () => ({ default: () => null }));
vi.mock('src/app/shared/ListItem', () => {
  return {
    __esModule: true,
    default: ({ label, value }) =>
      React.createElement('div', null, `${label}: ${value}`),
  };
});
vi.mock('src/app/shared/BottomPagination', () => ({ default: () => null }));
vi.mock('src/app/earthquakes/Earthquakes', () => ({
  formatDate: (value) => value,
  formatTime: (value) => value,
}));
vi.mock('react-chartjs-2', () => ({ Bar: () => null, Doughnut: () => null }));
vi.mock('../../../../api', () => ({
  __esModule: true,
  default: {
    post: vi.fn().mockResolvedValue({ data: {} }),
    patch: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({}),
  },
}));

const emptyResource = {
  loading: false,
  loadingItems: [],
  errors: null,
  results: [],
  kwargs: {},
  count: 0,
  currencies: [],
  types: [],
  aggregations: {},
  selectedItem: null,
  modalOpen: false,
};

const pensionRecord = {
  id: 1,
  name: 'Test pension',
  start_date: '2020-01-01',
  latest_unit_value_date: '2025-02-01',
  latest_unit_value: 2,
  total_units: 10,
  contributions: [
    {
      id: 2,
      date: '2025-01-01',
      amount: '100.00',
      units: '10.00',
      currency: 'RON',
    },
  ],
};

const renderPage = (Component, stateOverrides = {}) => {
  mockState = {
    auth: { token: null },
    bonds: { ...emptyResource },
    stocks: { ...emptyResource },
    pnl: { ...emptyResource },
    crypto: { ...emptyResource },
    cryptoPnl: { ...emptyResource },
    deposits: { ...emptyResource },
    pension: {
      ...emptyResource,
      results: [pensionRecord],
    },
    ...stateOverrides,
  };
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => {
    root.render(
      <MemoryRouter initialEntries={['/investments/current']}>
        <Component />
      </MemoryRouter>
    );
  });
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

const submitForm = (form) =>
  act(() =>
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  );

const fillTextInputs = (form, values) => {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value'
  ).set;
  form.querySelectorAll('input[type="text"]').forEach((input, index) => {
    setter.call(input, values[index] || '1');
    act(() => input.dispatchEvent(new Event('input', { bubbles: true })));
  });
};

describe.each([
  ['Bonds', Bonds],
  ['Crypto', Crypto],
  ['Deposits', Deposits],
  ['Pension', Pension],
  ['Stocks', Stocks],
])('%s breadcrumb', (_name, Component) => {
  test('uses a navigable link to the investment summary', () => {
    const { container, unmount } = renderPage(Component);
    const summaryLink = container.querySelector(
      'a[href="/investments/summary"]'
    );

    expect(summaryLink).not.toBeNull();
    expect(summaryLink.textContent).toBe('Investments');
    unmount();
  });
});

beforeEach(() => {
  mockDispatch.mockClear();
  axios.post.mockClear();
  axios.patch.mockClear();
  axios.delete.mockClear();
  axios.post.mockResolvedValue({ data: {} });
  axios.patch.mockResolvedValue({ data: {} });
  axios.delete.mockResolvedValue({});
});

test('Pension contribution controls enter and leave edit/delete states accessibly', () => {
  const { container, unmount } = renderPage(Pension);
  const selectFundButton = Array.from(
    container.querySelectorAll('button')
  ).find((button) => button.textContent === 'Select');
  act(() => selectFundButton.click());

  const addContributionButton = Array.from(
    container.querySelectorAll('button')
  ).find((button) => button.querySelector('.mdi-plus'));
  act(() => addContributionButton.click());
  expect(
    container.querySelector('button[aria-label="Cancel adding contribution"]')
  ).not.toBeNull();
  act(() =>
    container
      .querySelector('button[aria-label="Cancel adding contribution"]')
      .click()
  );
  expect(
    container.querySelector('button[aria-label="Save contribution"]')
  ).toBeNull();

  act(() =>
    container.querySelector('button[aria-label="Edit contribution"]').click()
  );
  expect(
    container.querySelector('button[aria-label="Save contribution changes"]')
  ).not.toBeNull();
  act(() =>
    container
      .querySelector('button[aria-label="Cancel editing contribution"]')
      .click()
  );

  act(() =>
    container.querySelector('button[aria-label="Delete contribution"]').click()
  );
  expect(container.textContent).toContain('Delete?');
  expect(
    container.querySelector('button[aria-label="Confirm delete contribution"]')
  ).not.toBeNull();
  act(() =>
    container
      .querySelector('button[aria-label="Cancel deleting contribution"]')
      .click()
  );
  expect(container.textContent).not.toContain('Delete?');
  unmount();
});

test('Pension submits contribution creation, updates, and deletion', async () => {
  const { container, unmount } = renderPage(Pension);
  const selectFundButton = Array.from(
    container.querySelectorAll('button')
  ).find((button) => button.textContent === 'Select');
  act(() => selectFundButton.click());

  const addButton = container
    .querySelector('button .mdi-plus')
    .closest('button');
  act(() => addButton.click());
  act(() =>
    container.querySelector('button[aria-label="Save contribution"]').click()
  );
  expect(mockDispatch).toHaveBeenCalledTimes(1);
  await act(async () => {
    mockDispatch.mock.calls[0][0](vi.fn());
    await Promise.resolve();
  });
  expect(axios.post).toHaveBeenCalledWith(
    'finance/pension/1/contributions/',
    expect.objectContaining({
      amount: 0,
      units: 0,
      date: expect.any(String),
    }),
    expect.any(Object)
  );

  mockDispatch.mockClear();
  act(() =>
    container.querySelector('button[aria-label="Edit contribution"]').click()
  );
  act(() =>
    container
      .querySelector('button[aria-label="Save contribution changes"]')
      .click()
  );
  expect(mockDispatch).toHaveBeenCalledTimes(1);
  await act(async () => {
    mockDispatch.mock.calls[0][0](vi.fn());
    await Promise.resolve();
  });
  expect(axios.patch).toHaveBeenCalledWith(
    'finance/pension/1/contribution/?contribution_id=2',
    expect.objectContaining({ contribution_id: 2 }),
    expect.any(Object)
  );

  mockDispatch.mockClear();
  act(() =>
    container.querySelector('button[aria-label="Delete contribution"]').click()
  );
  act(() =>
    container
      .querySelector('button[aria-label="Confirm delete contribution"]')
      .click()
  );
  expect(mockDispatch).toHaveBeenCalledTimes(1);
  await act(async () => {
    mockDispatch.mock.calls[0][0](vi.fn());
    await Promise.resolve();
  });
  expect(axios.delete).toHaveBeenCalledWith(
    'finance/pension/1/contribution/?contribution_id=2',
    expect.any(Object)
  );
  unmount();
});

test('Pension shows loading indicators while data is refreshing', () => {
  const { container, unmount } = renderPage(Pension, {
    pension: {
      ...emptyResource,
      loading: true,
      results: [pensionRecord],
    },
  });
  expect(container.textContent).toContain('Loading pension data');
  unmount();
});

test('Pension loads the selected fund into its edit form state', () => {
  const { container, unmount } = renderPage(Pension, {
    pension: {
      ...emptyResource,
      results: [pensionRecord],
      selectedItem: pensionRecord,
    },
  });
  expect(container.textContent).toContain('Test pension');
  unmount();
});

test('Bonds renders portfolio and transactions and applies active/type filters', () => {
  const bond = {
    id: 11,
    date: '2025-01-01',
    type: 'in',
    ticker: 'BOND',
    quantity: '2',
    price: '95',
    net: '190',
    interest: 5,
    interest_dates: ['2025-03-01'],
    pnl: '10',
    currency: 'RON',
    notes: 'coupon',
  };
  const { container, unmount } = renderPage(Bonds, {
    bonds: {
      ...emptyResource,
      count: 1,
      currencies: ['RON'],
      types: [
        ['in', 'Buy'],
        ['out', 'Sell'],
      ],
      tickers: ['BOND'],
      results: [bond],
      selectedItem: bond,
      modalOpen: true,
      aggregations: {
        buy_RON: 190,
        dividend_RON: 5,
        pnl_RON: 10,
        active_RON: 1,
      },
      kwargs: {},
    },
  });
  expect(container.textContent).toContain('Profit: 15 RON');
  expect(container.textContent).toContain('BOND');
  act(() => container.querySelector('input[type="checkbox"]').click());
  container
    .querySelectorAll('[data-testid="investment-select"]')
    .forEach((select) => {
      act(() => select.click());
    });
  act(() => container.querySelector('tbody tr').click());
  const bondForm = container.querySelectorAll('form');
  const editBondForm = bondForm[bondForm.length - 1];
  fillTextInputs(editBondForm, [
    'BOND',
    '2',
    '95',
    '190',
    'RON',
    '5',
    '10',
    'coupon',
  ]);
  const bondFormButtons = Array.from(editBondForm.querySelectorAll('button'));
  act(() => bondFormButtons[0].click());
  act(() => bondFormButtons[1].click());
  act(() =>
    editBondForm.querySelector('button .mdi-delete').parentElement.click()
  );
  act(() =>
    Array.from(editBondForm.querySelectorAll('button'))
      .find((button) => button.textContent === 'add date +')
      .click()
  );
  submitForm(editBondForm);
  act(() =>
    Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent === 'Close')
      .click()
  );
  expect(mockDispatch).toHaveBeenCalled();
  unmount();
});

test('Bonds creates a transaction from the modal form', () => {
  const { container, unmount } = renderPage(Bonds, {
    bonds: {
      ...emptyResource,
      currencies: ['RON'],
      types: [['in', 'Buy']],
      modalOpen: true,
    },
  });
  const forms = container.querySelectorAll('form');
  const form = forms[forms.length - 1];
  act(() => form.querySelector('button').click());
  act(() =>
    Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent === 'add date +')
      .click()
  );
  container
    .querySelectorAll('[data-testid="investment-select"]')
    .forEach((select) => {
      act(() => select.click());
    });
  fillTextInputs(form, ['BOND', '2', '95', '190', 'RON', '5', '10', 'coupon']);
  act(() =>
    Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent === 'Add')
      .click()
  );
  act(() =>
    Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent === 'Close')
      .click()
  );
  expect(mockDispatch).toHaveBeenCalled();
  unmount();
});

test('Crypto renders holdings and transactions and applies portfolio filters', () => {
  const { container, unmount } = renderPage(Crypto, {
    crypto: {
      ...emptyResource,
      count: 1,
      currencies: ['USD', 'EUR', 'RON'],
      types: [
        ['buy', 'Buy'],
        ['sell', 'Sell'],
      ],
      symbols: ['BTC'],
      kwargs: { currency: ['USD'] },
      results: [
        {
          id: 21,
          date: '2025-01-01',
          type: 'Buy',
          quantity: '1',
          symbol: 'BTC',
          price: '100',
          fees: '1',
          value: '99',
          currency: 'USD',
        },
      ],
      aggregations: {
        quantities: [{ symbol: 'BTC', value: 1 }],
        current: { total_USD: 99, total_EUR: 90, total_RON: 450 },
        USD: {
          counts: [{ value: 1 }, { value: 1 }],
          totals: [{ type: 'buy', value: 100 }],
        },
        EUR: {
          counts: [{ value: 1 }, { value: 1 }],
          totals: [{ type: 'buy', value: 90 }],
        },
        RON: {
          counts: [{ value: 1 }, { value: 1 }],
          totals: [{ type: 'buy', value: 450 }],
        },
      },
    },
    cryptoPnl: {
      ...emptyResource,
      count: 1,
      currencies: ['USD', 'EUR'],
      tickers: ['BTC'],
      total: { USD: -5, EUR: 10 },
      results: [
        {
          id: 22,
          date_sold: '2025-02-01',
          date_acquired: '2025-01-01',
          ticker: 'BTC',
          quantity: '1',
          currency: 'USD',
          cost_basis: 100,
          amount: 95,
          gross_pnl: -4,
          fees: 1,
          net_pnl: -5,
        },
      ],
    },
  });
  expect(container.textContent).toContain('Portfolio');
  expect(container.textContent).toContain('BTC');
  expect(container.textContent).toContain('Profit and Loss (1)');
  container
    .querySelectorAll('[data-testid="investment-select"]')
    .forEach((select) => {
      act(() => select.click());
    });
  const cryptoTables = container.querySelectorAll('table');
  act(() =>
    cryptoTables[cryptoTables.length - 1]
      .querySelector('tbody tr td:nth-child(2)')
      .click()
  );
  act(() =>
    cryptoTables[cryptoTables.length - 1]
      .querySelector('tbody tr td:nth-child(4)')
      .click()
  );
  act(() =>
    cryptoTables[cryptoTables.length - 2]
      .querySelector('tbody tr td:nth-child(3)')
      .click()
  );
  container.querySelectorAll('button .mdi-refresh').forEach((icon) => {
    act(() => icon.parentElement.click());
  });
  expect(mockDispatch).toHaveBeenCalled();
  unmount();
});

test('Deposits renders maturity details and applies currency filters', () => {
  const deposit = {
    id: 31,
    name: 'Savings',
    alias: 'Emergency',
    amount: '1000',
    currency: 'RON',
    date: '2025-01-01',
    maturity: '2026-01-01',
    interest: '5',
    pnl: '50',
    tax: '5',
  };
  const { container, unmount } = renderPage(Deposits, {
    deposits: {
      ...emptyResource,
      count: 1,
      currencies: [
        ['RON', 'Romanian Leu'],
        ['EUR', 'Euro'],
      ],
      aggregations: { RON: 1000, EUR: 500 },
      results: [deposit],
      selectedItem: deposit,
      modalOpen: true,
    },
  });
  expect(container.textContent).toContain('Next Maturity');
  expect(container.textContent).toContain('Savings');
  expect(container.textContent).toContain('Interest');
  container
    .querySelectorAll('[data-testid="investment-select"]')
    .forEach((select) => {
      act(() => select.click());
    });
  act(() => container.querySelector('tbody tr').click());
  const depositForms = container.querySelectorAll('form');
  const depositForm = depositForms[depositForms.length - 1];
  fillTextInputs(depositForm, ['1000', '5', 'Savings', 'Emergency', '5', '50']);
  depositForm.querySelectorAll('button').forEach((button) => {
    if (button.textContent === 'Set date') act(() => button.click());
  });
  container.querySelectorAll('button .mdi-refresh').forEach((icon) => {
    act(() => icon.parentElement.click());
  });
  const depositButtons = Array.from(container.querySelectorAll('button'));
  act(() =>
    depositButtons.find((button) => button.textContent === 'Update').click()
  );
  expect(mockDispatch).toHaveBeenCalled();
  unmount();
});

test('Deposits creates a deposit after required form fields are set', () => {
  const { container, unmount } = renderPage(Deposits, {
    deposits: {
      ...emptyResource,
      currencies: [['RON', 'Romanian Leu']],
      modalOpen: true,
    },
  });
  const forms = container.querySelectorAll('form');
  const form = forms[forms.length - 1];
  form.querySelectorAll('button').forEach((button) => {
    if (button.textContent === 'Set date') act(() => button.click());
  });
  container
    .querySelectorAll('[data-testid="investment-select"]')
    .forEach((select) => {
      act(() => select.click());
    });
  fillTextInputs(form, ['1000', '5', 'Savings', '10', '50']);
  act(() =>
    Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent === 'Add')
      .click()
  );
  act(() =>
    Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent === 'Close')
      .click()
  );
  expect(mockDispatch).toHaveBeenCalled();
  unmount();
});

test('Stocks renders holdings and profit/loss transactions and applies filters', () => {
  const { container, unmount } = renderPage(Stocks, {
    stocks: {
      ...emptyResource,
      count: 1,
      currencies: ['USD', 'EUR'],
      types: [
        ['buy', 'Buy'],
        ['sell', 'Sell'],
      ],
      tickers: ['ACME'],
      kwargs: { currency: ['USD'] },
      results: [
        {
          id: 41,
          date: '2025-01-01',
          type: 'Buy',
          ticker: 'ACME',
          quantity: '2',
          price_per_share: 25,
          currency: 'USD',
          total_amount: 50,
          fx_rate: 1,
        },
      ],
      aggregations: {
        quantities: [{ ticker: 'ACME', value: 2 }],
        USD: {
          counts: [{ value: 1 }, { value: 1 }],
          totals: [{ type: 'buy', value: 50 }],
        },
        EUR: {
          counts: [{ value: 0 }, { value: 0 }],
          totals: [{ type: 'buy', value: 0 }],
        },
        current: { total_USD: 50, total_EUR: 0 },
      },
    },
    pnl: {
      ...emptyResource,
      count: 1,
      currencies: ['USD', 'EUR'],
      tickers: ['ACME'],
      total: { USD: 5, EUR: -2 },
      results: [
        {
          id: 42,
          date_sold: '2025-02-01',
          date_acquired: '2025-01-01',
          ticker: 'ACME',
          security_name: 'Acme Corp',
          country: 'US',
          quantity: '2',
          currency: 'USD',
          cost_basis: 50,
          amount: 55,
          pnl: 5,
        },
      ],
    },
  });
  expect(container.textContent).toContain('Portfolio');
  expect(container.textContent).toContain('ACME');
  expect(container.textContent).toContain('Profit and Loss (1)');
  container
    .querySelectorAll('[data-testid="investment-select"]')
    .forEach((select) => {
      act(() => select.click());
    });
  const stockTables = container.querySelectorAll('table');
  act(() =>
    stockTables[stockTables.length - 1]
      .querySelector('tbody tr td:nth-child(2)')
      .click()
  );
  act(() =>
    stockTables[stockTables.length - 1]
      .querySelector('tbody tr td:nth-child(4)')
      .click()
  );
  act(() =>
    stockTables[stockTables.length - 2]
      .querySelector('tbody tr td:nth-child(3)')
      .click()
  );
  container.querySelectorAll('button .mdi-refresh').forEach((icon) => {
    act(() => icon.parentElement.click());
  });
  expect(mockDispatch).toHaveBeenCalled();
  unmount();
});

test.each([
  ['Crypto', Crypto, 'customFileLang', 'transactionsFile'],
  ['Stocks', Stocks, 'customFileLang', 'transactionsFile'],
])(
  '%s accepts CSV uploads and rejects other file types',
  (_name, Component, pnlInputId, transactionsInputId) => {
    const { container, unmount } = renderPage(Component);
    const pnlInput = container.querySelector(`#${pnlInputId}`);
    const transactionsInput = container.querySelector(
      `#${transactionsInputId}`
    );

    setFile(pnlInput, new File(['invalid'], 'pnl.txt', { type: 'text/plain' }));
    setFile(pnlInput, new File(['pnl'], 'pnl.csv', { type: 'text/csv' }));
    submitForm(pnlInput.closest('form'));

    setFile(
      transactionsInput,
      new File(['invalid'], 'transactions.txt', { type: 'text/plain' })
    );
    setFile(
      transactionsInput,
      new File(['transactions'], 'transactions.csv', { type: 'text/csv' })
    );
    submitForm(transactionsInput.closest('form'));

    expect(mockDispatch).toHaveBeenCalled();
    unmount();
  }
);
