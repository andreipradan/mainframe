import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import Navbar from './Navbar';

const mockDispatch = vi.fn();
const mockHistory = { push: vi.fn() };
let mockState = {};
const rpiSession = 'rpi-session';
const authSession = 'auth-session';

vi.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector) => selector(mockState),
}));

vi.mock('react-router-dom', () => {
  return {
    Link: ({ children, to, ...props }) =>
      React.createElement('a', { href: to, ...props }, children),
    useHistory: () => mockHistory,
  };
});

vi.mock('react-i18next', () => ({
  Trans: ({ children }) => children,
}));

vi.mock('react-tooltip', () => ({
  Tooltip: ({ children }) => <div>{children}</div>,
}));

vi.mock('../../api/auth', () => ({
  __esModule: true,
  default: {
    Logout: (token, history) => ({ type: 'auth/logout', token, history }),
  },
}));

vi.mock('../../api/rpi', () => ({
  __esModule: true,
  default: {
    login: (credentials) => ({ type: 'rpi/login', credentials }),
    logout: (token) => ({ type: 'rpi/logout', token }),
  },
}));

vi.mock('./Errors', () => ({ default: () => null }));

vi.mock('react-bootstrap', () => {
  const Dropdown = ({
    children,
    as: Component = 'div',
    alignRight,
    ...props
  }) =>
    React.createElement(
      Component,
      { ...props, 'data-align-right': alignRight },
      children
    );
  const Toggle = ({ children, as: Component = 'button', ...props }) =>
    React.createElement(Component, { type: 'button', ...props }, children);
  const Menu = ({ children, ...props }) =>
    React.createElement('div', props, children);
  const Item = ({ children, href, onClick, ...props }) =>
    React.createElement('a', { href, onClick, ...props }, children);
  const Divider = () => React.createElement('hr');
  Dropdown.Toggle = Toggle;
  Dropdown.Menu = Menu;
  Dropdown.Item = Item;
  Dropdown.Divider = Divider;

  const Form = ({ children, ...props }) =>
    React.createElement('form', props, children);
  Form.Group = ({ children, ...props }) =>
    React.createElement('div', props, children);
  Form.Label = ({ children, ...props }) =>
    React.createElement('label', props, children);
  Form.Control = (props) => React.createElement('input', props);

  const Modal = ({ children, show, onHide }) =>
    show
      ? React.createElement(
          'div',
          { role: 'dialog' },
          children,
          React.createElement(
            'button',
            { type: 'button', onClick: onHide, 'aria-label': 'Hide dialog' },
            'Hide'
          )
        )
      : null;
  Modal.Header = ({ children }) => React.createElement('div', null, children);
  Modal.Title = ({ children }) => React.createElement('h2', null, children);
  Modal.Body = ({ children }) => React.createElement('div', null, children);
  Modal.Footer = ({ children }) => React.createElement('div', null, children);

  return { Dropdown, Form, Modal };
});

vi.mock('react-bootstrap/Button', () => {
  return {
    __esModule: true,
    default: ({ children, ...props }) =>
      React.createElement('button', { type: 'button', ...props }, children),
  };
});

vi.mock('react-bootstrap/Modal', () => {
  const Modal = ({ children, show, onHide }) =>
    show
      ? React.createElement(
          'div',
          { role: 'dialog' },
          children,
          React.createElement(
            'button',
            { type: 'button', onClick: onHide, 'aria-label': 'Hide dialog' },
            'Hide'
          )
        )
      : null;
  Modal.Header = ({ children }) => React.createElement('div', null, children);
  Modal.Title = ({ children }) => React.createElement('h2', null, children);
  Modal.Body = ({ children }) => React.createElement('div', null, children);
  Modal.Footer = ({ children }) => React.createElement('div', null, children);
  return { __esModule: true, default: Modal };
});

const renderNavbar = () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => root.render(<Navbar />));
  return { container, root };
};

