import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from '../Sidebar';

let mockState = null;
const mockDispatch = vi.fn();
vi.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector) => selector(mockState),
}));
vi.mock('react-bootstrap', () => {
  const Dropdown = ({ children }) => React.createElement('div', null, children);
  Dropdown.Toggle = ({ children, ...props }) =>
    React.createElement('button', props, children);
  Dropdown.Menu = ({ children }) => React.createElement('div', null, children);
  Dropdown.Item = ({ children, ...props }) =>
    React.createElement('a', props, children);
  Dropdown.Divider = () => React.createElement('hr');
  return {
    Collapse: ({ children, in: isOpen }) =>
      React.cloneElement(children, {
        className: [children.props.className, 'collapse', isOpen && 'show']
          .filter(Boolean)
          .join(' '),
      }),
    Dropdown,
    Row: ({ children }) => React.createElement('div', null, children),
  };
});
vi.mock('react-bootstrap/Modal', () => {
  const Modal = ({ children, onHide, show }) =>
    show
      ? React.createElement(
          'div',
          null,
          children,
          React.createElement(
            'button',
            { type: 'button', 'aria-label': 'Hide modal', onClick: onHide },
            'Hide modal'
          )
        )
      : null;
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
vi.mock('react-bootstrap/Button', () => {
  return {
    __esModule: true,
    default: ({ children, ...props }) =>
      React.createElement('button', props, children),
  };
});
vi.mock('react-bootstrap/Alert', () => {
  return {
    __esModule: true,
    default: ({ children }) => React.createElement('div', null, children),
  };
});
vi.mock('react-i18next', () => ({
  Trans: ({ children }) => children,
}));
vi.mock('../Errors', () => ({ default: () => null }));
vi.mock('react-loader-spinner', () => ({ Circles: () => null }));

const renderSidebar = (initialPath = '/investments/bonds') => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(
      <MemoryRouter initialEntries={[initialPath]}>
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
    document.body.classList.remove('sidebar-icon-only');
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
    expect(
      menuButtons.filter(
        (button) => button.getAttribute('aria-expanded') === 'true'
      )
    ).toHaveLength(1);
    for (const button of menuButtons) {
      const controlledMenu = container.querySelector(
        `#${button.getAttribute('aria-controls')}`
      );
      expect(controlledMenu.classList.contains('show')).toBe(
        button.getAttribute('aria-expanded') === 'true'
      );
    }

    for (const button of menuButtons) {
      const initiallyExpanded = button.getAttribute('aria-expanded') === 'true';
      act(() => button.click());
      expect(button.getAttribute('aria-expanded')).toBe(
        String(!initiallyExpanded)
      );
      expect(
        menuButtons.filter(
          (menuButton) => menuButton.getAttribute('aria-expanded') === 'true'
        )
      ).toHaveLength(initiallyExpanded ? 0 : 1);
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

  test('opening a menu closes the previously open menu', () => {
    const { container, unmount } = renderSidebar();
    const appsButton = container.querySelector(
      'button[aria-controls="sidebar-apps-menu"]'
    );
    const investmentsButton = container.querySelector(
      'button[aria-controls="sidebar-investments-menu"]'
    );
    const appsCollapse = container.querySelector('#sidebar-apps-menu');
    const investmentsCollapse = container.querySelector(
      '#sidebar-investments-menu'
    );

    act(() => appsButton.click());

    expect(appsButton.getAttribute('aria-expanded')).toBe('true');
    expect(appsCollapse.classList.contains('show')).toBe(true);
    expect(investmentsButton.getAttribute('aria-expanded')).toBe('false');
    expect(investmentsCollapse.classList.contains('show')).toBe(false);

    unmount();
  });

  test('route changes close the documentation menu', () => {
    const { container, unmount } = renderSidebar('/terms-and-conditions');
    const documentationButton = container.querySelector(
      'button[aria-controls="sidebar-documentation-menu"]'
    );

    expect(documentationButton.getAttribute('aria-expanded')).toBe('true');
    expect(
      container
        .querySelector('#sidebar-documentation-menu')
        .classList.contains('show')
    ).toBe(true);
    act(() =>
      Array.from(container.querySelectorAll('a'))
        .find((link) => link.textContent.trim() === 'Dashboard')
        .click()
    );
    expect(documentationButton.getAttribute('aria-expanded')).toBe('false');
    expect(
      container
        .querySelector('#sidebar-documentation-menu')
        .classList.contains('show')
    ).toBe(false);
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

  test('confirms a reboot and dispatches the reboot action', () => {
    mockState.rpi.token = 'rpi-token';
    const { container, unmount } = renderSidebar();
    const reboot = Array.from(
      container.querySelectorAll('.preview-subject')
    ).find((item) => item.textContent.trim() === 'Reboot');

    act(() => reboot.click());
    expect(container.textContent).toContain('Are you sure you want to reboot?');
    expect(container.textContent).toContain('another URL will be generated');

    act(() =>
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === 'REBOOT')
        .click()
    );
    expect(mockDispatch).toHaveBeenCalledWith(expect.any(Function));
    unmount();
  });

  test('supports collapsed navigation hover, focus, and modal dismissal', () => {
    mockState.rpi.token = 'rpi-token';
    const { container, unmount } = renderSidebar();
    document.body.classList.add('sidebar-icon-only');
    const navItem = Array.from(container.querySelectorAll('.nav-item')).find(
      (item) => !item.querySelector('button[aria-expanded]')
    );

    act(() =>
      navItem.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    );
    expect(navItem.classList.contains('hover-open')).toBe(true);
    act(() =>
      navItem.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    );
    act(() =>
      navItem.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }))
    );
    expect(navItem.classList.contains('hover-open')).toBe(false);
    act(() =>
      navItem.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    );

    const restartBot = Array.from(
      container.querySelectorAll('.preview-subject')
    ).find((item) => item.textContent.trim() === 'Restart bot');
    act(() => restartBot.click());
    act(() => container.querySelector('[aria-label="Hide modal"]').click());
    expect(container.textContent).not.toContain(
      'Are you sure you want to restart bot?'
    );
    unmount();
  });
});
