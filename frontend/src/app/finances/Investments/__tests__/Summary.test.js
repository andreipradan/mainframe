import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Summary from '../Summary';

let mockState = {};
const mockDispatch = jest.fn();

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector) => selector(mockState),
}));
jest.mock('react-chartjs-2', () => ({ Line: () => null }));
jest.mock(
  'react-fast-marquee',
  () =>
    ({ children }) =>
      children
);
jest.mock('react-loader-spinner', () => ({ Circles: () => null }));
jest.mock('../../../earthquakes/Earthquakes', () => ({
  formatDate: (date) => date.toLocaleDateString(),
}));

it('renders investment profit and fallback states', () => {
  mockState = {
    auth: { token: 'token' },
    investments: {
      errors: null,
      loading: false,
      totals: { USD: { active: '100', pnl: '10', dividend: '5' } },
      currencies: ['USD'],
      bonds: {
        currencies: ['USD'],
        active_USD: '100',
        deposit_USD: '15',
        buy_USD: '20',
        sell_USD: '5',
        pnl_USD: '10',
        dividend_USD: '5',
        interest_rates_USD: [{ date: '2025-01-01', interest: 5 }],
        next_interest: {
          interest_dates: ['2099-01-01'],
          ticker: 'TEST',
          net: 100,
          currency: 'USD',
          interest: 5,
          months: 3,
        },
      },
      deposits: {
        currencies: ['RON'],
        active_RON: '200',
        deposit_RON: '25',
        buy_RON: '30',
        sell_RON: '10',
        pnl_RON: '8',
        dividend_RON: '2',
        interest_rates_RON: [{ date: '2025-01-01', interest: 4 }],
        next_maturity: {
          maturity: '2099-02-01',
          name: 'Test deposit',
          amount: 200,
          currency: 'RON',
          interest: 4,
          months: 6,
        },
      },
    },
    pension: {
      loading: false,
      results: [
        {
          id: 1,
          name: 'Pension fund',
          latest_unit_value: '2',
          total_units: '10',
          contributions: [
            {
              date: '2025-01-01',
              amount: '15',
              units: '10',
              unit_value: '1.5',
              currency: 'RON',
            },
          ],
        },
      ],
    },
  };
  const container = document.createElement('div');
  const root = createRoot(container);

  act(() => root.render(<Summary />));

  expect(container.textContent).toMatch(/Profit:\s+15\.00 USD/);
  expect(container.textContent).toMatch(/Profit:\s+15 USD/);
  expect(container.textContent).toMatch(/Next bond interest\s+Date:/);
  expect(container.textContent).toContain('Test deposit');
  expect(container.textContent).toContain('Pension fund');
  expect(container.querySelectorAll('canvas')).toHaveLength(0);

  act(() => root.unmount());
});
