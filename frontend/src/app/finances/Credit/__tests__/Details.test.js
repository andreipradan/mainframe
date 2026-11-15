import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Details from '../Details';

// Mock charts and marquee
jest.mock('react-chartjs-2', () => {
  const React = require('react');
  const ChartMock = ({ data, options, name }) => {
    const callbacks = options?.tooltips?.callbacks;
    const tooltipData = {
      ...data,
      labels: data?.labels || ['January'],
      datasets: data?.datasets?.map((dataset) => ({
        ...dataset,
        _meta: dataset._meta || { 0: { total: 100 } },
        data: dataset.data?.length ? dataset.data : [1],
      })) || [{ data: [1], _meta: { 0: { total: 100 } } }],
    };
    return React.createElement(
      'div',
      { 'data-testid': `${name}-chart` },
      React.createElement(
        'button',
        {
          type: 'button',
          'data-testid': `${name}-label-tooltip`,
          onClick: () =>
            callbacks?.label?.({ datasetIndex: 0, index: 0 }, tooltipData),
        },
        'Label tooltip'
      ),
      React.createElement(
        'button',
        {
          type: 'button',
          'data-testid': `${name}-title-tooltip`,
          onClick: () =>
            callbacks?.title?.([{ datasetIndex: 0, index: 0 }], tooltipData),
        },
        'Title tooltip'
      )
    );
  };
  return {
    Bar: (props) => React.createElement(ChartMock, { ...props, name: 'bar' }),
    Line: (props) => React.createElement(ChartMock, { ...props, name: 'line' }),
    Doughnut: (props) =>
      React.createElement(ChartMock, { ...props, name: 'doughnut' }),
  };
});
jest.mock('react-fast-marquee', () => (p) => <div>{p.children}</div>);
jest.mock('src/api/finance', () => ({
  FinanceApi: { getCredit: () => ({ type: 'finance/getCredit' }) },
  TimetableApi: function TimetableApiMock() {
    return { getList: () => ({ type: 'timetable/getList' }) };
  },
}));
jest.mock('src/api/finance/payments', () => ({
  PaymentsApi: function PaymentsApiMock() {
    return { getList: () => ({ type: 'payments/getList' }) };
  },
}));
jest.mock('react-select', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: (props) =>
      React.createElement(
        'div',
        null,
        React.createElement(
          'button',
          {
            type: 'button',
            'data-testid': 'currency-select',
            onClick: () => props.onChange?.(props.options?.[1] || null),
          },
          props.value?.label || props.placeholder
        ),
        props.isClearable &&
          React.createElement(
            'button',
            {
              type: 'button',
              'data-testid': 'clear-currency',
              onClick: () => props.onChange?.(null),
            },
            'Clear currency'
          )
      ),
  };
});
jest.mock('react-tooltip', () => ({
  Tooltip: () => null,
}));

function renderDetails(initialState) {
  const store = configureStore({ reducer: (state = initialState) => state });
  const div = document.createElement('div');
  document.body.appendChild(div);
  const root = createRoot(div);
  act(() => {
    root.render(
      <Provider store={store}>
        <Details />
      </Provider>
    );
  });
  return { container: div, root, store };
}

describe('Details component', () => {
  it('renders without crashing', () => {
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
    const { container: div, root } = renderDetails(initialState);

    expect(div.innerHTML).toContain('Credit');

    const excludePrepayments = div.querySelector('#exclude-prepayments');
    const excludePrepaymentsLabel = div.querySelector(
      'label[for="exclude-prepayments"]'
    );
    expect(excludePrepaymentsLabel.control).toBe(excludePrepayments);
    expect(excludePrepayments.checked).toBe(false);
    act(() => excludePrepayments.click());
    expect(excludePrepayments.checked).toBe(true);

    act(() => {
      root.unmount();
    });
  });

  it('converts credit summaries and charts between currencies', () => {
    const initialState = {
      auth: { token: 'tok' },
      credit: {
        credit: {
          currency: 'RON',
          total: 1200,
          date: '2025-01-01',
          number_of_months: 24,
        },
        rates: [
          { symbol: 'RONEUR', value: 5, date: '2025-01-02', source: 'Rates' },
          { symbol: 'RONUSD', value: 4, date: '2025-01-02', source: 'Rates' },
          { symbol: 'RONGBP', value: 6, date: '2025-01-02', source: 'Rates' },
        ],
        latest_timetable: {
          interest: 2,
          ircc: 1,
          amortization_table: [
            {
              date: '2025-02-01',
              total: 110,
              principal: 80,
              interest: 20,
              insurance: 10,
              remaining: 900,
            },
            {
              date: '2025-03-01',
              total: 100,
              principal: 70,
              interest: 20,
              insurance: 10,
              remaining: 800,
            },
          ],
        },
        payment_stats: {
          total: 300,
          interest: 50,
          prepaid: 40,
          principal: 250,
          saved: 25,
        },
        loading: false,
        errors: null,
      },
      payment: {
        results: [
          {
            date: '2025-01-01',
            total: 100,
            principal: 80,
            interest: 20,
            remaining: 900,
            saved: 10,
            is_prepayment: true,
          },
          {
            date: '2025-02-01',
            total: 90,
            principal: 70,
            interest: 20,
            remaining: 800,
            saved: 0,
            is_prepayment: false,
          },
        ],
        count: 3,
        loading: false,
        errors: null,
      },
      timetable: {
        results: [
          { date: '2025-01-01', ircc: 1, margin: 2, interest: 3 },
          { date: '2025-02-01', ircc: 1.5, margin: 2, interest: 3.5 },
        ],
        loading: false,
      },
    };
    const { container, root, store } = renderDetails(initialState);

    expect(container.textContent).toContain('Credit: 1200.00');
    expect(container.textContent).toContain('Remaining: 210.00');
    expect(container.textContent).toContain('Next payment');
    expect(container.textContent).toContain('Last Payment');

    act(() =>
      container.querySelector('[data-testid="currency-select"]').click()
    );
    expect(container.textContent).toContain('Rate: 1 EUR = 5 RON');
    expect(container.textContent).toContain('Credit: 240.00');
    expect(container.textContent).toContain('Remaining: 42.00');

    act(() =>
      container.querySelector('[data-testid="clear-currency"]').click()
    );
    expect(container.textContent).toContain('Credit: 1200.00');

    const excludePrepayments = container.querySelector('#exclude-prepayments');
    act(() => excludePrepayments.click());
    expect(excludePrepayments.checked).toBe(true);
    act(() => excludePrepayments.click());
    expect(excludePrepayments.checked).toBe(false);

    act(() =>
      container.querySelector('[data-testid="bar-label-tooltip"]').click()
    );
    act(() =>
      container.querySelector('[data-testid="bar-title-tooltip"]').click()
    );
    act(() =>
      container.querySelector('[data-testid="doughnut-label-tooltip"]').click()
    );
    act(() =>
      container.querySelector('[data-testid="doughnut-title-tooltip"]').click()
    );

    container.querySelectorAll('.mdi-refresh').forEach((icon) => {
      act(() => icon.parentElement.click());
    });
    expect(store.getState()).toBe(initialState);

    act(() => root.unmount());
  });
});
