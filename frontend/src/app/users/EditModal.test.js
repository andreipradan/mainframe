import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import EditModal from './EditModal';
import { UsersApi } from '../../api/users';
import { selectUser } from '../../redux/usersSlice';

let mockState = {
  users: { errors: null, loadingUsers: [], selectedUser: null },
  auth: { token: null, user: null },
};
const mockDispatch = jest.fn();

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector) => selector(mockState),
}));
jest.mock('../../api/users', () => ({
  UsersApi: {
    getUser: jest.fn(() => ({ type: 'users/getUser' })),
    updateUser: jest.fn(() => ({ type: 'users/updateUser' })),
    deleteUser: jest.fn(() => ({ type: 'users/deleteUser' })),
  },
}));
jest.mock('../../redux/usersSlice', () => ({
  selectUser: jest.fn(() => ({ type: 'users/selectUser' })),
}));
jest.mock(
  'react-bootstrap/Modal',
  () => require('../../testSupport/reactBootstrapMocks').Modal
);
jest.mock(
  'react-bootstrap/Button',
  () => require('../../testSupport/reactBootstrapMocks').Button
);
jest.mock('react-loader-spinner', () => ({
  ColorRing: () => <div>Loading selected user</div>,
}));
jest.mock('ace-builds', () => ({}));
jest.mock('ace-builds/webpack-resolver', () => ({}));
jest.mock('ace-builds/src-noconflict/mode-json', () => ({}));
jest.mock('ace-builds/src-noconflict/theme-monokai', () => ({}));
jest.mock('ace-builds/src-noconflict/ext-language_tools', () => ({}));

const renderEditModal = () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => root.render(<EditModal />));
  return {
    container,
    unmount: () => act(() => root.unmount()),
  };
};

const submitForm = (form) =>
  act(() =>
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  );

const changeInput = (input, value) => {
  act(() => {
    Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    ).set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

describe('Users EditModal', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    UsersApi.getUser.mockClear();
    UsersApi.getUser.mockReturnValue({ type: 'users/getUser' });
    UsersApi.updateUser.mockClear();
    UsersApi.updateUser.mockReturnValue({ type: 'users/updateUser' });
    UsersApi.deleteUser.mockClear();
    UsersApi.deleteUser.mockReturnValue({ type: 'users/deleteUser' });
    selectUser.mockClear();
    selectUser.mockReturnValue({ type: 'users/selectUser' });
    mockState = {
      users: {
        errors: {
          email: ['Email error'],
          username: ['Username error'],
        },
        loadingUsers: [],
        selectedUser: {
          id: 7,
          username: 'user',
          email: 'user@example.test',
          is_active: true,
          is_staff: false,
          date: '2024-01-02T03:04:05Z',
          last_login: '2025-01-02T03:04:05Z',
          groups: ['Admins'],
        },
      },
      auth: {
        token: 'token',
        user: { id: 7 },
      },
    };
  });

  test('updates, refreshes, and deletes the selected user', () => {
    const { container, unmount } = renderEditModal();
    expect(container.textContent).toContain('This is you');
    expect(container.textContent).toContain('Groups:');
    expect(container.textContent).toContain('Admins');
    expect(container.textContent).toContain('Joined:');
    expect(container.textContent).toContain('Last login:');

    const refresh = container.querySelector('h2 button');
    act(() => refresh.click());
    expect(UsersApi.getUser).toHaveBeenCalledWith('token', 7);

    const inputs = container.querySelectorAll('input');
    changeInput(inputs[0], 'updated@example.test');
    changeInput(inputs[1], 'updated');
    const form = container.querySelector('form');
    submitForm(form);
    expect(UsersApi.updateUser).toHaveBeenCalledWith('token', 7, {
      email: 'updated@example.test',
      is_active: true,
      is_staff: false,
      username: 'updated',
    });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'users/updateUser',
    });

    const switches = container.querySelectorAll('input[type="checkbox"]');
    act(() => {
      switches[0].click();
      switches[1].click();
    });

    const footerButtons = container.querySelectorAll('footer button');
    act(() => footerButtons[1].click());
    expect(UsersApi.deleteUser).toHaveBeenCalledWith(
      'token',
      mockState.users.selectedUser,
      true
    );
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'users/deleteUser',
    });
    expect(selectUser).toHaveBeenCalledWith();
    unmount();
  });

  test('shows a loading indicator for the selected user', () => {
    mockState.users.loadingUsers = [7];
    const { container, unmount } = renderEditModal();
    expect(container.textContent).toContain('Loading selected user');
    unmount();
  });
});
