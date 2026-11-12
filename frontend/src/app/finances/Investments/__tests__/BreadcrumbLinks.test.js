import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import Bonds from '../Bonds';
import Crypto from '../Crypto';
import Deposits from '../Deposits';
import Pension from '../Pension';
import Stocks from '../Stocks';

let mockState = null;
const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector) => selector(mockState),
}));
jest.mock('react-loader-spinner', () => ({
  Circles: () => <div>Loading pension data</div>,
  ColorRing: () => null,
}));
jest.mock(
  'react-fast-marquee',
  () =>
    ({ children }) =>
      children
);
jest.mock('react-select', () => () => null);
jest.mock('react-datepicker', () => () => null);
jest.mock('src/app/shared/Errors', () => () => null);
jest.mock('src/app/shared/ListItem', () => () => null);
jest.mock('src/app/shared/BottomPagination', () => () => null);
jest.mock('src/app/earthquakes/Earthquakes', () => ({
  formatDate: (value) => value,
  formatTime: (value) => value,
}));
jest.mock('react-chartjs-2', () => ({ Bar: () => null, Doughnut: () => null }));

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

beforeEach(() => mockDispatch.mockClear());

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

test('Pension submits contribution creation, updates, and deletion', () => {
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
  expect(mockDispatch).toHaveBeenCalled();

  act(() =>
    container.querySelector('button[aria-label="Edit contribution"]').click()
  );
  act(() =>
    container
      .querySelector('button[aria-label="Save contribution changes"]')
      .click()
  );
  expect(mockDispatch).toHaveBeenCalled();

  act(() =>
    container.querySelector('button[aria-label="Delete contribution"]').click()
  );
  act(() =>
    container
      .querySelector('button[aria-label="Confirm delete contribution"]')
      .click()
  );
  expect(mockDispatch).toHaveBeenCalled();
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
