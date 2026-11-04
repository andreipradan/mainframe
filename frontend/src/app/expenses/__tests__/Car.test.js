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

describe('Car service-entry actions', () => {
  test('deletes the selected service entry from its car', () => {
    mockDispatch.mockReset();
    mockState = {
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
      },
    };
    const container = document.createElement('div');
    const root = createRoot(container);
    act(() => root.render(<Car />));

    const deleteButton = container.querySelector(
      'button[aria-label="Delete service entry: Oil change"]'
    );
    expect(deleteButton).not.toBeNull();
    expect(deleteButton.type).toBe('button');
    act(() => deleteButton.click());
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'car/deleteServiceEntry',
      payload: { carId: 2, entryId: 4 },
    });

    act(() => root.unmount());
  });
});
