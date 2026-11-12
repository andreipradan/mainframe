import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Messages from './Messages';

let mockState;
const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector) => selector(mockState),
}));
jest.mock('../../api/messages', () => ({
  __esModule: true,
  default: class MessagesApiMock {
    constructor(token) {
      this.token = token;
    }

    getList(kwargs) {
      return { type: 'messages/getList', payload: kwargs };
    }
  },
}));
jest.mock('../shared/BottomPagination', () => () => null);
jest.mock('../shared/Errors', () => ({ errors }) => (
  <div>{errors?.detail || null}</div>
));
jest.mock('./components/EditModal', () => () => null);
jest.mock('../finances/Accounts/Categorize/EditModal', () => ({
  selectStyles: {},
}));
jest.mock('react-loader-spinner', () => ({
  Audio: () => <div>Loading messages</div>,
  ColorRing: () => <div>Loading message</div>,
}));
jest.mock('react-select', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ options = [], onChange }) =>
      React.createElement(
        'select',
        {
          onChange: (event) => onChange([{ value: event.target.value }]),
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
jest.mock('react-bootstrap/Form', () => {
  const React = require('react');
  const Form = ({ children, ...props }) =>
    React.createElement('form', props, children);
  Form.Group = ({ children, ...props }) =>
    React.createElement('div', props, children);
  Form.Label = ({ children }) => React.createElement('label', null, children);
  return { __esModule: true, default: Form };
});

const renderMessages = () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => root.render(<Messages />));
  return {
    container,
    unmount: () => act(() => root.unmount()),
  };
};

describe('Messages', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    mockState = {
      auth: { token: 'token' },
      messages: {
        count: 2,
        errors: null,
        loading: false,
        loadingItems: [],
        kwargs: { author: [], chat_id: [] },
        authors: ['Bot', 'User'],
        chat_ids: ['1', '2'],
        results: [
          {
            id: 1,
            date: '2025-01-02T03:04:05Z',
            chat_title: 'General',
            author: { full_name: 'Automation Bot' },
          },
          {
            id: 2,
            date: '2025-01-03T03:04:05Z',
            chat_title: 'Private',
            author: { full_name: 'Alex' },
          },
        ],
      },
    };
  });

  test('renders messages, filters, refreshes, and opens an item', () => {
    const { container, unmount } = renderMessages();
    expect(container.textContent).toContain('Automation Bot');
    expect(container.textContent).toContain('General');

    const selects = container.querySelectorAll('select');
    act(() => {
      selects[0].value = 'Bot';
      selects[0].dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'messages/setKwargs' })
    );
    act(() => {
      selects[1].value = '1';
      selects[1].dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'messages/setKwargs' })
    );

    act(() => {
      Array.from(container.querySelector('tbody tr').children).forEach((cell) =>
        cell.click()
      );
    });
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'messages/selectItem', payload: 1 })
    );
    act(() =>
      container
        .querySelector('form')
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    );
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'messages/getList',
      payload: { author: [], chat_id: [] },
    });
    act(() => container.querySelector('h4 button').click());
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'messages/getList',
      payload: { author: [], chat_id: [] },
    });
    unmount();
  });

  test('shows loading, per-message loading, and empty states', () => {
    mockState.messages.loading = true;
    const loading = renderMessages();
    expect(loading.container.textContent).toContain('Loading messages');
    loading.unmount();

    mockState.messages.loading = false;
    mockState.messages.loadingItems = [1];
    const itemLoading = renderMessages();
    expect(itemLoading.container.textContent).toContain('Loading message');
    itemLoading.unmount();

    mockState.messages.loadingItems = [];
    mockState.messages.results = [];
    const empty = renderMessages();
    expect(empty.container.textContent).toContain('No crons available');
    empty.unmount();
  });
});
