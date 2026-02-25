import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Details from '../Details';

// Mock charts and marquee
jest.mock('react-chartjs-2', () => ({
  Bar: () => <div>BarChart</div>,
  Line: () => <div>LineChart</div>,
  Doughnut: () => <div>Doughnut</div>,
}));
jest.mock('react-fast-marquee', () => (p) => <div>{p.children}</div>);
jest.mock('src/api/finance', () => ({
  FinanceApi: { getCredit: jest.fn() },
  TimetableApi: class {
    getList = jest.fn;
  },
}));
jest.mock('src/api/finance/payments', () => ({
  PaymentsApi: class {
    getList = jest.fn;
  },
}));

describe('Details component', () => {
  it('renders without crashing', async () => {
    const now = new Date().toISOString().split('T')[0];
    const initialState = {
      auth: { token: null },
      credit: {
        credit: {
          currency: 'RON',
          total: 1000,
          date: now,
          number_of_months: 12,
        },
        rates: [],
        latest_timetable: { amortization_table: [] },
        payment_stats: { total: 0, interest: 0, prepaid: 0, principal: 0 },
      },
      payment: { results: [], count: 0, loading: false },
      timetable: { results: [], loading: false },
    };
    const store = configureStore({ reducer: (s = initialState) => s });

    const div = document.createElement('div');
    const root = createRoot(div);
    await act(async () => {
      root.render(
        <Provider store={store}>
          <Details />
        </Provider>
      );
      await new Promise((r) => {
        setTimeout(r, 0);
      });
    });

    expect(div.innerHTML).toContain('Credit');

    await act(async () => {
      root.unmount();
      await new Promise((r) => {
        setTimeout(r, 0);
      });
    });
  });
});
