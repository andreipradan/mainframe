import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Meals from './Meals';
import MealsApi from '../../api/meals';
import { selectItem } from '../../redux/mealsSlice';

let mockState = null;
const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector) => selector(mockState),
}));
jest.mock('../../api/meals', () => ({
  __esModule: true,
  default: {
    getList: jest.fn((...args) => ({ type: 'meals/getList', args })),
    sync: jest.fn((...args) => ({ type: 'meals/sync', args })),
  },
}));
jest.mock('../../redux/mealsSlice', () => ({
  selectItem: jest.fn((id) => ({ type: 'meals/selectItem', payload: id })),
}));
jest.mock('../meals/components/EditModal', () => () => null);
jest.mock('react-loader-spinner', () => ({
  ColorRing: () => <div>Loading</div>,
}));
jest.mock('@fullcalendar/react', () => {
  const React = require('react');
  return ({ datesSet, eventClick, events }) =>
    React.createElement(
      'div',
      { 'data-testid': 'calendar' },
      React.createElement(
        'button',
        {
          type: 'button',
          onClick: () =>
            datesSet({
              start: new Date('2025-01-01T00:00:00Z'),
              end: new Date('2025-02-01T00:00:00Z'),
            }),
        },
        'Set dates'
      ),
      React.createElement(
        'button',
        {
          type: 'button',
          onClick: () => eventClick({ event: { id: '17' } }),
        },
        'Open meal'
      ),
      events?.map((event) =>
        React.createElement('span', { key: event.id }, event.title)
      )
    );
});
jest.mock('react-bootstrap/Alert', () => ({ children, onClose }) => (
  <div role='alert'>
    {children}
    <button type='button' onClick={onClose}>
      Dismiss
    </button>
  </div>
));

describe('Meals', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    MealsApi.getList.mockClear();
    MealsApi.sync.mockClear();
    selectItem.mockClear();
    mockState = {
      auth: { token: 'token' },
      meals: {
        errors: null,
        loading: false,
        results: [
          {
            id: 17,
            name: 'Lunch with friends',
            date: '2025-01-02',
            time: '12:00',
          },
        ],
      },
    };
  });

  test('loads the displayed date range, selects meals, and syncs', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    act(() => root.render(<Meals />));

    act(() =>
      container.querySelector('[data-testid="calendar"] button').click()
    );
    expect(MealsApi.getList).toHaveBeenCalledWith(
      'token',
      '2025-01-01',
      '2025-02-01'
    );
    expect(container.textContent).toContain('Lunch with');

    act(() =>
      container.querySelectorAll('[data-testid="calendar"] button')[1].click()
    );
    expect(selectItem).toHaveBeenCalledWith(17);
    act(() =>
      container.querySelector('.mdi-sync-alert').closest('button').click()
    );
    expect(MealsApi.sync).toHaveBeenCalledWith('token');

    act(() => root.unmount());
  });

  test('shows and dismisses errors and loading state', () => {
    mockState.meals.errors = 'Could not load meals';
    mockState.meals.loading = true;
    const container = document.createElement('div');
    const root = createRoot(container);
    act(() => root.render(<Meals />));

    expect(container.textContent).toContain('Could not load meals');
    expect(container.textContent).toContain('Loading');
    act(() => container.querySelector('[role="alert"] button').click());
    expect(container.querySelector('[role="alert"]')).toBeNull();

    act(() => root.unmount());
  });
});
