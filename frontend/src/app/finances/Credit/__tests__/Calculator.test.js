import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Calculator from '../Calculator';

let mockState = {};
const mockDispatch = jest.fn();
const mockHistoryPush = jest.fn();

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector) => selector(mockState),
}));
jest.mock('react-router-dom', () => ({
  useHistory: () => ({ push: mockHistoryPush }),
}));
jest.mock('src/api/finance', () => ({
  TimetableApi: class TimetableApi {
    constructor(token) {
      this.token = token;
    }

    getList() {
      return { type: 'timetable/getList', token: this.token };
    }
  },
}));
jest.mock('react-select', () => ({
  __esModule: true,
  default: ({ options, value, onChange }) => (
    <button
      type='button'
      aria-label='Select timetable'
      onClick={() => onChange(options[1])}
    >
      {value?.label}
    </button>
  ),
}));
jest.mock('react-loader-spinner', () => ({
  Circles: () => <div>Loading</div>,
}));
jest.mock('../../../shared/Errors', () => () => null);

const makeTimetable = (id, date) => ({
  id,
  date,
  interest: 6,
  ircc: 2,
  credit: { currency: 'RON' },
  amortization_table: [
    { principal: '1000', interest: '100', insurance: '10', total: '2500' },
    { principal: '2000', interest: '90', insurance: '10', total: '2500' },
    { principal: '3000', interest: '80', insurance: '10', total: '2500' },
    { principal: '4000', interest: '70', insurance: '10', total: '2500' },
    { principal: '5000', interest: '60', insurance: '10', total: '2500' },
  ],
});

const renderCalculator = () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => root.render(<Calculator />));
  return {
    container,
    unmount: () => act(() => root.unmount()),
  };
};

const changeValue = (element, value) => {
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(element),
      'value'
    ).set;
    setter.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  });
};

beforeEach(() => {
  mockDispatch.mockReset();
  mockHistoryPush.mockReset();
});

describe('Credit prepayment calculator', () => {
  test('renders alternatives and updates the duration and monthly payment inputs', () => {
    const latest = makeTimetable(1, '2025-01-01');
    const previous = makeTimetable(2, '2024-12-01');
    mockState = {
      auth: { token: 'token' },
      timetable: {
        results: [latest, previous],
        selectedItem: latest,
        loading: false,
        errors: null,
      },
    };

    const { container, unmount } = renderCalculator();

    expect(container.textContent).toContain('Timetable: 2025-01-01 (latest)');
    expect(container.textContent).toContain('Other Amounts:');
    expect(container.textContent).toContain('Maturity in:');
    expect(container.textContent).toContain('Interest');

    const inputs = container.querySelectorAll('input');
    changeValue(inputs[0], '1500');
    changeValue(inputs[1], '3');
    changeValue(inputs[2], '100');
    expect(container.textContent).toContain('Amount must be >= 2500');
    changeValue(inputs[2], '5000');
    expect(container.textContent).not.toContain('Amount must be >= 2500');

    act(() =>
      container.querySelector('button[aria-label="Select timetable"]').click()
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'timetable/selectItem', payload: 2 })
    );

    act(() =>
      container.querySelector('button .mdi-refresh').parentElement.click()
    );
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'timetable/getList',
      token: 'token',
    });

    act(() =>
      container
        .querySelector('a[href="/finances/credit/details"]')
        .dispatchEvent(
          new MouseEvent('click', { bubbles: true, cancelable: true })
        )
    );
    expect(mockHistoryPush).toHaveBeenCalledWith('/finances/credit/details');
    unmount();
  });

  test('loads timetables when none is selected and renders loading controls', () => {
    mockState = {
      auth: { token: 'token' },
      timetable: {
        results: [],
        selectedItem: null,
        loading: true,
        errors: ['Unavailable'],
      },
    };
    const { container, unmount } = renderCalculator();

    expect(container.textContent).toContain('Loading');
    expect(
      container.querySelector('button[aria-label="Select timetable"]')
    ).toBeNull();
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'timetable/getList',
      token: 'token',
    });
    unmount();
  });
});