beforeEach(() => {
  mockDispatch.mockClear();
  mockHistory.push.mockClear();
  mockState = {
    auth: { token: authSession, user: { email: 'user@example.com' } },
    rpi: { token: null, errors: [], loading: false },
  };
});

test('opens the RPi login form and dispatches entered credentials', () => {
  const { container, root } = renderNavbar();

  const connectButton = container.querySelector(
    'button[aria-label="Connect Raspberry Pi"]'
  );
  expect(connectButton).not.toBeNull();
  act(() => connectButton.click());

  const email = container.querySelector('input[placeholder="RPi email"]');
  const password = container.querySelector('input[placeholder="RPi password"]');
  expect(email.value).toBe('user@example.com');
  const connect = Array.from(container.querySelectorAll('button')).find(
    (button) => button.textContent === 'Connect'
  );
  expect(connect.disabled).toBe(true);

  act(() => Simulate.change(email, { target: { value: 'rpi@example.com' } }));
  act(() => Simulate.change(password, { target: { value: 'secret' } }));

  act(() => connect.click());
  expect(mockDispatch).toHaveBeenCalledWith({
    type: 'rpi/login',
    credentials: { email: 'rpi@example.com', password: 'secret' },
  });
  expect(password.value).toBe('');

  act(() =>
    Simulate.change(
      container.querySelector('input[placeholder="RPi password"]'),
      { target: { value: 'temporary' } }
    )
  );
  act(() => container.querySelector('[aria-label="Hide dialog"]').click());
  expect(container.querySelector('[role="dialog"]')).toBeNull();

  act(() => connectButton.click());
  act(() =>
    Simulate.change(
      container.querySelector('input[placeholder="RPi password"]'),
      { target: { value: 'temporary' } }
    )
  );
  act(() =>
    Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent === 'Close')
      .click()
  );
  expect(container.querySelector('[role="dialog"]')).toBeNull();

  act(() => root.unmount());
});

test('uses keyboard-operable controls for navigation and RPi logout', () => {
  mockState.rpi.token = rpiSession;
  mockState.auth.user.is_staff = true;
  const sidebar = document.createElement('div');
  sidebar.className = 'sidebar-offcanvas';
  document.body.appendChild(sidebar);
  const { container, root } = renderNavbar();

  expect(container.querySelector('a[href="/"]')).not.toBeNull();
  const statusButton = container.querySelector(
    'button[aria-label="Disconnect Raspberry Pi"]'
  );
  expect(statusButton).not.toBeNull();
  act(() => statusButton.click());
  expect(mockDispatch).toHaveBeenCalledWith({
    type: 'rpi/logout',
    token: rpiSession,
  });

  const togglers = container.querySelectorAll('.navbar-toggler');
  act(() => togglers[0].click());
  expect(document.body.classList.contains('sidebar-icon-only')).toBe(true);
  act(() => togglers[1].click());
  expect(sidebar.classList.contains('active')).toBe(true);

  Array.from(container.querySelectorAll('a[href="!#"]')).forEach((link) =>
    act(() => link.click())
  );
  expect(mockHistory.push).toHaveBeenCalledWith('/profile');
  expect(mockDispatch).toHaveBeenCalledWith({
    type: 'auth/logout',
    token: authSession,
    history: mockHistory,
  });

  act(() => root.unmount());
  sidebar.remove();
  document.body.classList.remove('sidebar-icon-only');
});

test('closes the login form when the RPi token becomes available', () => {
  const { container, root } = renderNavbar();

  act(() =>
    container.querySelector('button[aria-label="Connect Raspberry Pi"]').click()
  );
  expect(container.querySelector('[role="dialog"]')).not.toBeNull();

  mockState.rpi.token = 'connected';
  act(() => root.render(<Navbar />));

  expect(container.querySelector('[role="dialog"]')).toBeNull();
  act(() => root.unmount());
});
