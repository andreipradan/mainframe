import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import Bonds from '../Bonds';
import Crypto from '../Crypto';
import Deposits from '../Deposits';
import Pension from '../Pension';
import Stocks from '../Stocks';

let mockState;
jest.mock('react-redux', () => ({
  useDispatch: () => jest.fn(),
  useSelector: (selector) => selector(mockState),
}));
jest.mock('react-loader-spinner', () => ({
  Circles: () => null,
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

const renderPage = async (Component) => {
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
      results: [
        {
          id: 1,
          name: 'Test pension',
          start_date: '2020-01-01',
          latest_unit_value: 0,
          total_units: 0,
          contributions: [
            {
              id: 2,
              date: '2025-01-01',
              amount: '100.00',
              units: '10.00',
              currency: 'RON',
            },
          ],
        },
      ],
    },
  };
  const container = document.createElement('div');
  const root = createRoot(container);
  await act(async () => {
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
  test('uses a navigable link to the investment summary', async () => {
    const { container, unmount } = await renderPage(Component);
    const summaryLink = container.querySelector(
      'a[href="/investments/summary"]'
    );

    expect(summaryLink).not.toBeNull();
    expect(summaryLink.textContent).toBe('Investments');
    unmount();
  });
});

test('Pension contribution controls enter and leave edit/delete states accessibly', async () => {
  const { container, unmount } = await renderPage(Pension);
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
