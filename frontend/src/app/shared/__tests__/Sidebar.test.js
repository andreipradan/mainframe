import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from '../Sidebar';

let mockState = null;
const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector) => selector(mockState),
}));
jest.mock('react-bootstrap', () => {
  const React = require('react');
  const Dropdown = ({ children }) => React.createElement('div', null, children);
  Dropdown.Toggle = ({ children, ...props }) =>
    React.createElement('button', props, children);
  Dropdown.Menu = ({ children }) => React.createElement('div', null, children);
  Dropdown.Item = ({ children, ...props }) =>
    React.createElement('a', props, children);
  Dropdown.Divider = () => React.createElement('hr');
  return {
    Collapse: ({ children }) => children,
    Dropdown,
    Row: ({ children }) => React.createElement('div', null, children),
  };
});
jest.mock('react-bootstrap/Modal', () => {
  const React = require('react');
  const Modal = ({ children, show }) =>
    show ? React.createElement('div', null, children) : null;
  Modal.Body = ({ children }) => React.createElement('div', null, children);
  Modal.Footer = ({ children }) => React.createElement('div', null, children);
  Modal.Header = ({ children }) => React.createElement('div', null, children);
  Modal.Title = ({ children }) => React.createElement('div', null, children);
  return {
    __esModule: true,
    default: Modal,
    Body: Modal.Body,
    Footer: Modal.Footer,
    Header: Modal.Header,
    Title: Modal.Title,
  };
});
jest.mock('react-bootstrap/Button', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children, ...props }) =>
      React.createElement('button', props, children),
  };
});
jest.mock('react-bootstrap/Alert', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children }) => React.createElement('div', null, children),
  };
});
jest.mock('react-i18next', () => ({
  Trans: ({ children }) => children,
}));
jest.mock('../Errors', () => () => null);
jest.mock('react-loader-spinner', () => ({ Circles: () => null }));

const renderSidebar = () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(
      <MemoryRouter initialEntries={['/investments/bonds']}>
        <Sidebar />
      </MemoryRouter>
    );
  });
  return {
    container,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
};

describe('Sidebar navigation controls', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    mockState = {
      rpi: { token: null, errors: null, loading: false, message: null },
      auth: {
        token: 'auth-token',
        user: { is_staff: true, username: 'admin', last_login: '2025-01-01' },
      },
    };
  });

  test('route opens the matching menu and every menu button toggles accessibly', () => {
    const { container, unmount } = renderSidebar();
    const menuButtons = Array.from(
      container.querySelectorAll('button[aria-controls^="sidebar-"]')
    );
    const investmentsButton = container.querySelector(
      'button[aria-controls="sidebar-investments-menu"]'
    );

    expect(menuButtons.length).toBeGreaterThan(5);
    expect(investmentsButton.getAttribute('aria-expanded')).toBe('true');

    for (const button of menuButtons) {
      const initiallyExpanded = button.getAttribute('aria-expanded') === 'true';
      act(() => button.click());
      expect(button.getAttribute('aria-expanded')).toBe(
        String(!initiallyExpanded)
      );
      act(() => button.click());
      expect(button.getAttribute('aria-expanded')).toBe(
        String(initiallyExpanded)
      );
    }

    for (const button of menuButtons) {
      const controlledId = button.getAttribute('aria-controls');
      expect(container.querySelector(`#${controlledId}`)).not.toBeNull();
    }
    unmount();
  });

  test('confirms a staff service restart and dispatches the selected service', () => {
    mockState.rpi.token = 'rpi-token';
    const { container, unmount } = renderSidebar();
    const restartBot = Array.from(
      container.querySelectorAll('.preview-subject')
    ).find((item) => item.textContent.trim() === 'Restart bot');

    expect(restartBot).not.toBeNull();
    act(() => restartBot.click());
    expect(container.textContent).toContain(
      'Are you sure you want to restart bot?'
    );

    act(() =>
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === 'RESTART BOT')
        .click()
    );
    expect(container.textContent).not.toContain(
      'Are you sure you want to restart bot?'
    );
    expect(mockDispatch).toHaveBeenCalledWith(expect.any(Function));
    unmount();
  });
});
