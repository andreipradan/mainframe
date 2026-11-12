import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Logs from './Logs';

let mockState;
const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector) => selector(mockState),
}));
jest.mock('../../api/logs', () => ({
  __esModule: true,
  default: {
    getList: (token, path) => ({ type: 'logs/getList', token, path }),
    getFile: (token, path) => ({ type: 'logs/getFile', token, path }),
  },
}));
jest.mock('../shared/Errors', () => () => null);
jest.mock('react-loader-spinner', () => ({
  BallTriangle: () => <div>Loading logs</div>,
}));

const renderLogs = () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => root.render(<Logs />));
  return {
    container,
    unmount: () => act(() => root.unmount()),
  };
};

describe('Logs', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    mockState = {
      auth: { token: 'token' },
      logs: {
        currentLog: { name: 'server.log', contents: 'line 1' },
        results: [
          { name: 'server.log', is_file: true },
          { name: 'archive', is_file: false },
        ],
        errors: null,
        loading: false,
        path: '/system/logs',
      },
    };
  });

  test('renders file and folder navigation and opens the selected log', () => {
    const { container, unmount } = renderLogs();
    expect(container.textContent).toContain('line 1');
    expect(container.textContent).toContain('system');
    expect(container.textContent).toContain('logs');

    const entries = Array.from(container.querySelectorAll('ul.list-arrow li'));
    act(() => entries[1].click());
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'logs/getFile',
      token: 'token',
      path: '/system/logs/server.log',
    });

    act(() => entries[2].click());
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'logs/getList',
      token: 'token',
      path: '/system/logs/archive',
    });

    act(() => entries[0].click());
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'logs/getList',
      token: 'token',
      path: '/system',
    });
    unmount();
  });

  test('requests logs when missing and shows the loading state', () => {
    mockState.logs.results = null;
    mockState.logs.loading = true;
    const { container, unmount } = renderLogs();
    expect(container.textContent).toContain('Loading logs');
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'logs/getList',
      token: 'token',
      path: undefined,
    });
    unmount();
  });
});
