import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Bots from './Bots';

let mockState;
const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector) => selector(mockState),
}));
jest.mock('../../api/bots', () => ({
  __esModule: true,
  default: class BotsApiMock {
    constructor(token) {
      this.token = token;
    }

    getList() {
      return { type: 'bots/getList', token: this.token };
    }
  },
}));
jest.mock('./modals/AddModal', () => () => null);
jest.mock('./modals/EditModal', () => () => null);
jest.mock('../shared/Errors', () => () => null);
jest.mock('react-loader-spinner', () => ({
  Audio: () => <div>Loading bots</div>,
  ColorRing: () => <div>Loading bot</div>,
}));

const renderBots = () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => root.render(<Bots />));
  return {
    container,
    unmount: () => act(() => root.unmount()),
  };
};

describe('Bots', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    mockState = {
      auth: { token: 'token' },
      bots: {
        results: [
          {
            id: 1,
            full_name: 'Primary bot',
            username: 'primary',
            webhook: 'https://example.test/api/hook',
            whitelist: ['one', 'two'],
            last_called_on: '2025-01-02T03:04:05Z',
          },
          {
            id: 2,
            full_name: 'Secondary bot',
            username: 'secondary',
            webhook: 'https://example.test/',
            whitelist: [],
            last_called_on: null,
          },
        ],
        errors: null,
        loading: false,
        loadingItems: [],
      },
    };
  });

  test('renders bot details and dispatches refresh and selection actions', () => {
    const { container, unmount } = renderBots();
    expect(container.textContent).toContain('Primary bot');
    expect(container.textContent).toContain('one, two');
    expect(container.textContent).toContain('example.test/(..)/api/hook');

    const refresh = container.querySelector('h4 button');
    act(() => refresh.click());
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'bots/getList',
      token: 'token',
    });

    const edit = Array.from(container.querySelectorAll('button')).find(
      (button) => button.closest('tr')?.textContent.includes('Primary bot')
    );
    act(() => edit.click());
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'bots/selectItem',
      payload: 1,
    });

    const add = Array.from(container.querySelectorAll('button')).find(
      (button) => button.className.includes('btn-rounded')
    );
    act(() => add.click());
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'bots/setModalOpen',
      payload: true,
    });
    unmount();
  });

  test('renders loading, item-loading, and empty states', () => {
    mockState.bots.loading = true;
    mockState.bots.results = null;
    const loading = renderBots();
    expect(loading.container.textContent).toContain('Loading bots');
    loading.unmount();

    mockState.bots.loading = false;
    mockState.bots.results = [
      {
        id: 5,
        full_name: 'Loading bot',
        username: 'loading',
        webhook: '',
        whitelist: [],
      },
    ];
    mockState.bots.loadingItems = [5];
    const itemLoading = renderBots();
    expect(itemLoading.container.textContent).toContain('Loading bot');
    itemLoading.unmount();

    mockState.bots.results = null;
    mockState.bots.loadingItems = [];
    const empty = renderBots();
    expect(empty.container.textContent).toContain('No bots available');
    empty.unmount();
  });
});
