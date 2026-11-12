import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Travel from './Travel';

let mockState;
const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector) => selector(mockState),
}));
jest.mock('../../api/expenses', () => ({
  ExpensesApi: class ExpensesApiMock {
    constructor(token) {
      this.token = token;
    }

    getList() {
      return { type: 'expenses/getList', token: this.token };
    }
  },
}));
jest.mock('./EditModal', () => () => null);
jest.mock('../shared/Errors', () => () => null);
jest.mock('react-loader-spinner', () => ({
  Circles: () => <div>Loading expenses</div>,
}));

const renderTravel = () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => root.render(<Travel />));
  return {
    container,
    unmount: () => act(() => root.unmount()),
  };
};

describe('Travel expenses', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    mockState = {
      auth: { token: 'token' },
      expenses: {
        errors: null,
        loading: false,
        results: [
          {
            id: 1,
            date: '2025-01-02',
            payer: { username: 'Alex', email: 'alex@example.test' },
            description: 'Train',
            currency: 'EUR',
            amount: '20',
            debts: [{ id: 2, user: 'Sam', amount: '10' }],
          },
          {
            id: 3,
            date: '2025-01-03',
            payer: { username: 'Sam', email: 'sam@example.test' },
            description: 'Taxi',
            currency: 'RON',
            amount: '30',
            debts: [],
          },
        ],
      },
    };
  });

  test('renders expenses and debtor details and selects an item', () => {
    const { container, unmount } = renderTravel();
    expect(container.textContent).toContain('Train');
    expect(container.textContent).toContain('Sam - 10');
    expect(container.textContent).toContain('No debts');

    act(() => container.querySelector('tbody tr').click());
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'expenses/selectItem',
      payload: 1,
    });

    act(() =>
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.className.includes('btn-rounded'))
        .click()
    );
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'expenses/setModalOpen',
      payload: true,
    });
    unmount();
  });

  test('shows loading and empty states and requests missing expenses', () => {
    mockState.expenses.loading = true;
    mockState.expenses.results = [];
    const loading = renderTravel();
    expect(loading.container.textContent).toContain('Loading expenses');
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'expenses/getList',
      token: 'token',
    });
    loading.unmount();

    mockState.expenses.loading = false;
    const empty = renderTravel();
    expect(empty.container.textContent).toContain('No accounts found');
    empty.unmount();
  });
});
