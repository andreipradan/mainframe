import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Sources from './Sources';

let mockState;
const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector) => selector(mockState),
}));
jest.mock('../../api/sources', () => ({
  __esModule: true,
  default: class SourcesApiMock {
    constructor(token) {
      this.token = token;
    }

    getList(kwargs) {
      return { type: 'sources/getList', payload: kwargs };
    }

    create(data) {
      return { type: 'sources/create', payload: data };
    }

    update(id, data) {
      return { type: 'sources/update', payload: { id, data } };
    }

    delete(id, name) {
      return { type: 'sources/delete', payload: { id, name } };
    }
  },
}));
jest.mock('../../redux/sourcesSlice', () => ({
  selectItem: (id) => ({ type: 'sources/selectItem', payload: id }),
  setKwargs: (kwargs) => ({ type: 'sources/setKwargs', payload: kwargs }),
  setModalOpen: (open) => ({ type: 'sources/setModalOpen', payload: open }),
}));
jest.mock('../shared/BottomPagination', () => () => null);
jest.mock('../shared/Errors', () => ({ errors }) => (
  <div>{errors?.detail || null}</div>
));
jest.mock('react-ace', () => {
  const React = require('react');
  return ({ onChange, value, className, placeholder }) =>
    React.createElement('textarea', {
      className,
      placeholder,
      value: value || '',
      onChange: (event) => onChange(event.target.value, { end: { row: 0 } }),
    });
});
jest.mock('react-select', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ options = [], onChange }) =>
      React.createElement(
        'select',
        {
          onChange: (event) => onChange({ value: event.target.value }),
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
jest.mock('react-loader-spinner', () => ({
  Audio: () => <div>Loading sources</div>,
  ColorRing: () => <div>Loading source</div>,
}));
jest.mock('react-bootstrap/Button', () => {
  const React = require('react');
  return ({ children, ...props }) =>
    React.createElement('button', props, children);
});
jest.mock('react-bootstrap/Form', () => {
  const React = require('react');
  const Form = ({ children, ...props }) =>
    React.createElement('form', props, children);
  Form.Group = ({ children, ...props }) =>
    React.createElement('div', props, children);
  Form.Label = ({ children }) => React.createElement('label', null, children);
  Form.Control = (props) => React.createElement('input', props);
  Form.Check = ({ checked, onChange, ...props }) =>
    React.createElement('input', {
      ...props,
      type: 'checkbox',
      checked,
      onChange,
    });
  return { __esModule: true, default: Form };
});
jest.mock('react-bootstrap/Modal', () => {
  const React = require('react');
  const Modal = ({ children }) => React.createElement('div', null, children);
  Modal.Header = ({ children }) => React.createElement('div', null, children);
  Modal.Title = ({ children }) => React.createElement('h2', null, children);
  Modal.Body = ({ children }) => React.createElement('div', null, children);
  Modal.Footer = ({ children }) => React.createElement('div', null, children);
  return { __esModule: true, default: Modal };
});
jest.mock('../finances/Accounts/Categorize/EditModal', () => ({
  selectStyles: {},
}));

const source = {
  id: 8,
  name: 'Weather',
  url: 'https://weather.example',
  type: 'api',
  is_active: true,
  config: { city: 'Paris' },
  headers: { authorization: 'token' },
  created_at: '2025-01-01',
  updated_at: '2025-01-02',
};

const renderSources = () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => root.render(<Sources />));
  return {
    container,
    unmount: () => act(() => root.unmount()),
  };
};

const setValue = (element, value) => {
  const prototype =
    element.tagName === 'TEXTAREA'
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
};

describe('Sources', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    mockState = {
      auth: { token: 'token' },
      sources: {
        count: 1,
        errors: null,
        loading: false,
        loadingItems: [],
        kwargs: { page: 1 },
        types: [
          ['api', 'API'],
          ['rss', 'RSS'],
        ],
        results: [source],
        selectedItem: null,
        modalOpen: false,
      },
    };
  });

  test('renders sources, refreshes, selects an item, and handles list states', () => {
    const { container, unmount } = renderSources();
    expect(container.textContent).toContain('Weather');
    expect(container.textContent).toContain('API');
    act(() => container.querySelector('tbody tr').click());
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'sources/selectItem',
      payload: 8,
    });
    act(() => container.querySelector('h4 button').click());
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'sources/getList',
      payload: { page: 1 },
    });
    unmount();

    mockState.sources.loading = true;
    const loading = renderSources();
    expect(loading.container.textContent).toContain('Loading sources');
    loading.unmount();

    mockState.sources.loading = false;
    mockState.sources.loadingItems = [8];
    const itemLoading = renderSources();
    expect(itemLoading.container.textContent).toContain('Loading source');
    itemLoading.unmount();

    mockState.sources.loadingItems = [];
    mockState.sources.results = [];
    const empty = renderSources();
    expect(empty.container.textContent).toContain('No sources available');
    empty.unmount();
  });

  test('creates a source with parsed JSON config and headers', () => {
    mockState.sources.modalOpen = true;
    const { container, unmount } = renderSources();
    const inputs = container.querySelectorAll('input[type="text"]');
    act(() => {
      setValue(inputs[0], 'New source');
      setValue(inputs[1], 'https://source.example');
      container.querySelector('input[type="checkbox"]').click();
      container.querySelector('select').value = 'rss';
      container
        .querySelector('select')
        .dispatchEvent(new Event('change', { bubbles: true }));
      const editors = container.querySelectorAll('textarea');
      setValue(editors[0], '{"key":"value"}');
      setValue(editors[1], '{"Accept":"application/json"}');
    });
    act(() =>
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === 'Create')
        .click()
    );
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'sources/create',
      payload: {
        is_active: true,
        name: 'New source',
        type: 'rss',
        url: 'https://source.example',
        config: { key: 'value' },
        headers: { Accept: 'application/json' },
      },
    });
    unmount();
  });

  test('updates and deletes a selected source and closes the modal', () => {
    mockState.sources.selectedItem = source;
    const { container, unmount } = renderSources();
    expect(container.textContent).toContain('Created:');
    act(() =>
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === 'Update')
        .click()
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'sources/update',
        payload: expect.objectContaining({ id: 8 }),
      })
    );
    act(() =>
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === 'Delete')
        .click()
    );
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'sources/delete',
      payload: { id: 8, name: 'Weather' },
    });
    act(() =>
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === 'Close')
        .click()
    );
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'sources/setModalOpen',
      payload: false,
    });
    unmount();
  });
});
