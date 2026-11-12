import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Car from '../Car';

let mockState = null;
const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector) => selector(mockState),
}));
jest.mock('src/api/expenses', () => ({
  CarApi: function CarApiMock() {
    return {
      getList() {
        return { type: 'car/getList' };
      },
      deleteServiceEntry(carId, entryId) {
        return {
          type: 'car/deleteServiceEntry',
          payload: { carId, entryId },
        };
      },
      createServiceEntry(carId, data) {
        return {
          type: 'car/createServiceEntry',
          payload: { carId, data },
        };
      },
      create(data) {
        return { type: 'car/create', payload: data };
      },
      update(carId, data) {
        return { type: 'car/update', payload: { carId, data } };
      },
      delete(carId, name) {
        return { type: 'car/delete', payload: { carId, name } };
      },
    };
  },
}));
jest.mock(
  'src/app/shared/ListItem',
  () =>
    ({ label, value }) =>
      require('react').createElement('div', null, `${label}: ${value}`)
);
jest.mock('src/app/shared/BottomPagination', () => () => null);
jest.mock('src/app/shared/Errors', () => () => null);
jest.mock('react-datepicker', () => () => null);
jest.mock('react-loader-spinner', () => ({
  Circles: () => null,
  ColorRing: () => null,
}));
jest.mock('react-bootstrap', () => {
  const React = require('react');
  const Form = ({ children, ...props }) =>
    React.createElement('form', props, children);
  Form.Group = ({ children }) => React.createElement('div', null, children);
  Form.Label = ({ children }) => React.createElement('label', null, children);
  Form.Control = (props) => React.createElement('input', props);
  return {
    Collapse: ({ children }) => React.createElement('div', null, children),
    Form,
  };
});
jest.mock('react-bootstrap/Button', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children, ...props }) =>
      React.createElement('button', props, children),
  };
});
jest.mock('react-bootstrap/Modal', () => {
  const React = require('react');
  const Modal = ({ children, show }) =>
    show ? React.createElement('div', null, children) : null;
  Modal.Header = ({ children }) => React.createElement('div', null, children);
  Modal.Title = ({ children }) => React.createElement('div', null, children);
  Modal.Body = ({ children }) => React.createElement('div', null, children);
  Modal.Footer = ({ children }) => React.createElement('div', null, children);
  return { __esModule: true, default: Modal };
});

const createCarState = (overrides = {}) => ({
  auth: { token: 'token' },
  car: {
    loading: false,
    loadingItems: [],
    errors: null,
    count: 1,
    kwargs: {},
    selectedItem: null,
    modalOpen: false,
    results: [
      {
        id: 2,
        name: 'Family car',
        service_entries: [
          {
            id: 4,
            date: '2025-01-02',
            price: '125.00',
            currency: 'RON',
            description: 'Oil change',
          },
        ],
      },
    ],
    ...overrides,
  },
});

const renderCar = () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => root.render(<Car />));
  return {
    container,
    unmount: () => act(() => root.unmount()),
  };
};

const setInputValue = (input, value) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(
    input,
    value
  );
  input.dispatchEvent(new Event('input', { bubbles: true }));
};

describe('Car service-entry actions', () => {
  test('deletes the selected service entry from its car', () => {
    mockDispatch.mockReset();
    mockState = createCarState();
    const { container, unmount } = renderCar();

    const deleteButton = container.querySelector(
      'button[aria-label*="Oil change"]'
    );
    expect(deleteButton).not.toBeNull();
    expect(deleteButton.type).toBe('button');
    act(() => deleteButton.click());
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'car/deleteServiceEntry',
      payload: { carId: 2, entryId: 4 },
    });

    unmount();
  });

  test('creates a service entry and handles cars without entries', () => {
    mockDispatch.mockReset();
    mockState = createCarState({
      results: [
        {
          id: 2,
          name: 'Family car',
          service_entries: [],
        },
      ],
    });
    const { container, unmount } = renderCar();
    expect(container.textContent).toContain('No entries.');
    expect(container.textContent).toContain('No service entries found');

    const entryButton = Array.from(container.querySelectorAll('button')).find(
      (button) =>
        button.closest('h6')?.textContent.includes('Family car') &&
        button.querySelector('.mdi-plus')
    );
    act(() => entryButton.click());
    const inputs = container.querySelectorAll('input[type="text"]');
    act(() => setInputValue(inputs[0], '50'));
    act(() => setInputValue(inputs[1], 'Tire change'));
    act(() =>
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === 'Add')
        .click()
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'car/createServiceEntry',
        payload: expect.objectContaining({
          carId: 2,
          data: expect.objectContaining({
            description: 'Tire change',
            price: '50',
          }),
        }),
      })
    );
    unmount();
  });

  test('creates a car from the add modal and renders the empty state', () => {
    mockDispatch.mockReset();
    mockState = createCarState({ results: [], modalOpen: true, count: 0 });
    const { container, unmount } = renderCar();
    expect(container.textContent).toContain('No cars added');
    const nameInput = container.querySelector('input[type="text"]');
    act(() => setInputValue(nameInput, 'New car'));
    act(() =>
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === 'Add')
        .click()
    );
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'car/create',
      payload: { name: 'New car' },
    });
    unmount();
  });

  test('updates or deletes a selected car and closes its modal', () => {
    mockDispatch.mockReset();
    const car = {
      id: 2,
      name: 'Family car',
      employer: 'Fleet',
      service_entries: [],
    };
    mockState = createCarState({ selectedItem: car });
    const { container, unmount } = renderCar();
    expect(container.textContent).toContain('Edit Family car');
    act(() =>
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === 'Update')
        .click()
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'car/update' })
    );
    act(() =>
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === 'Delete')
        .click()
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'car/delete' })
    );
    act(() =>
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === 'Close')
        .click()
    );
    unmount();
  });
});
