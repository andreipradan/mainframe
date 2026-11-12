import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Summary from '../Summary';

let mockState;
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
        pnl_USD: '10',
        dividend_USD: '5',
        interest_rates_USD: [],
        next_interest: null,
      },
      deposits: { currencies: [], next_maturity: null },
    },
    pension: { loading: false, results: [] },
  };
  const container = document.createElement('div');
  const root = createRoot(container);

  act(() => root.render(<Summary />));

  expect(container.textContent).toMatch(/Profit:\s+15\.00 USD/);
  expect(container.textContent).toMatch(/Profit:\s+15 USD/);
  expect(container.textContent).toContain('Next bond interest-');
  expect(container.textContent).toContain('Next deposit maturity-');

  act(() => root.unmount());
});
