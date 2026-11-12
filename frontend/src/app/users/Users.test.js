import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Users from './Users';

let mockState;
const mockDispatch = jest.fn();
const mockHistory = { push: jest.fn() };
jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector) => selector(mockState),
}));
jest.mock('react-router-dom', () => ({
  useHistory: () => mockHistory,
}));
jest.mock('../../api/users', () => ({
  UsersApi: {
    getList: (token) => ({ type: 'users/getList', token }),
  },
}));
jest.mock('./EditModal', () => () => null);
jest.mock('../shared/Errors', () => ({ errors }) => (
  <div>{errors ? 'User errors' : null}</div>
));
jest.mock('react-tooltip', () => ({
  Tooltip: ({ children }) => <div>{children}</div>,
}));
jest.mock('react-loader-spinner', () => ({
  Circles: () => (
    <tr>
      <td>Loading users</td>
    </tr>
  ),
}));

const renderUsers = () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => root.render(<Users />));
  return {
    container,
    unmount: () => act(() => root.unmount()),
  };
};

describe('Users', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    mockHistory.push.mockClear();
    mockState = {
      auth: { token: 'token' },
      users: {
        errors: { detail: 'Some error' },
        loading: false,
        results: [
          {
            id: 1,
            email: 'one@example.test',
            date: '2024-01-02T03:04:05Z',
            is_active: true,
            is_staff: false,
            last_login: '2025-01-02T03:04:05Z',
          },
          {
            id: 2,
            email: 'two@example.test',
            date: null,
            is_active: false,
            is_staff: true,
            last_login: null,
          },
        ],
      },
    };
  });

  test('renders users, refreshes the list, and opens a selected user', () => {
    const { container, unmount } = renderUsers();
    expect(container.textContent).toContain('one@example.test');
    expect(container.textContent).toContain('Joined:');
    act(() => container.querySelector('tbody tr').click());
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'users/selectUser',
      payload: 1,
    });

    act(() =>
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.className.includes('btn-outline-success'))
        .click()
    );
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'users/getList',
      token: 'token',
    });

    act(() =>
      Array.from(container.querySelectorAll('a'))
        .find((anchor) => anchor.textContent === 'Home')
        .click()
    );
    expect(mockHistory.push).toHaveBeenCalledWith('/');
    unmount();
  });

  test('renders loading and empty states and clears the selected user on cleanup', () => {
    mockState.users.loading = true;
    mockState.users.results = [];
    mockState.users.selectedUser = { id: 9 };
    const { container, unmount } = renderUsers();
    expect(container.textContent).toContain('Loading users');
    unmount();
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'users/selectUser',
    });

    mockState.users.loading = false;
    mockState.users.selectedUser = null;
    const empty = renderUsers();
    expect(empty.container.textContent).toContain('No accounts found');
    empty.unmount();
  });
});
