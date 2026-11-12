import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Login from './Login';
import Register from './Register';

let mockState;
const mockDispatch = jest.fn();
const mockHistory = { push: jest.fn() };
jest.mock('../../api/auth', () => ({
  __esModule: true,
  default: {
    Login: jest.fn((...args) => ({ type: 'auth/login', args })),
    Register: jest.fn((...args) => ({ type: 'auth/register', args })),
  },
}));
const mockAuthApi = require('../../api/auth').default;
jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector) => selector(mockState),
}));
jest.mock('react-router-dom', () => ({
  Link: ({ children, to }) => <a href={to}>{children}</a>,
  useHistory: () => mockHistory,
}));
jest.mock('react-bootstrap', () => {
  const React = require('react');
  const Form = ({ children, ...props }) =>
    React.createElement('form', props, children);
  Form.Group = ({ children, ...props }) =>
    React.createElement('div', props, children);
  Form.Control = ({ isInvalid, ...props }) =>
    React.createElement('input', props);
  const Button = ({ children, ...props }) =>
    React.createElement('button', props, children);
  return { Button, Form };
});
jest.mock('react-bootstrap/Alert', () => {
  const React = require('react');
  return ({ children, onClose }) =>
    React.createElement(
      'div',
      null,
      children,
      React.createElement('button', { onClick: onClose }, 'Dismiss')
    );
});
jest.mock('react-loader-spinner', () => ({
  Dna: () => <div>Submitting</div>,
}));
jest.mock('../shared/Errors', () => ({ errors }) => (
  <pre>{JSON.stringify(errors)}</pre>
));

const render = (component) => {
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => root.render(component));
  return {
    container,
    unmount: () => act(() => root.unmount()),
  };
};

const setInput = (input, value) => {
  const setter = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(input),
    'value'
  ).set;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

describe('Login and registration pages', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    mockAuthApi.Login.mockClear();
    mockAuthApi.Register.mockClear();
    mockAuthApi.Login.mockReturnValue({ type: 'auth/login' });
    mockAuthApi.Register.mockReturnValue({ type: 'auth/register' });
    mockHistory.push.mockClear();
    mockState = {
      auth: {
        errors: {},
        loading: false,
        message: null,
        redirectUrl: '/dashboard',
      },
    };
  });

  test('submits login credentials and covers feedback states', () => {
    const view = render(<Login />);
    const [email, password] = view.container.querySelectorAll('input');
    setInput(email, 'user@example.test');
    setInput(password, 'secret');
    act(() =>
      view.container
        .querySelector('form')
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    );
    expect(mockAuthApi.Login).toHaveBeenCalledWith(
      { email: 'user@example.test', password: 'secret' },
      mockHistory,
      '/dashboard'
    );
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'auth/login',
    });

    view.unmount();
    mockState.auth = {
      ...mockState.auth,
      errors: {
        detail: 'Invalid credentials',
        email: ['Invalid email'],
        password: ['Required'],
      },
      loading: true,
      message: 'Welcome back',
    };
    const feedback = render(<Login />);
    expect(feedback.container.textContent).toContain('Invalid credentials');
    expect(feedback.container.textContent).toContain('Welcome back');
    expect(feedback.container.textContent).toContain('Submitting');
    act(() =>
      Array.from(feedback.container.querySelectorAll('button'))
        .find((button) => button.textContent === 'Dismiss')
        .click()
    );
    jest.spyOn(window, 'alert').mockImplementation(() => {});
    act(() =>
      Array.from(feedback.container.querySelectorAll('a'))
        .find((anchor) => anchor.textContent === 'Forgot password?')
        .click()
    );
    expect(window.alert).toHaveBeenCalledWith('Coming soon..');
    window.alert.mockRestore();
    feedback.unmount();
  });

  test('validates matching passwords and submits registration', () => {
    const view = render(<Register />);
    const [email, password, confirmation] = view.container.querySelectorAll(
      'input[type="email"], input[type="password"]'
    );
    setInput(email, 'new@example.test');
    setInput(password, 'first');
    setInput(confirmation, 'different');
    expect(view.container.textContent).toContain(
      'Both passwords must be the same'
    );
    setInput(confirmation, 'first');
    expect(view.container.textContent).toContain('Awesome');

    act(() =>
      view.container
        .querySelector('form')
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    );
    expect(mockAuthApi.Register).toHaveBeenCalledWith(
      { email: 'new@example.test', password: 'first' },
      mockHistory
    );
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'auth/register',
    });
    view.unmount();

    mockState.auth = {
      errors: {
        non_field_errors: ['Registration failed'],
        email: ['Already in use'],
        password: ['Too short'],
      },
      loading: true,
    };
    const errors = render(<Register />);
    expect(errors.container.textContent).toContain('Registration failed');
    expect(errors.container.textContent).toContain('Already in use');
    expect(errors.container.textContent).toContain('Submitting');
    errors.unmount();
  });
});
