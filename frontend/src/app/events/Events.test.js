import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Events from './Events';

let mockState;
const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector) => selector(mockState),
}));
jest.mock('../../api/events', () => ({
  __esModule: true,
  default: class EventsApiMock {
    constructor(token) {
      this.token = token;
    }

    getList(kwargs) {
      return { type: 'events/getList', payload: kwargs };
    }

    create(payload) {
      return { type: 'events/create', payload };
    }

    update(id, payload) {
      return { type: 'events/update', payload: { id, ...payload } };
    }

    delete(id, title) {
      return { type: 'events/delete', payload: { id, title } };
    }
  },
}));
jest.mock('../../api/favorites', () => ({
  __esModule: true,
  default: class FavoritesApiMock {
    constructor(token) {
      this.token = token;
    }

    getList(kwargs) {
      return { type: 'favorites/getList', payload: kwargs };
    }
  },
}));
jest.mock('../shared/BottomPagination', () => () => null);
jest.mock('../shared/Errors', () => () => null);
jest.mock('./FavoriteBandsFilter', () => () => null);
jest.mock('../earthquakes/Earthquakes', () => ({
  formatTime: (value) => `formatted:${value}`,
}));
jest.mock('../finances/Accounts/Categorize/EditModal', () => ({
  selectStyles: {},
}));
jest.mock('react-loader-spinner', () => ({
  Audio: () => <div>Loading events</div>,
}));
jest.mock('react-select', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ options = [], isMulti, onChange }) =>
      React.createElement(
        'select',
        {
          multiple: isMulti,
          onChange: (event) => {
            const values = Array.from(event.target.selectedOptions).map(
              (option) => ({ value: option.value })
            );
            onChange(isMulti ? values : values[0] || null);
          },
        },
        options.map((option) =>
          React.createElement(
            'option',
            { key: option.value, value: option.value },
            option.label
          )
        )
      ),
  };
});
jest.mock('react-ace', () => ({
  __esModule: true,
  default: ({ value, onChange, className, placeholder }) =>
    require('react').createElement('textarea', {
      value: value || '',
      className,
      placeholder,
      onChange: (event) =>
        onChange(event.target.value, { end: { row: 0, column: 0 } }),
    }),
}));
jest.mock('react-bootstrap/Badge', () => {
  const React = require('react');
  return ({ children, ...props }) =>
    React.createElement('span', props, children);
});
jest.mock('react-bootstrap/Button', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children, ...props }) =>
      React.createElement('button', props, children),
  };
});
jest.mock('react-bootstrap/Form', () => {
  const React = require('react');
  const Form = ({ children, ...props }) =>
    React.createElement('form', props, children);
  Form.Group = ({ children, ...props }) =>
    React.createElement('div', props, children);
  Form.Label = ({ children, ...props }) =>
    React.createElement('label', props, children);
  Form.Control = ({ as, ...props }) =>
    React.createElement(as || 'input', props);
  Form.Check = (props) => React.createElement('input', props);
  return { __esModule: true, default: Form };
});
jest.mock('react-bootstrap/Modal', () => {
  const React = require('react');
  const Modal = ({ children, show }) =>
    show ? React.createElement('div', null, children) : null;
  Modal.Body = ({ children }) => React.createElement('div', null, children);
  Modal.Header = ({ children }) => React.createElement('div', null, children);
  Modal.Title = ({ children }) => React.createElement('div', null, children);
  return {
    __esModule: true,
    default: Modal,
    Body: Modal.Body,
    Header: Modal.Header,
    Title: Modal.Title,
  };
});

const renderEvents = () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => root.render(<Events />));
  return {
    container,
    unmount: () => act(() => root.unmount()),
  };
};

const setValue = (element, value) => {
  const setter = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(element),
    'value'
  ).set;
  act(() => {
    setter.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  });
};

const baseEvent = {
  id: 1,
  title: 'Live show',
  url: 'https://example.test/event',
  source_name: 'Venue',
  city: 'Paris',
  location: 'Main hall',
  location_url: 'https://example.test/map',
  start_date: '2025-01-02T03:04:05Z',
  end_date: '2025-01-03T03:04:05Z',
  description: 'Sold out',
  categories: ['rock'],
  additional_data: { sold_out: true },
};

describe('Events', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    mockState = {
      auth: { token: 'token' },
      events: {
        count: 1,
        errors: null,
        loading: false,
        kwargs: { city: '', location: '', category: [], period_filter: '' },
        cities: ['Paris'],
        locations: ['Main hall'],
        categories: ['rock'],
        results: [baseEvent, { ...baseEvent, id: 2, location_url: null }],
        selectedItem: null,
        modalOpen: false,
      },
      favorites: { results: [{ id: 2, name: 'Band' }] },
    };
  });

  test('renders events and applies filters, categories, edit, and delete actions', () => {
    const { container, unmount } = renderEvents();
    expect(container.textContent).toContain('Live show');
    expect(container.textContent).toContain('Sold out');
    expect(container.textContent).toContain('formatted:2025-01-02T03:04:05Z');

    const category = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent.trim() === 'rock'
    );
    act(() => category.click());
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'events/setKwargs' })
    );

    const city = container.querySelector('select');
    setValue(city, 'Paris');
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'events/setKwargs',
        payload: { city: 'Paris', location: undefined, page: 1 },
      })
    );

    act(() =>
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === 'Edit')
        .click()
    );
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'events/selectItem',
      payload: 1,
    });
    act(() =>
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === 'Delete')
        .click()
    );
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'events/delete',
      payload: { id: 1, title: 'Live show' },
    });
    unmount();
  });

  test('creates an event from the modal and validates additional data', () => {
    mockState.events.results = [];
    mockState.events.modalOpen = true;
    const { container, unmount } = renderEvents();
    const controls = container.querySelectorAll('form input, form textarea');
    setValue(controls[0], 'New event');
    setValue(controls[1], 'A description');
    setValue(controls[2], 'A location');
    setValue(controls[3], 'A source');
    setValue(controls[4], 'external-1');
    setValue(controls[5], '2025-02-01T10:00');
    setValue(controls[6], '2025-02-01T12:00');

    const additionalData = container.querySelector(
      'textarea[placeholder="AdditionalData"]'
    );
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(additionalData),
        'value'
      ).set;
      setter.call(additionalData, '{bad json');
      additionalData.dispatchEvent(new Event('input', { bubbles: true }));
      additionalData.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(additionalData.className).toContain('is-invalid');

    act(() => {
      const setter = Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(additionalData),
        'value'
      ).set;
      setter.call(additionalData, '{"artist":"Band"}');
      additionalData.dispatchEvent(new Event('input', { bubbles: true }));
      additionalData.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(additionalData.className).not.toContain('is-invalid');

    act(() =>
      container
        .querySelector('form')
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'events/create' })
    );
    unmount();
  });

  test('updates a selected event and covers loading and empty states', () => {
    mockState.events.selectedItem = baseEvent;
    mockState.events.results = [];
    const selected = renderEvents();
    expect(selected.container.textContent).toContain('Edit event');
    act(() =>
      selected.container
        .querySelector('form')
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'events/update' })
    );
    selected.unmount();

    mockState.events.selectedItem = null;
    mockState.events.modalOpen = false;
    mockState.events.loading = true;
    const loading = renderEvents();
    expect(loading.container.textContent).toContain('Loading events');
    loading.unmount();

    mockState.events.loading = false;
    const empty = renderEvents();
    expect(empty.container.textContent).toContain('No events available');
    empty.unmount();
  });
});
