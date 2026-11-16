import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Profile from './Profile';
import { UsersApi } from '../../api/users';

let mockState = { auth: { token: null, user: null }, users: {} };
const mockDispatch = jest.fn();

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector) => selector(mockState),
}));
jest.mock('../../api/users', () => ({
  UsersApi: {
    updateUser: jest.fn(() => ({ type: 'users/updateUser' })),
    changePassword: jest.fn(() => ({ type: 'users/changePassword' })),
  },
}));
jest.mock('../shared/Errors', () => ({ errors }) => (
  <div>{errors ? 'User errors' : null}</div>
));
jest.mock('react-loader-spinner', () => ({
  ColorRing: () => <div>Loading profile</div>,
}));

const renderProfile = () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => root.render(<Profile />));
  return {
    container,
    unmount: () => act(() => root.unmount()),
  };
};

const changeInput = (input, value) => {
  act(() => {
    Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    ).set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

describe('Profile', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    UsersApi.updateUser.mockClear();
    UsersApi.updateUser.mockReturnValue({ type: 'users/updateUser' });
    UsersApi.changePassword.mockClear();
    UsersApi.changePassword.mockReturnValue({
      type: 'users/changePassword',
    });
    mockState = {
      auth: {
        token: 'token',
        user: { id: 7, email: 'user@example.test', username: 'user' },
      },
      users: {
        errors: {
          username: ['Username error'],
          email: ['Email error'],
          password: ['Password error'],
        },
        loadingUsers: [],
      },
    };
  });

  test('updates profile and password and validates matching passwords', () => {
    const { container, unmount } = renderProfile();
    const username = container.querySelector('#exampleInputUsername1');
    const email = container.querySelector('#exampleInputEmail1');
    expect(username.value).toBe('user');
    expect(email.value).toBe('user@example.test');
    expect(container.textContent).toContain('Username error');

    changeInput(username, 'updated');
    changeInput(email, 'updated@example.test');
    const forms = container.querySelectorAll('form');
    act(() =>
      forms[0].dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true })
      )
    );
    expect(UsersApi.updateUser).toHaveBeenCalledWith(
      'token',
      7,
      { email: 'updated@example.test', username: 'updated' },
      true
    );
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'users/updateUser',
    });

    changeInput(container.querySelector('#currentPassword'), 'current');
    changeInput(container.querySelector('#newPassword'), 'updated');
    const retypePassword = container.querySelector('#retypePassword');
    changeInput(retypePassword, 'different');
    const changePasswordButton = Array.from(
      forms[1].querySelectorAll('button')
    ).find((button) => button.textContent.includes('Change Password'));
    expect(changePasswordButton.disabled).toBe(true);

    changeInput(retypePassword, 'updated');
    expect(changePasswordButton.disabled).toBe(false);
    act(() =>
      forms[1].dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true })
      )
    );
    expect(UsersApi.changePassword).toHaveBeenCalledWith('token', 7, {
      old_password: 'current',
      password: 'updated',
      password2: 'updated',
    });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'users/changePassword',
    });
    unmount();
  });

  test('shows loading for the current user', () => {
    mockState.users.loadingUsers = [7];
    const { container, unmount } = renderProfile();
    expect(container.textContent).toContain('Loading profile');
    unmount();
  });
});
